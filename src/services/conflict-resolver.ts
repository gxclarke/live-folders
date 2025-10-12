/**
 * Conflict Resolver Service
 *
 * Handles conflicts during bookmark synchronization when local and remote
 * states diverge. Implements multiple resolution strategies to handle
 * common conflict scenarios gracefully.
 */

import type { BookmarkItem, ConflictResolution, ConflictStrategy } from "../types";
import { Logger } from "../utils/logger";

const logger = new Logger("ConflictResolver");

/**
 * Types of conflicts that can occur during sync
 */
export enum ConflictType {
  /** Both local and remote items modified since last sync */
  BOTH_MODIFIED = "both_modified",
  /** Item exists locally but was deleted remotely */
  LOCAL_EXISTS_REMOTE_DELETED = "local_exists_remote_deleted",
  /** Item was deleted locally but modified remotely */
  LOCAL_DELETED_REMOTE_MODIFIED = "local_deleted_remote_modified",
  /** Item has different URLs locally vs remotely */
  URL_MISMATCH = "url_mismatch",
  /** Item has different metadata but same content */
  METADATA_CONFLICT = "metadata_conflict",
}

/**
 * Conflict information for a single bookmark item
 */
export interface Conflict {
  /** Unique identifier for the conflict */
  id: string;
  /** Type of conflict detected */
  type: ConflictType;
  /** The local bookmark state (if exists) */
  local: BookmarkItem | null;
  /** The remote bookmark state (if exists) */
  remote: BookmarkItem | null;
  /** Timestamp when conflict was detected */
  detectedAt: Date;
  /** Provider ID where conflict occurred */
  providerId: string;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolutionResult {
  /** The conflict that was resolved */
  conflict: Conflict;
  /** The chosen resolution strategy */
  strategy: ConflictStrategy;
  /** The resolved bookmark item to use */
  resolved: BookmarkItem | null;
  /** Whether the resolution requires user confirmation */
  requiresUserConfirmation: boolean;
}

/**
 * Conflict Resolver Service
 *
 * Singleton service that handles conflict detection and resolution
 * during bookmark synchronization.
 */
export class ConflictResolver {
  private static instance: ConflictResolver;

  /** Queue of unresolved conflicts */
  private conflicts: Map<string, Conflict> = new Map();

  /** Default conflict resolution strategy */
  private defaultStrategy: ConflictStrategy = "remote_wins";

  /** Strategy overrides per provider */
  private providerStrategies: Map<string, ConflictStrategy> = new Map();

  private constructor() {
    logger.info("ConflictResolver initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Set the default conflict resolution strategy
   */
  public setDefaultStrategy(strategy: ConflictStrategy): void {
    this.defaultStrategy = strategy;
    logger.info(`Default conflict strategy set to: ${strategy}`);
  }

  /**
   * Set conflict resolution strategy for a specific provider
   */
  public setProviderStrategy(providerId: string, strategy: ConflictStrategy): void {
    this.providerStrategies.set(providerId, strategy);
    logger.info(`Provider ${providerId} conflict strategy set to: ${strategy}`);
  }

  /**
   * Detect conflicts between local and remote bookmark states
   */
  public detectConflict(
    local: BookmarkItem | null,
    remote: BookmarkItem | null,
    providerId: string,
  ): Conflict | null {
    // No conflict if both are null or one is null (simple add/delete)
    if (!local || !remote) {
      return null;
    }

    // Same ID but different states - potential conflict
    const conflictType = this.determineConflictType(local, remote);

    if (!conflictType) {
      return null;
    }

    const conflict: Conflict = {
      id: `${providerId}-${local.id || remote.id}`,
      type: conflictType,
      local,
      remote,
      detectedAt: new Date(),
      providerId,
    };

    this.conflicts.set(conflict.id, conflict);
    logger.warn(`Conflict detected: ${conflict.type} for ${conflict.id}`);

    return conflict;
  }

  /**
   * Determine the type of conflict between local and remote items
   */
  private determineConflictType(local: BookmarkItem, remote: BookmarkItem): ConflictType | null {
    // URL mismatch - serious conflict
    if (local.url !== remote.url) {
      return ConflictType.URL_MISMATCH;
    }

    // Check if both have been modified since last sync
    if (local.lastModified && remote.lastModified) {
      const localMod = new Date(local.lastModified).getTime();
      const remoteMod = new Date(remote.lastModified).getTime();

      // If modification times are significantly different, conflict exists
      if (Math.abs(localMod - remoteMod) > 60000) {
        // 1 minute threshold
        // Check if only metadata differs
        if (this.isMetadataOnlyConflict(local, remote)) {
          return ConflictType.METADATA_CONFLICT;
        }
        return ConflictType.BOTH_MODIFIED;
      }
    }

    // No conflict detected
    return null;
  }

  /**
   * Check if conflict is only in metadata (title, description)
   */
  private isMetadataOnlyConflict(local: BookmarkItem, remote: BookmarkItem): boolean {
    // Same URL and provider ID, but different title or metadata
    return (
      local.url === remote.url &&
      local.providerId === remote.providerId &&
      (local.title !== remote.title ||
        JSON.stringify(local.metadata) !== JSON.stringify(remote.metadata))
    );
  }

  /**
   * Resolve a conflict using the configured strategy
   */
  public resolveConflict(conflict: Conflict): ConflictResolutionResult {
    const strategy = this.providerStrategies.get(conflict.providerId) || this.defaultStrategy;

    const resolution = this.applyStrategy(conflict, strategy);

    logger.info(`Resolved conflict ${conflict.id} using strategy: ${strategy}`);

    // Remove from conflicts queue after resolution
    this.conflicts.delete(conflict.id);

    return resolution;
  }

  /**
   * Apply a specific resolution strategy to a conflict
   */
  private applyStrategy(conflict: Conflict, strategy: ConflictStrategy): ConflictResolutionResult {
    let resolved: BookmarkItem | null = null;
    let requiresUserConfirmation = false;

    switch (strategy) {
      case "remote_wins":
        resolved = conflict.remote;
        break;

      case "local_wins":
        resolved = conflict.local;
        break;

      case "newest_wins":
        resolved = this.resolveNewestWins(conflict);
        break;

      case "manual":
        // Manual resolution requires user interaction
        requiresUserConfirmation = true;
        resolved = conflict.remote; // Temporary: prefer remote until user decides
        break;

      case "merge":
        // Attempt to merge local and remote changes
        resolved = this.resolveMerge(conflict);
        break;

      default:
        logger.warn(`Unknown strategy: ${strategy}, defaulting to remote_wins`);
        resolved = conflict.remote;
    }

    return {
      conflict,
      strategy,
      resolved,
      requiresUserConfirmation,
    };
  }

  /**
   * Resolve conflict by choosing the newest version
   */
  private resolveNewestWins(conflict: Conflict): BookmarkItem | null {
    const { local, remote } = conflict;

    if (!local) return remote;
    if (!remote) return local;

    const localMod = local.lastModified ? new Date(local.lastModified).getTime() : 0;
    const remoteMod = remote.lastModified ? new Date(remote.lastModified).getTime() : 0;

    return localMod > remoteMod ? local : remote;
  }

  /**
   * Resolve conflict by merging local and remote changes
   */
  private resolveMerge(conflict: Conflict): BookmarkItem | null {
    const { local, remote } = conflict;

    if (!local) return remote;
    if (!remote) return local;

    // Merge strategy: take remote data but preserve local metadata if newer
    const localMod = local.lastModified ? new Date(local.lastModified).getTime() : 0;
    const remoteMod = remote.lastModified ? new Date(remote.lastModified).getTime() : 0;

    const merged: BookmarkItem = {
      ...remote, // Start with remote as base
      // Use local metadata if it's newer
      ...(localMod > remoteMod
        ? {
            title: local.title,
            metadata: local.metadata,
          }
        : {}),
      lastModified: new Date(Math.max(localMod, remoteMod)).toISOString(),
    };

    return merged;
  }

  /**
   * Get all unresolved conflicts
   */
  public getUnresolvedConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get unresolved conflicts for a specific provider
   */
  public getProviderConflicts(providerId: string): Conflict[] {
    return this.getUnresolvedConflicts().filter((c) => c.providerId === providerId);
  }

  /**
   * Get conflict by ID
   */
  public getConflict(conflictId: string): Conflict | null {
    return this.conflicts.get(conflictId) || null;
  }

  /**
   * Manually resolve a conflict with user's choice
   */
  public resolveManually(
    conflictId: string,
    resolution: ConflictResolution,
  ): ConflictResolutionResult | null {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      logger.error(`Conflict not found: ${conflictId}`);
      return null;
    }

    let resolved: BookmarkItem | null = null;

    switch (resolution.action) {
      case "keep_local":
        resolved = conflict.local;
        break;
      case "keep_remote":
        resolved = conflict.remote;
        break;
      case "keep_both":
        // This would require creating two separate bookmarks
        // For now, keep remote and log the decision
        resolved = conflict.remote;
        logger.info(`User chose to keep both versions for ${conflictId} - keeping remote`);
        break;
      case "delete_both":
        resolved = null;
        break;
    }

    this.conflicts.delete(conflictId);

    return {
      conflict,
      strategy: "manual",
      resolved,
      requiresUserConfirmation: false,
    };
  }

  /**
   * Clear all conflicts (useful for testing or reset)
   */
  public clearConflicts(): void {
    this.conflicts.clear();
    logger.info("All conflicts cleared");
  }

  /**
   * Get conflict statistics
   */
  public getStats(): {
    total: number;
    byType: Record<ConflictType, number>;
    byProvider: Record<string, number>;
  } {
    const conflicts = this.getUnresolvedConflicts();

    const byType: Record<ConflictType, number> = {
      [ConflictType.BOTH_MODIFIED]: 0,
      [ConflictType.LOCAL_EXISTS_REMOTE_DELETED]: 0,
      [ConflictType.LOCAL_DELETED_REMOTE_MODIFIED]: 0,
      [ConflictType.URL_MISMATCH]: 0,
      [ConflictType.METADATA_CONFLICT]: 0,
    };

    const byProvider: Record<string, number> = {};

    for (const conflict of conflicts) {
      byType[conflict.type]++;
      byProvider[conflict.providerId] = (byProvider[conflict.providerId] || 0) + 1;
    }

    return {
      total: conflicts.length,
      byType,
      byProvider,
    };
  }
}
