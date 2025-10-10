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
