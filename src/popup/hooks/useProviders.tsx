import { useEffect, useState } from "react";
import type { ProviderStatus } from "@/services/provider-registry";
import { ProviderRegistry } from "@/services/provider-registry";
import { StorageManager } from "@/services/storage";
import { Logger } from "@/utils/logger";

const logger = new Logger("useProviders");

export interface ProviderInfo {
	id: string;
	name: string;
	status: ProviderStatus;
	itemCount?: number;
	lastSync?: number; // Timestamp
	error?: string;
}

export interface UseProvidersResult {
	providers: ProviderInfo[];
	loading: boolean;
	error: string | null;
	syncAll: () => Promise<void>;
	syncProvider: (providerId: string) => Promise<void>;
	connectProvider: (providerId: string) => Promise<void>;
	openSettings: () => void;
}

/**
 * Hook for managing provider state in popup
 *
 * Provides access to provider status, sync operations, and navigation.
 */
export function useProviders(): UseProvidersResult {
	const [providers, setProviders] = useState<ProviderInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Initialize and fetch provider status
	useEffect(() => {
		const initializeProviders = async () => {
			try {
				setLoading(true);
				setError(null);

				const registry = ProviderRegistry.getInstance();
				await registry.initialize();

				// Get storage manager for provider data
				const storage = StorageManager.getInstance();
				const providersData = await storage.getProviders();

				const allProviders = registry.getAllProviders();
				const providerInfos: ProviderInfo[] = [];

				for (const provider of allProviders) {
					const status = registry.getProviderStatus(provider.metadata.id);
					const providerData = providersData[provider.metadata.id];

					if (status) {
						providerInfos.push({
							id: provider.metadata.id,
							name: provider.metadata.name,
							status,
							itemCount: undefined, // Will be populated during sync
							lastSync: providerData?.lastSync,
							error: status.lastError,
						});
					}
				}

				setProviders(providerInfos);
			} catch (err) {
				logger.error("Failed to initialize providers", err as Error);
				setError(err instanceof Error ? err.message : "Failed to load providers");
			} finally {
				setLoading(false);
			}
		};

		initializeProviders();
	}, []);

	// Sync all providers via background scheduler
	const syncAll = async () => {
		try {
			setError(null);
			logger.info("Requesting sync for all providers");

			// Send message to background service worker
			const response = await chrome.runtime.sendMessage({ type: "SYNC_ALL" });

			if (!response.success) {
				throw new Error(response.error || "Sync failed");
			}

			logger.info("All providers synced successfully");

			// Refresh provider status after sync
			await refreshProviderStatus();
		} catch (err) {
			logger.error("Failed to sync all providers", err as Error);
			setError(err instanceof Error ? err.message : "Failed to sync providers");
		}
	};

	// Sync single provider via background scheduler
	const syncProvider = async (providerId: string) => {
		try {
			setError(null);
			logger.info(`Requesting sync for provider: ${providerId}`);

			// Send message to background service worker
			const response = await chrome.runtime.sendMessage({
				type: "SYNC_PROVIDER",
				providerId,
			});

			if (!response.success) {
				throw new Error(response.error || "Sync failed");
			}

			logger.info(`Provider ${providerId} synced successfully`);

			// Refresh provider status
			await refreshProviderStatus();
		} catch (err) {
			logger.error(`Failed to sync provider ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to sync provider");
		}
	};

	// Refresh provider status from storage
	const refreshProviderStatus = async () => {
		try {
			const storage = StorageManager.getInstance();
			const providersData = await storage.getProviders();
			const registry = ProviderRegistry.getInstance();

			setProviders((prev) =>
				prev.map((provider) => {
					const status = registry.getProviderStatus(provider.id);
					const providerData = providersData[provider.id];

					return {
						...provider,
						status: status || provider.status,
						lastSync: providerData?.lastSync,
						error: status?.lastError,
					};
				}),
			);
		} catch (err) {
			logger.error("Failed to refresh provider status", err as Error);
		}
	};

	// Connect provider (authenticate)
	const connectProvider = async (providerId: string) => {
		try {
			logger.info(`Connecting provider ${providerId}`);

			const registry = ProviderRegistry.getInstance();
			const provider = registry.getProvider(providerId);

			if (!provider) {
				throw new Error(`Provider ${providerId} not found`);
			}

			// Trigger authentication
			const result = await provider.authenticate();

			if (!result.success) {
				throw new Error(result.error || "Authentication failed");
			}

			logger.info(`Provider ${providerId} connected successfully`);

			// Refresh provider status
			await refreshProviderStatus();
		} catch (err) {
			logger.error(`Failed to connect provider ${providerId}`, err as Error);

			// Don't set error for user cancellation
			if (err instanceof Error && !err.message.includes("cancelled")) {
				setError(err.message);
			}
		}
	};

	// Open sidepanel settings
	const openSettings = async () => {
		try {
			const window = await chrome.windows.getCurrent();
			if (window.id && chrome.sidePanel) {
				await chrome.sidePanel.open({ windowId: window.id });
			} else {
				logger.warn("Side panel API not available");
			}
		} catch (err) {
			logger.error("Failed to open sidepanel", err as Error);
		}
	};

	return {
		providers,
		loading,
		error,
		syncAll,
		syncProvider,
		connectProvider,
		openSettings,
	};
}
