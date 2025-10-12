/**
 * Provider Types
 * Core interfaces for external service integrations
 */

import type { BookmarkItem } from "./bookmark";

/**
 * Bookmark sort order options
 */
export type BookmarkSortOrder = "alphabetical" | "created" | "updated";

/**
 * GitHub-specific filter options
 */
export interface GitHubFilters {
  /** Include PRs created by me */
  createdByMe?: boolean;
  /** Include PRs where I'm requested for review */
  reviewRequests?: boolean;
}

/**
 * Jira-specific filter options
 */
export interface JiraFilters {
  /** Include issues created by me */
  createdByMe?: boolean;
  /** Include issues assigned to me */
  assignedToMe?: boolean;
}

/**
 * Provider-specific filter options
 */
export type ProviderFilters = GitHubFilters | JiraFilters;

/**
 * Title format style options
 */
export type TitleFormatStyle = "compact" | "detailed" | "minimal";

/**
 * Title formatting options for bookmark generation
 */
export interface TitleFormatOptions {
  /** Include status indicators (e.g., open, closed, merged) */
  includeStatus: boolean;
  /** Use emoji icons for visual indicators */
  includeEmojis: boolean;
  /** Include assignee/owner information */
  includeAssignee: boolean;
  /** Include priority level */
  includePriority: boolean;
  /** Include age/time information */
  includeAge: boolean;
  /** Include review status (GitHub PRs) */
  includeReviewStatus: boolean;
  /** Include item creator/author */
  includeCreator: boolean;
  /** Overall format style */
  format: TitleFormatStyle;
}

/**
 * Folder title formatting options for dynamic folder names
 */
export interface FolderTitleFormatOptions {
  /** Whether to dynamically update folder names with statistics */
  enabled: boolean;
  /** Include total count of items */
  includeTotal: boolean;
  /** Include count of items awaiting review (GitHub only) */
  includeReviewCount: boolean;
}

/**
 * Default title format options
 */
export const DEFAULT_TITLE_FORMAT: TitleFormatOptions = {
  includeStatus: true,
  includeEmojis: true,
  includeAssignee: false,
  includePriority: false,
  includeAge: false,
  includeReviewStatus: true,
  includeCreator: false,
  format: "compact",
};

/**
 * Default folder title format options
 */
export const DEFAULT_FOLDER_TITLE_FORMAT: FolderTitleFormatOptions = {
  enabled: false,
  includeTotal: true,
  includeReviewCount: true,
};

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Whether the provider is enabled */
  enabled: boolean;
  /** Bookmark folder ID where items will be synced */
  folderId?: string;
  /** Last successful sync timestamp */
  lastSync?: number;
  /** Sort order for bookmarks */
  sortOrder?: BookmarkSortOrder;
  /** Provider-specific filters */
  filters?: ProviderFilters;
  /** Title formatting options */
  titleFormat?: TitleFormatOptions;
  /** Folder title formatting options */
  folderTitleFormat?: FolderTitleFormatOptions;
  /** Provider-specific configuration */
  settings?: Record<string, unknown>;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  /** Unique identifier for the provider */
  id: string;
  /** Display name */
  name: string;
  /** Description of the provider */
  description: string;
  /** Icon URL or data URI */
  icon: string;
  /** Provider version */
  version: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;
  /** Access token (if successful) */
  accessToken?: string;
  /** Refresh token (if available) */
  refreshToken?: string;
  /** Token expiration timestamp */
  expiresAt?: number;
  /** User information */
  user?: UserInfo;
  /** Error message (if failed) */
  error?: string;
}

/**
 * User information from authentication
 */
export interface UserInfo {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name */
  displayName?: string;
  /** Email address */
  email?: string;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Provider interface
 * All providers must implement this interface
 */
export interface Provider {
  /** Provider metadata */
  readonly metadata: ProviderMetadata;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Authenticate the user
   * @returns Authentication result
   */
  authenticate(): Promise<AuthResult>;

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get the current access token
   */
  getToken(): Promise<string | null>;

  /**
   * Refresh the access token
   */
  refreshToken(): Promise<void>;

  /**
   * Revoke authentication
   */
  revokeAuth(): Promise<void>;

  /**
   * Fetch items from the external service
   * @returns Array of bookmark items
   */
  fetchItems(): Promise<BookmarkItem[]>;

  /**
   * Format folder title with dynamic statistics
   * @param baseName - Base folder name (e.g., "GitHub Pull Requests")
   * @param items - Array of items to calculate statistics from
   * @returns Formatted folder title
   */
  formatFolderTitle(baseName: string, items: BookmarkItem[]): Promise<string>;

  /**
   * Get provider configuration
   */
  getConfig(): Promise<ProviderConfig>;

  /**
   * Update provider configuration
   */
  setConfig(config: Partial<ProviderConfig>): Promise<void>;

  /**
   * Cleanup provider resources
   */
  dispose(): Promise<void>;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = () => Provider;

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
  /** Provider metadata */
  metadata: ProviderMetadata;
  /** Factory function to create provider instance */
  factory: ProviderFactory;
}

/**
 * Provider status for UI display
 */
export interface ProviderStatus {
  /** Provider ID */
  providerId: string;
  /** Whether provider is enabled */
  enabled: boolean;
  /** Whether provider is authenticated */
  authenticated: boolean;
  /** Last sync timestamp */
  lastSync?: number;
  /** Number of items synced */
  itemCount?: number;
  /** Current sync state */
  syncState: "idle" | "syncing" | "error";
  /** Error message if in error state */
  error?: string;
}
