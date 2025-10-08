/**
 * Storage Manager Usage Examples
 * Demonstrates how to use the StorageManager service
 */

import type { ProviderStorageData } from "@/types";
import { storageManager } from "./storage";

/**
 * Example: Initialize storage
 */
export async function initializeStorageExample(): Promise<void> {
	await storageManager.initialize();
	console.log("Storage initialized");
}

/**
 * Example: Get and update settings
 */
export async function settingsExample(): Promise<void> {
	// Get current settings
	const settings = await storageManager.getSettings();
	console.log("Current settings:", settings);

	// Update settings
	const result = await storageManager.saveSettings({
		syncInterval: 120000, // 2 minutes
		enableNotifications: true,
	});

	if (result.success) {
		console.log("Settings updated:", result.data);
	}
}

/**
 * Example: Manage providers
 */
export async function providerExample(): Promise<void> {
	const providerId = "github";

	// Save provider data
	const providerData: ProviderStorageData = {
		config: {
			enabled: true,
		},
		folderId: "bookmark-folder-123",
		lastSync: Date.now(),
		lastSyncStatus: "success",
	};

	await storageManager.saveProvider(providerId, providerData);

	// Get provider
	const provider = await storageManager.getProvider(providerId);
	console.log("Provider data:", provider);

	// Get all providers
	const allProviders = await storageManager.getProviders();
	console.log("All providers:", allProviders);
}

/**
 * Example: Manage authentication
 */
export async function authExample(): Promise<void> {
	const providerId = "github";

	// Save auth state
	const authState = {
		providerId,
		authenticated: true,
		tokens: {
			accessToken: "token123",
			tokenType: "Bearer",
			expiresAt: Date.now() + 3600000, // 1 hour
		},
		user: {
			id: "user123",
			username: "johndoe",
			displayName: "John Doe",
		},
		lastAuth: Date.now(),
	};

	await storageManager.saveAuth(providerId, authState);

	// Get auth state
	const auth = await storageManager.getAuth(providerId);
	console.log("Auth state:", auth);
}

/**
 * Example: Manage bookmark metadata
 */
export async function bookmarkMetadataExample(): Promise<void> {
	const providerId = "github";

	// Save bookmark metadata
	const metadata = {
		"pr-123": {
			itemId: "pr-123",
			bookmarkId: "bookmark-456",
			providerId,
			lastUpdated: Date.now(),
			hash: "abc123",
		},
	};

	await storageManager.saveBookmarkMetadata(providerId, metadata);

	// Get bookmark metadata
	const stored = await storageManager.getBookmarkMetadata(providerId);
	console.log("Bookmark metadata:", stored);
}

/**
 * Example: Get storage statistics
 */
export async function statsExample(): Promise<void> {
	const stats = await storageManager.getStats();
	console.log("Storage stats:", {
		...stats,
		usagePercent: `${stats.usagePercent.toFixed(2)}%`,
	});
}

/**
 * Example: Export and import data
 */
export async function backupExample(): Promise<void> {
	// Export data
	const backup = await storageManager.exportData();
	console.log("Exported data:", backup);

	// Save to file or cloud storage
	const backupJson = JSON.stringify(backup, null, 2);
	console.log("Backup size:", new Blob([backupJson]).size, "bytes");

	// Import data (for restore)
	const result = await storageManager.importData(backup);
	if (result.success) {
		console.log("Data restored successfully");
	}
}

/**
 * Example: Complete workflow
 */
export async function completeWorkflowExample(): Promise<void> {
	// 1. Initialize
	await storageManager.initialize();

	// 2. Configure settings
	await storageManager.saveSettings({
		syncInterval: 60000,
		enableNotifications: true,
	});

	// 3. Set up a provider
	const providerId = "github";
	await storageManager.saveProvider(providerId, {
		config: { enabled: true },
		folderId: "folder-123",
	});

	// 4. Authenticate
	await storageManager.saveAuth(providerId, {
		providerId,
		authenticated: true,
		tokens: {
			accessToken: "token",
			tokenType: "Bearer",
			expiresAt: Date.now() + 3600000,
		},
	});

	// 5. Save bookmark metadata
	await storageManager.saveBookmarkMetadata(providerId, {
		"item-1": {
			itemId: "item-1",
			bookmarkId: "bm-1",
			providerId,
			lastUpdated: Date.now(),
		},
	});

	// 6. Check stats
	const stats = await storageManager.getStats();
	console.log("Setup complete. Stats:", stats);
}
