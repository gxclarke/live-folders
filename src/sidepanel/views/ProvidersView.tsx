import { CheckCircle, Sync, Warning } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	CircularProgress,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { ProviderIcon } from "@/components/ProviderIcon";
import { ProviderListSkeleton } from "@/components/Skeletons";
import type { ProviderStatus } from "@/services/provider-registry";
import { ProviderRegistry } from "@/services/provider-registry";
import { StorageManager } from "@/services/storage";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";
import { useAuthentication } from "../hooks/useAuthentication";

const logger = new Logger("ProvidersView");

interface ProviderData {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	authenticated: boolean;
	folderId?: string;
	lastSync?: number;
	status: ProviderStatus;
}

interface BookmarkFolder {
	id: string;
	title: string;
}

export function ProvidersView() {
	const [providers, setProviders] = useState<ProviderData[]>([]);
	const [folders, setFolders] = useState<BookmarkFolder[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [syncing, setSyncing] = useState<Set<string>>(new Set());
	const { authenticating, error: authError, authenticate, clearError } = useAuthentication();

	// Load providers and bookmark folders
	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Initialize provider registry
				const registry = ProviderRegistry.getInstance();
				await registry.initialize();

				// Get storage data
				const storage = StorageManager.getInstance();
				const providersData = await storage.getProviders();

				// Build provider list
				const allProviders = registry.getAllProviders();
				const providerList: ProviderData[] = allProviders.map((provider) => {
					const providerData = providersData[provider.metadata.id];
					const status = registry.getProviderStatus(provider.metadata.id);

					return {
						id: provider.metadata.id,
						name: provider.metadata.name,
						description: provider.metadata.description,
						enabled: providerData?.config?.enabled ?? false,
						authenticated: status?.authenticated ?? false,
						folderId: providerData?.folderId,
						lastSync: providerData?.lastSync,
						status: status || {
							id: provider.metadata.id,
							initialized: false,
							authenticated: false,
							enabled: false,
						},
					};
				});

				setProviders(providerList);

				// Load bookmark folders
				const bookmarkFolders = await browser.bookmarks.getTree();
				const folderList: BookmarkFolder[] = [];

				const extractFolders = (nodes: browser.Bookmarks.BookmarkTreeNode[]) => {
					for (const node of nodes) {
						if (node.type === "folder") {
							folderList.push({ id: node.id, title: node.title || "Untitled" });
							if (node.children) {
								extractFolders(node.children);
							}
						}
					}
				};

				extractFolders(bookmarkFolders);
				setFolders(folderList);
			} catch (err) {
				logger.error("Failed to load providers", err as Error);
				setError(err instanceof Error ? err.message : "Failed to load data");
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, []);

	// Toggle provider enabled state
	const handleToggleEnabled = async (providerId: string, enabled: boolean) => {
		try {
			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider(providerId);

			if (!providerData) {
				throw new Error(`Provider ${providerId} not found`);
			}

			providerData.config.enabled = enabled;
			await storage.saveProvider(providerId, providerData);

			setProviders((prev) => prev.map((p) => (p.id === providerId ? { ...p, enabled } : p)));

			logger.info(`Provider ${providerId} ${enabled ? "enabled" : "disabled"}`);
		} catch (err) {
			logger.error(`Failed to toggle provider ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to update provider");
		}
	};

	// Update provider folder
	const handleFolderChange = async (providerId: string, folderId: string) => {
		try {
			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider(providerId);

			if (!providerData) {
				throw new Error(`Provider ${providerId} not found`);
			}

			providerData.folderId = folderId;
			await storage.saveProvider(providerId, providerData);

			setProviders((prev) => prev.map((p) => (p.id === providerId ? { ...p, folderId } : p)));

			logger.info(`Provider ${providerId} folder updated to ${folderId}`);
		} catch (err) {
			logger.error(`Failed to update folder for ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to update folder");
		}
	};

	// Sync provider
	const handleSync = async (providerId: string) => {
		try {
			setSyncing((prev) => new Set(prev).add(providerId));
			logger.info(`Syncing provider ${providerId}`);

			const response = await chrome.runtime.sendMessage({
				type: "SYNC_PROVIDER",
				providerId,
			});

			if (!response.success) {
				throw new Error(response.error || "Sync failed");
			}

			logger.info(`Provider ${providerId} synced successfully`);

			// Refresh provider data
			const storage = StorageManager.getInstance();
			const providersData = await storage.getProviders();
			const providerData = providersData[providerId];

			setProviders((prev) =>
				prev.map((p) => (p.id === providerId ? { ...p, lastSync: providerData?.lastSync } : p)),
			);
		} catch (err) {
			logger.error(`Failed to sync provider ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Sync failed");
		} finally {
			setSyncing((prev) => {
				const next = new Set(prev);
				next.delete(providerId);
				return next;
			});
		}
	};

	// Authenticate provider
	const handleConnect = async (providerId: string) => {
		try {
			logger.info(`Connecting provider ${providerId}`);

			// Clear any previous auth errors
			clearError();
			setError(null);

			// Trigger authentication
			const success = await authenticate(providerId);

			if (success) {
				// Refresh provider list to show updated auth status
				const registry = ProviderRegistry.getInstance();

				setProviders((prev) =>
					prev.map((p) => {
						if (p.id === providerId) {
							const status = registry.getProviderStatus(providerId);
							return {
								...p,
								authenticated: status?.authenticated ?? true,
							};
						}
						return p;
					}),
				);
			}
		} catch (err) {
			logger.error(`Failed to connect provider ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Connection failed");
		}
	};

	// Render loading state
	if (loading) {
		return <ProviderListSkeleton />;
	}

	// Render error state
	if (error || authError) {
		return (
			<Box p={2}>
				<Alert
					severity="error"
					onClose={() => {
						setError(null);
						clearError();
					}}
				>
					{error || authError}
				</Alert>
			</Box>
		);
	}

	return (
		<Stack spacing={2}>
			<Typography variant="h5" component="h1">
				Providers
			</Typography>
			<Typography variant="body2" color="text.secondary">
				Configure which providers to sync and where to store their bookmarks.
			</Typography>

			{providers.length === 0 ? (
				<Alert severity="info">No providers available</Alert>
			) : (
				<Stack spacing={2}>
					{providers.map((provider) => {
						const isSyncing = syncing.has(provider.id);
						const canSync = provider.enabled && provider.authenticated && provider.folderId;

						return (
							<Card key={provider.id} variant="outlined">
								<CardContent>
									<Box display="flex" alignItems="center" gap={2} mb={2}>
										<ProviderIcon providerId={provider.id as "github" | "jira"} />
										<Box flex={1}>
											<Typography variant="h6">{provider.name}</Typography>
											<Typography variant="body2" color="text.secondary">
												{provider.description}
											</Typography>
										</Box>
										<Switch
											checked={provider.enabled}
											onChange={(e) => handleToggleEnabled(provider.id, e.target.checked)}
											disabled={!provider.authenticated}
										/>
									</Box>

									{/* Status indicator */}
									<Box display="flex" alignItems="center" gap={1} mb={2}>
										{provider.authenticated ? (
											<>
												<CheckCircle color="success" fontSize="small" />
												<Typography variant="body2" color="success.main">
													Connected
												</Typography>
											</>
										) : (
											<>
												<Warning color="warning" fontSize="small" />
												<Typography variant="body2" color="warning.main">
													Not connected
												</Typography>
											</>
										)}
									</Box>

									{/* Folder selection */}
									{provider.authenticated && (
										<FormControl fullWidth size="small" sx={{ mb: 2 }}>
											<InputLabel>Bookmark Folder</InputLabel>
											<Select
												value={provider.folderId || ""}
												label="Bookmark Folder"
												onChange={(e) => handleFolderChange(provider.id, e.target.value)}
												disabled={!provider.enabled}
											>
												<MenuItem value="">
													<em>Select a folder...</em>
												</MenuItem>
												{folders.map((folder) => (
													<MenuItem key={folder.id} value={folder.id}>
														{folder.title}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									)}

									{/* Last sync info */}
									{provider.lastSync && (
										<Typography variant="caption" color="text.secondary">
											Last synced: {new Date(provider.lastSync).toLocaleString()}
										</Typography>
									)}
								</CardContent>

								<CardActions>
									{!provider.authenticated ? (
										<Button
											size="small"
											variant="contained"
											onClick={() => handleConnect(provider.id)}
											disabled={authenticating}
											startIcon={authenticating ? <CircularProgress size={16} /> : undefined}
										>
											{authenticating ? "Connecting..." : "Connect"}
										</Button>
									) : (
										<Button
											size="small"
											variant="outlined"
											startIcon={isSyncing ? <CircularProgress size={16} /> : <Sync />}
											onClick={() => handleSync(provider.id)}
											disabled={!canSync || isSyncing}
										>
											{isSyncing ? "Syncing..." : "Sync Now"}
										</Button>
									)}
								</CardActions>
							</Card>
						);
					})}
				</Stack>
			)}
		</Stack>
	);
}
