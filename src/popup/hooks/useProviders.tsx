import { useEffect, useState } from "react";
import type { ProviderStatus } from "@/services/provider-registry";
import { ProviderRegistry } from "@/services/provider-registry";
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

				const allProviders = registry.getAllProviders();
				const providerInfos: ProviderInfo[] = [];

				for (const provider of allProviders) {
					const status = registry.getProviderStatus(provider.metadata.id);

					if (status) {
						let itemCount: number | undefined;

						// Fetch item count if authenticated and enabled
						if (status.authenticated && status.enabled) {
							try {
								const items = await registry.fetchProviderItems(provider.metadata.id);
								itemCount = items.length;
							} catch (err) {
								logger.error(`Failed to fetch items for ${provider.metadata.id}`, err);
							}
						}

						providerInfos.push({
							id: provider.metadata.id,
							name: provider.metadata.name,
							status,
							itemCount,
							lastSync: status.lastSync,
							error: status.lastError,
						});
					}
				}

				setProviders(providerInfos);
			} catch (err) {
				logger.error("useProviders", "Failed to initialize providers", err);
				setError(err instanceof Error ? err.message : "Failed to load providers");
			} finally {
				setLoading(false);
			}
		};

		initializeProviders();
	}, []);

	// Sync all providers
	const syncAll = async () => {
		try {
			setError(null);
			const registry = ProviderRegistry.getInstance();

			logger.info("useProviders", "Syncing all providers");

			const allItems = await registry.fetchAllProviderItems();

			logger.info("useProviders", `Synced ${allItems.length} items from all providers`);

			// Refresh provider status after sync
			const updatedProviders = providers.map((provider) => {
				const status = registry.getProviderStatus(provider.id);
				return {
					...provider,
					status: status || provider.status,
					lastSync: status?.lastSync,
					error: status?.lastError,
				};
			});

			setProviders(updatedProviders);
		} catch (err) {
			logger.error("useProviders", "Failed to sync all providers", err);
			setError(err instanceof Error ? err.message : "Failed to sync providers");
		}
	};

	// Sync single provider
	const syncProvider = async (providerId: string) => {
		try {
			setError(null);
			const registry = ProviderRegistry.getInstance();

			logger.info("useProviders", `Syncing provider: ${providerId}`);

			const items = await registry.fetchProviderItems(providerId);

			logger.info("useProviders", `Synced ${items.length} items from ${providerId}`);

			// Update provider status
			const status = registry.getProviderStatus(providerId);
			setProviders((prev) =>
				prev.map((p) =>
					p.id === providerId
						? {
								...p,
								status: status || p.status,
								itemCount: items.length,
								lastSync: status?.lastSync,
								error: status?.lastError,
							}
						: p,
				),
			);
		} catch (err) {
			logger.error(`Failed to sync provider ${providerId}`, err);
			setError(err instanceof Error ? err.message : "Failed to sync provider");
		}
	};

	// Open sidepanel settings
	const openSettings = async () => {
		// Open sidepanel using chrome.sidePanel API
		try {
			const windowId = (await chrome.windows.getCurrent()).id;
			if (windowId && chrome.sidePanel) {
				await chrome.sidePanel.open({ windowId });
			} else {
				logger.warn("Side panel API not available");
			}
		} catch (err) {
			logger.error("Failed to open sidepanel", err);
		}
	};

	return {
		providers,
		loading,
		error,
		syncAll,
		syncProvider,
		openSettings,
	};
}
