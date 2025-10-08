/**
 * Storage Manager
 * Centralized data persistence layer with encryption and migration support
 */

import type {
	AuthState,
	BookmarkMetadataStorage,
	ExtensionSettings,
	Migration,
	ProviderStorageData,
	StorageOperationResult,
	StorageSchema,
	StorageStats,
} from "@/types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION, StorageKeys } from "@/types";
import browser from "@/utils/browser";

/**
 * Storage Manager Class
 * Handles all interactions with browser.storage.local
 */
export class StorageManager {
	private static instance: StorageManager;

	private constructor() {
		// Private constructor for singleton pattern
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): StorageManager {
		if (!StorageManager.instance) {
			StorageManager.instance = new StorageManager();
		}
		return StorageManager.instance;
	}

	/**
	 * Initialize storage with default values
	 */
	public async initialize(): Promise<void> {
		const stored = await browser.storage.local.get(null);

		// Check if already initialized
		if (stored[StorageKeys.SCHEMA_VERSION]) {
			// Run migrations if needed
			await this.runMigrations(stored as Partial<StorageSchema>);
			return;
		}

		// First-time initialization
		const initialData: StorageSchema = {
			settings: DEFAULT_SETTINGS,
			providers: {},
			auth: {},
			bookmarks: {},
			installedAt: Date.now(),
			schemaVersion: SCHEMA_VERSION,
		};

		await browser.storage.local.set(initialData as unknown as Record<string, unknown>);
	}

	/**
	 * Get extension settings
	 */
	public async getSettings(): Promise<ExtensionSettings> {
		const result = await browser.storage.local.get(StorageKeys.SETTINGS);
		return (result[StorageKeys.SETTINGS] as ExtensionSettings) || DEFAULT_SETTINGS;
	}

	/**
	 * Save extension settings
	 */
	public async saveSettings(
		settings: Partial<ExtensionSettings>,
	): Promise<StorageOperationResult<ExtensionSettings>> {
		try {
			const current = await this.getSettings();
			const updated = { ...current, ...settings };
			await browser.storage.local.set({ [StorageKeys.SETTINGS]: updated });
			return { success: true, data: updated };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to save settings",
			};
		}
	}

	/**
	 * Get all providers
	 */
	public async getProviders(): Promise<Record<string, ProviderStorageData>> {
		const result = await browser.storage.local.get(StorageKeys.PROVIDERS);
		return (result[StorageKeys.PROVIDERS] as Record<string, ProviderStorageData>) || {};
	}

	/**
	 * Get a specific provider
	 */
	public async getProvider(providerId: string): Promise<ProviderStorageData | null> {
		const providers = await this.getProviders();
		return providers[providerId] || null;
	}

	/**
	 * Save provider data
	 */
	public async saveProvider(
		providerId: string,
		data: ProviderStorageData,
	): Promise<StorageOperationResult<ProviderStorageData>> {
		try {
			const providers = await this.getProviders();
			providers[providerId] = data;
			await browser.storage.local.set({ [StorageKeys.PROVIDERS]: providers });
			return { success: true, data };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to save provider",
			};
		}
	}

	/**
	 * Delete a provider
	 */
	public async deleteProvider(providerId: string): Promise<StorageOperationResult<void>> {
		try {
			const providers = await this.getProviders();
			delete providers[providerId];
			await browser.storage.local.set({ [StorageKeys.PROVIDERS]: providers });

			// Also clean up auth and bookmarks
			await this.deleteAuth(providerId);
			await this.deleteBookmarkMetadata(providerId);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete provider",
			};
		}
	}

	/**
	 * Get all authentication states
	 */
	public async getAllAuth(): Promise<Record<string, AuthState>> {
		const result = await browser.storage.local.get(StorageKeys.AUTH);
		return (result[StorageKeys.AUTH] as Record<string, AuthState>) || {};
	}

	/**
	 * Get authentication state for a provider
	 */
	public async getAuth(providerId: string): Promise<AuthState | null> {
		const authStates = await this.getAllAuth();
		return authStates[providerId] || null;
	}

	/**
	 * Save authentication state
	 */
	public async saveAuth(
		providerId: string,
		authState: AuthState,
	): Promise<StorageOperationResult<AuthState>> {
		try {
			// Encrypt sensitive data before storing
			const encryptedState = await this.encryptAuthState(authState);

			const authStates = await this.getAllAuth();
			authStates[providerId] = encryptedState;
			await browser.storage.local.set({ [StorageKeys.AUTH]: authStates });

			return { success: true, data: authState };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to save auth",
			};
		}
	}

	/**
	 * Delete authentication state
	 */
	public async deleteAuth(providerId: string): Promise<StorageOperationResult<void>> {
		try {
			const authStates = await this.getAllAuth();
			delete authStates[providerId];
			await browser.storage.local.set({ [StorageKeys.AUTH]: authStates });
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete auth",
			};
		}
	}

	/**
	 * Get all bookmark metadata
	 */
	public async getAllBookmarkMetadata(): Promise<Record<string, BookmarkMetadataStorage>> {
		const result = await browser.storage.local.get(StorageKeys.BOOKMARKS);
		return (result[StorageKeys.BOOKMARKS] as Record<string, BookmarkMetadataStorage>) || {};
	}

	/**
	 * Get bookmark metadata for a provider
	 */
	public async getBookmarkMetadata(providerId: string): Promise<BookmarkMetadataStorage> {
		const allMetadata = await this.getAllBookmarkMetadata();
		return allMetadata[providerId] || {};
	}

	/**
	 * Save bookmark metadata for a provider
	 */
	public async saveBookmarkMetadata(
		providerId: string,
		metadata: BookmarkMetadataStorage,
	): Promise<StorageOperationResult<BookmarkMetadataStorage>> {
		try {
			const allMetadata = await this.getAllBookmarkMetadata();
			allMetadata[providerId] = metadata;
			await browser.storage.local.set({
				[StorageKeys.BOOKMARKS]: allMetadata,
			});
			return { success: true, data: metadata };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to save bookmark metadata",
			};
		}
	}

	/**
	 * Delete bookmark metadata for a provider
	 */
	public async deleteBookmarkMetadata(providerId: string): Promise<StorageOperationResult<void>> {
		try {
			const allMetadata = await this.getAllBookmarkMetadata();
			delete allMetadata[providerId];
			await browser.storage.local.set({
				[StorageKeys.BOOKMARKS]: allMetadata,
			});
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to delete bookmark metadata",
			};
		}
	}

	/**
	 * Get storage statistics
	 */
	public async getStats(): Promise<StorageStats> {
		const bytesInUse = await browser.storage.local.getBytesInUse();
		// Firefox reports 0 for getBytesInUse, so we estimate
		const bytesUsed = bytesInUse || (await this.estimateStorageSize());

		// Chrome has 10MB limit, Firefox has no limit (but we'll use 10MB for consistency)
		const bytesAvailable = 10 * 1024 * 1024; // 10MB
		const usagePercent = (bytesUsed / bytesAvailable) * 100;

		const providers = await this.getProviders();
		const bookmarks = await this.getAllBookmarkMetadata();

		const bookmarksByProvider: Record<string, number> = {};
		let totalBookmarks = 0;

		for (const [providerId, metadata] of Object.entries(bookmarks)) {
			const count = Object.keys(metadata).length;
			bookmarksByProvider[providerId] = count;
			totalBookmarks += count;
		}

		return {
			bytesUsed,
			bytesAvailable,
			usagePercent,
			providerCount: Object.keys(providers).length,
			totalBookmarks,
			bookmarksByProvider,
		};
	}

	/**
	 * Clear all storage (use with caution!)
	 */
	public async clearAll(): Promise<void> {
		await browser.storage.local.clear();
		await this.initialize();
	}

	/**
	 * Export all data (for backup)
	 */
	public async exportData(): Promise<StorageSchema> {
		const data = await browser.storage.local.get(null);
		return data as unknown as StorageSchema;
	}

	/**
	 * Import data (for restore)
	 */
	public async importData(data: Partial<StorageSchema>): Promise<StorageOperationResult<void>> {
		try {
			await browser.storage.local.set(data);
			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Failed to import data",
			};
		}
	}

	// Private helper methods

	/**
	 * Encrypt authentication state (basic obfuscation)
	 * In production, use proper encryption like Web Crypto API
	 */
	private async encryptAuthState(authState: AuthState): Promise<AuthState> {
		// For now, just return as-is
		// TODO: Implement proper encryption using Web Crypto API
		// When implemented, also use decryptAuthState() in getAuth()
		return authState;
	}

	/**
	 * Estimate storage size (for Firefox which doesn't report bytes)
	 */
	private async estimateStorageSize(): Promise<number> {
		const data = await browser.storage.local.get(null);
		const json = JSON.stringify(data);
		return new Blob([json]).size;
	}

	/**
	 * Run schema migrations
	 */
	private async runMigrations(currentData: Partial<StorageSchema>): Promise<void> {
		const currentVersion = currentData.schemaVersion || 0;

		if (currentVersion >= SCHEMA_VERSION) {
			return; // Already up to date
		}

		// Get migrations to run
		const migrationsToRun = this.getMigrations().filter(
			(m) => m.version > currentVersion && m.version <= SCHEMA_VERSION,
		);

		// Run migrations in order
		let data = currentData;
		for (const migration of migrationsToRun) {
			console.log(`Running migration to version ${migration.version}`);
			data = await migration.migrate(data);
			data.schemaVersion = migration.version;
		}

		// Save migrated data
		await browser.storage.local.set(data);
	}

	/**
	 * Get all migrations
	 */
	private getMigrations(): Migration[] {
		// Migrations will be added here as the schema evolves
		return [];
	}
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
