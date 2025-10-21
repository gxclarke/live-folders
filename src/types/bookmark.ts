/**
 * Bookmark Types
 * Types for bookmark items and operations
 */

/**
 * A bookmark item from an external provider
 */
export interface BookmarkItem {
  /** Unique identifier from the external service */
  id: string;
  /** Display title */
  title: string;
  /** Target URL */
  url: string;
  /** Provider ID this item belongs to */
  providerId: string;
  /** Optional description */
  description?: string;
  /** Optional favicon URL */
  favicon?: string;
  /** Creation timestamp */
  createdAt?: number;
  /** Last update timestamp */
  updatedAt?: number;
  /** Last modification timestamp (ISO string) */
  lastModified?: string;
  /** Provider-specific metadata */
  metadata?: BookmarkMetadata;
}

/**
 * Provider-specific metadata for a bookmark
 */
export interface BookmarkMetadata {
  /** Original item type (e.g., 'pull_request', 'issue') */
  type?: string;
  /** Item state (e.g., 'open', 'closed', 'merged') */
  state?: string;
  /** Repository or project name */
  repository?: string;
  /** Priority or severity */
  priority?: string;
  /** Labels or tags */
  labels?: string[];
  /** Assignees */
  assignees?: string[];
  /** Additional provider-specific data */
  [key: string]: unknown;
}

/**
 * Internal bookmark record with browser bookmark ID
 */
export interface BookmarkRecord {
  /** External item ID */
  itemId: string;
  /** Browser bookmark ID */
  bookmarkId: string;
  /** Provider ID */
  providerId: string;
  /** Last update timestamp (when synced locally) */
  lastUpdated: number;
  /** Hash of the bookmark data for change detection */
  hash?: string;
  /** Original creation timestamp from provider */
  createdAt?: number;
  /** Original update timestamp from provider */
  updatedAt?: number;
  /** Last modification timestamp from provider (ISO string) */
  lastModified?: string;
}

/**
 * Bookmark folder information
 */
export interface BookmarkFolder {
  /** Browser bookmark folder ID */
  id: string;
  /** Folder title */
  title: string;
  /** Parent folder ID */
  parentId?: string;
  /** Provider ID this folder belongs to */
  providerId?: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Diff result for bookmark synchronization
 */
export interface BookmarkSyncDiff {
  /** Items to add */
  toAdd: BookmarkItem[];
  /** Items to update */
  toUpdate: BookmarkUpdateItem[];
  /** Bookmark IDs to delete */
  toDelete: string[];
}

/**
 * Update item with browser bookmark ID
 */
export interface BookmarkUpdateItem {
  /** The updated item */
  item: BookmarkItem;
  /** Browser bookmark ID */
  bookmarkId: string;
}

/**
 * Bookmark operation result
 */
export interface BookmarkOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Browser bookmark ID (for create/update) */
  bookmarkId?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Batch bookmark operation result
 */
export interface BatchBookmarkResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Individual operation results */
  results: BookmarkOperationResult[];
  /** Any errors encountered */
  errors: string[];
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy =
  | "remote_wins" // Always use remote version
  | "local_wins" // Always use local version
  | "newest_wins" // Use whichever is newer
  | "manual" // Require user decision
  | "merge"; // Attempt to merge changes

/**
 * Manual conflict resolution action
 */
export interface ConflictResolution {
  /** The action to take */
  action: "keep_local" | "keep_remote" | "keep_both" | "delete_both";
  /** Optional note about the resolution */
  note?: string;
}
