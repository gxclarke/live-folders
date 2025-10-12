/**
 * Storage Types
 * Types for local storage schema and operations
 */

import type { AuthState } from "./auth";
import type { BookmarkRecord } from "./bookmark";
import type { ProviderConfig } from "./provider";

/**
 * Global extension settings
 */
export interface ExtensionSettings {
  /** Sync interval in milliseconds (default: 60000 = 1 minute) */
  syncInterval: number;
  /** Whether to show notifications */
  enableNotifications: boolean;
  /** Whether to show sync errors as notifications */
  notifyOnError: boolean;
  /** Whether to show success notifications */
  notifyOnSuccess: boolean;
  /** Theme preference */
  theme: "light" | "dark" | "auto";
  /** Debug mode */
  debugMode: boolean;
  /** Maximum number of items per provider */
  maxItemsPerProvider: number;
}

/**
 * Provider storage data
 */
export interface ProviderStorageData {
  /** Provider configuration */
  config: ProviderConfig;
  /** Bookmark folder ID */
  folderId?: string;
  /** Last sync timestamp */
  lastSync?: number;
  /** Last sync status */
  lastSyncStatus?: "success" | "error";
  /** Last error message */
  lastError?: string;
}

/**
 * Bookmark metadata storage
 */
export interface BookmarkMetadataStorage {
  /** Map of item ID to bookmark record */
  [itemId: string]: BookmarkRecord;
}

/**
 * Complete storage schema
 */
export interface StorageSchema {
  /** Extension settings */
  settings: ExtensionSettings;
  /** Provider configurations keyed by provider ID */
  providers: {
    [providerId: string]: ProviderStorageData;
  };
  /** Authentication states keyed by provider ID */
  auth: {
    [providerId: string]: AuthState;
  };
  /** Bookmark metadata keyed by provider ID */
  bookmarks: {
    [providerId: string]: BookmarkMetadataStorage;
  };
  /** Installation timestamp */
  installedAt: number;
  /** Schema version for migrations */
  schemaVersion: number;
}

/**
 * Default extension settings
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  syncInterval: 60000, // 1 minute
  enableNotifications: true,
  notifyOnError: true,
  notifyOnSuccess: false,
  theme: "auto",
  debugMode: false,
  maxItemsPerProvider: 100,
};

/**
 * Current schema version
 */
export const SCHEMA_VERSION = 1;

/**
 * Storage keys (for type-safe storage access)
 */
export const StorageKeys = {
  SETTINGS: "settings",
  PROVIDERS: "providers",
  AUTH: "auth",
  BOOKMARKS: "bookmarks",
  INSTALLED_AT: "installedAt",
  SCHEMA_VERSION: "schemaVersion",
} as const;

/**
 * Storage area type
 */
export type StorageArea = "local" | "sync" | "managed";

/**
 * Storage change event
 */
export interface StorageChange<T = unknown> {
  /** Old value */
  oldValue?: T;
  /** New value */
  newValue?: T;
}

/**
 * Storage changes map
 */
export interface StorageChanges {
  [key: string]: StorageChange;
}

/**
 * Migration function type
 */
export type MigrationFunction = (
  oldSchema: Partial<StorageSchema>,
) => Promise<Partial<StorageSchema>>;

/**
 * Migration definition
 */
export interface Migration {
  /** Version this migration upgrades to */
  version: number;
  /** Migration description */
  description: string;
  /** Migration function */
  migrate: MigrationFunction;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;
  /** The data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total bytes used */
  bytesUsed: number;
  /** Total bytes available */
  bytesAvailable: number;
  /** Usage percentage */
  usagePercent: number;
  /** Number of providers */
  providerCount: number;
  /** Total number of bookmarks */
  totalBookmarks: number;
  /** Bookmarks by provider */
  bookmarksByProvider: {
    [providerId: string]: number;
  };
}
