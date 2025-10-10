import { Add, CheckCircle, ExpandMore, Settings, Sync, Warning } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActions,
	CardContent,
	Checkbox,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	FormControlLabel,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { ProviderIcon } from "@/components/ProviderIcon";
import { ProviderListSkeleton } from "@/components/Skeletons";
import type { ProviderStatus } from "@/services/provider-registry";
import { ProviderRegistry } from "@/services/provider-registry";
import { StorageManager } from "@/services/storage";
import type { ProviderConfig } from "@/types/provider";
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
	sortOrder?: "alphabetical" | "created" | "updated";
	filters?: {
		createdByMe?: boolean;
		reviewRequests?: boolean;
		assignedToMe?: boolean;
	};
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
	const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());
	const [githubPAT, setGithubPAT] = useState<string>("");
	const [jiraBaseUrl, setJiraBaseUrl] = useState<string>("");
	const [jiraEmail, setJiraEmail] = useState<string>("");
	const [jiraApiToken, setJiraApiToken] = useState<string>("");
	const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");
	const [creatingFolder, setCreatingFolder] = useState(false);
	const { authenticating, error: authError, authenticate, clearError } = useAuthentication();

	// Fetch bookmark folders (with alphabetical sorting)
	const fetchFolders = useCallback(async () => {
		try {
			const bookmarkFolders = await browser.bookmarks.getTree();
			const folderList: BookmarkFolder[] = [];

			const extractFolders = (nodes: browser.Bookmarks.BookmarkTreeNode[]) => {
				for (const node of nodes) {
					// A node is a folder if it doesn't have a url property
					if (!node.url) {
						folderList.push({ id: node.id, title: node.title || "Untitled" });
						if (node.children) {
							extractFolders(node.children);
						}
					}
				}
			};

			extractFolders(bookmarkFolders);

			// Sort folders alphabetically by title
			folderList.sort((a, b) => a.title.localeCompare(b.title));

			logger.info(`Loaded ${folderList.length} bookmark folders`);
			setFolders(folderList);
		} catch (err) {
			logger.error("Failed to load bookmark folders", err as Error);
		}
	}, []);

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
						sortOrder: providerData?.config?.sortOrder ?? "alphabetical",
						filters: providerData?.config?.filters ?? {},
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

				// Load bookmark folders (sorted alphabetically)
				await fetchFolders();
			} catch (err) {
				logger.error("Failed to load providers", err as Error);
				setError(err instanceof Error ? err.message : "Failed to load data");
			} finally {
				setLoading(false);
			}
		};

		loadData();

		// Listen for storage changes to refresh provider data in real-time
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName === "local" && changes.providers?.newValue) {
				logger.info("Providers data changed in storage, updating provider state...");

				// Update provider state without reloading everything
				const providersData = changes.providers.newValue;
				const registry = ProviderRegistry.getInstance();

				setProviders((prev) =>
					prev.map((provider) => {
						const providerData = providersData[provider.id];
						const status = registry.getProviderStatus(provider.id);

						return {
							...provider,
							enabled: providerData?.config?.enabled ?? provider.enabled,
							authenticated: status?.authenticated ?? provider.authenticated,
							folderId: providerData?.folderId ?? provider.folderId,
							sortOrder: providerData?.config?.sortOrder ?? provider.sortOrder,
							filters: providerData?.config?.filters ?? provider.filters,
							lastSync: providerData?.lastSync ?? provider.lastSync,
							status: status || provider.status,
						};
					}),
				);
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);

		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, [fetchFolders]);

	// Toggle provider enabled state
	const handleToggleEnabled = async (providerId: string, enabled: boolean) => {
		try {
			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider(providerId);

			if (!providerData) {
				throw new Error(`Provider ${providerId} not found`);
			}

			// Update enabled state while preserving ALL other fields
			const updatedData = {
				...providerData,
				config: {
					...providerData.config,
					enabled,
				},
			};

			await storage.saveProvider(providerId, updatedData);

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

			// Update folderId while preserving ALL other fields
			const updatedData = {
				...providerData,
				folderId,
			};

			await storage.saveProvider(providerId, updatedData);

			setProviders((prev) => prev.map((p) => (p.id === providerId ? { ...p, folderId } : p)));

			logger.info(`Provider ${providerId} folder updated to ${folderId}`);
		} catch (err) {
			logger.error(`Failed to update folder for ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to update folder");
		}
	};

	// Update provider sort order
	const handleSortOrderChange = async (
		providerId: string,
		sortOrder: "alphabetical" | "created" | "updated",
	) => {
		try {
			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider(providerId);

			if (!providerData) {
				throw new Error(`Provider ${providerId} not found`);
			}

			// Update sortOrder while preserving ALL other fields
			const updatedData = {
				...providerData,
				config: {
					...providerData.config,
					sortOrder,
				},
			};

			await storage.saveProvider(providerId, updatedData);

			logger.info(`Provider ${providerId} sort order updated to ${sortOrder}`);
		} catch (err) {
			logger.error(`Failed to update sort order for ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to update sort order");
		}
	};

	// Update provider filters
	const handleFilterChange = async (providerId: string, filterKey: string, value: boolean) => {
		try {
			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider(providerId);

			if (!providerData) {
				throw new Error(`Provider ${providerId} not found`);
			}

			// Update filter while preserving ALL other fields
			const updatedData = {
				...providerData,
				config: {
					...providerData.config,
					filters: {
						...(providerData.config?.filters || {}),
						[filterKey]: value,
					},
				},
			};

			await storage.saveProvider(providerId, updatedData);

			logger.info(`Provider ${providerId} filter ${filterKey} updated to ${value}`);
		} catch (err) {
			logger.error(`Failed to update filter for ${providerId}`, err as Error);
			setError(err instanceof Error ? err.message : "Failed to update filter");
		}
	};

	// Sync provider
	const handleSync = async (providerId: string) => {
		try {
			setSyncing((prev) => new Set(prev).add(providerId));
			setError(null); // Clear any previous errors
			logger.info(`Syncing provider ${providerId}`);

			const response = await chrome.runtime.sendMessage({
				type: "SYNC_PROVIDER",
				providerId,
			});

			if (!response.success) {
				throw new Error(response.error || "Sync failed");
			}

			logger.info(`Provider ${providerId} synced successfully`);

			// Refresh provider data - only update lastSync, preserve existing folderId
			const storage = StorageManager.getInstance();
			const providersData = await storage.getProviders();
			const providerData = providersData[providerId];

			setProviders((prev) =>
				prev.map((p) =>
					p.id === providerId
						? {
								...p,
								lastSync: providerData?.lastSync,
								// Keep existing folderId - sync doesn't change it
							}
						: p,
				),
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

	// Toggle settings expansion
	const handleToggleSettings = (providerId: string) => {
		setExpandedSettings((prev) => {
			const next = new Set(prev);
			if (next.has(providerId)) {
				next.delete(providerId);
			} else {
				next.add(providerId);
			}
			return next;
		});
	};

	// Save GitHub PAT
	const handleSaveGitHubPAT = async () => {
		try {
			if (!githubPAT.trim()) {
				setError("Please enter a valid GitHub Personal Access Token");
				return;
			}

			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider("github");

			if (!providerData) {
				// Provider not found - this shouldn't happen if ProviderRegistry initialized properly
				setError("GitHub provider not initialized. Please reload the extension and try again.");
				return;
			}

			// Add PAT to config - preserve ALL existing fields while updating the PAT
			// Provider-specific config field (not in base ProviderConfig type)
			const updatedConfig = {
				...providerData.config,
				personalAccessToken: githubPAT,
			};

			const updatedData = {
				...providerData,
				config: updatedConfig as ProviderConfig,
			};

			await storage.saveProvider("github", updatedData);

			logger.info("GitHub PAT saved successfully");
			setGithubPAT(""); // Clear input after saving

			// Show success message (could be improved with a success Alert)
			setError(null);
		} catch (err) {
			logger.error("Failed to save GitHub PAT", err as Error);
			setError(err instanceof Error ? err.message : "Failed to save token");
		}
	};

	// Save Jira API Token configuration
	const handleSaveJiraConfig = async () => {
		try {
			if (!jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()) {
				setError("Please fill in all Jira configuration fields");
				return;
			}

			// Validate URL format
			try {
				new URL(jiraBaseUrl);
			} catch {
				setError("Please enter a valid Jira URL (e.g., https://yourcompany.atlassian.net)");
				return;
			}

			const storage = StorageManager.getInstance();
			const providerData = await storage.getProvider("jira");

			if (!providerData) {
				setError("Jira provider not initialized. Please reload the extension and try again.");
				return;
			}

			// Add Jira config - preserve ALL existing fields
			const updatedConfig = {
				...providerData.config,
				baseUrl: jiraBaseUrl,
				username: jiraEmail,
				apiToken: jiraApiToken,
				authType: "api-token",
				instanceType: "cloud",
			};

			const updatedData = {
				...providerData,
				config: updatedConfig as ProviderConfig,
			};

			await storage.saveProvider("jira", updatedData);

			logger.info("Jira configuration saved successfully");
			setJiraBaseUrl("");
			setJiraEmail("");
			setJiraApiToken("");

			setError(null);
		} catch (err) {
			logger.error("Failed to save Jira configuration", err as Error);
			setError(err instanceof Error ? err.message : "Failed to save configuration");
		}
	};

	// Create a new bookmark folder
	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) {
			setError("Folder name cannot be empty");
			return;
		}

		try {
			setCreatingFolder(true);
			setError(null);

			// Create folder under "Other Bookmarks" (id: "2")
			const newFolder = await browser.bookmarks.create({
				parentId: "2", // "Other Bookmarks" folder
				title: newFolderName.trim(),
			});

			logger.info(`Created new folder: ${newFolder.title}`, { id: newFolder.id });

			// Refresh folder list
			await fetchFolders();

			// Close dialog and reset state
			setCreateFolderDialogOpen(false);
			setNewFolderName("");
		} catch (err) {
			logger.error("Failed to create folder", err as Error);
			setError(err instanceof Error ? err.message : "Failed to create folder");
		} finally {
			setCreatingFolder(false);
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
										<ProviderIcon providerId={provider.id} />
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
												onOpen={fetchFolders} // Refresh folders when dropdown opens
											>
												<MenuItem
													value=""
													onClick={() => setCreateFolderDialogOpen(true)}
													sx={{
														borderBottom: "1px solid",
														borderColor: "divider",
														color: "primary.main",
														fontWeight: 500,
													}}
												>
													<Add fontSize="small" sx={{ mr: 1 }} />
													Create New Folder...
												</MenuItem>
												<MenuItem value="" disabled>
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
									{/* Sort order selection */}
									{provider.authenticated && provider.folderId && (
										<FormControl fullWidth size="small" sx={{ mb: 2 }}>
											<InputLabel>Sort Bookmarks By</InputLabel>
											<Select
												value={provider.sortOrder || "alphabetical"}
												label="Sort Bookmarks By"
												onChange={(e) =>
													handleSortOrderChange(
														provider.id,
														e.target.value as "alphabetical" | "created" | "updated",
													)
												}
												disabled={!provider.enabled}
											>
												<MenuItem value="alphabetical">Alphabetical (A-Z)</MenuItem>
												<MenuItem value="created">Creation Date (Oldest First)</MenuItem>
												<MenuItem value="updated">Last Updated (Newest First)</MenuItem>
											</Select>
										</FormControl>
									)}
									{/* Filter options */}
									{provider.authenticated && provider.folderId && (
										<Box sx={{ mb: 2 }}>
											<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
												Filter Items
											</Typography>
											<Stack spacing={0.5}>
												{provider.id === "github" && (
													<>
														<FormControlLabel
															control={
																<Checkbox
																	checked={provider.filters?.createdByMe ?? true}
																	onChange={(e) =>
																		handleFilterChange(provider.id, "createdByMe", e.target.checked)
																	}
																	disabled={!provider.enabled}
																	size="small"
																/>
															}
															label="Created by me"
														/>
														<FormControlLabel
															control={
																<Checkbox
																	checked={provider.filters?.reviewRequests ?? true}
																	onChange={(e) =>
																		handleFilterChange(
																			provider.id,
																			"reviewRequests",
																			e.target.checked,
																		)
																	}
																	disabled={!provider.enabled}
																	size="small"
																/>
															}
															label="Review requests"
														/>
													</>
												)}
												{provider.id === "jira" && (
													<>
														<FormControlLabel
															control={
																<Checkbox
																	checked={provider.filters?.createdByMe ?? true}
																	onChange={(e) =>
																		handleFilterChange(provider.id, "createdByMe", e.target.checked)
																	}
																	disabled={!provider.enabled}
																	size="small"
																/>
															}
															label="Created by me"
														/>
														<FormControlLabel
															control={
																<Checkbox
																	checked={provider.filters?.assignedToMe ?? true}
																	onChange={(e) =>
																		handleFilterChange(
																			provider.id,
																			"assignedToMe",
																			e.target.checked,
																		)
																	}
																	disabled={!provider.enabled}
																	size="small"
																/>
															}
															label="Assigned to me"
														/>
													</>
												)}
											</Stack>
										</Box>
									)}{" "}
									{/* Last sync info */}
									{provider.lastSync && (
										<Typography variant="caption" color="text.secondary">
											Last synced: {new Date(provider.lastSync).toLocaleString()}
										</Typography>
									)}
									{/* Provider-specific settings */}
									{!provider.authenticated && provider.id === "github" && (
										<Box mt={2}>
											<Box display="flex" alignItems="center" gap={1} mb={1}>
												<IconButton
													size="small"
													onClick={() => handleToggleSettings(provider.id)}
													sx={{
														transform: expandedSettings.has(provider.id)
															? "rotate(180deg)"
															: "rotate(0deg)",
														transition: "transform 0.3s",
													}}
												>
													<ExpandMore />
												</IconButton>
												<Typography variant="body2" color="text.secondary">
													Advanced Settings
												</Typography>
											</Box>

											<Collapse in={expandedSettings.has(provider.id)}>
												<Stack spacing={2} mt={1}>
													<Alert severity="info" sx={{ fontSize: "0.875rem" }}>
														Enter a GitHub Personal Access Token (classic) with
														<strong> repo</strong>, <strong>read:user</strong>, and{" "}
														<strong>read:org</strong> scopes.{" "}
														<a
															href="https://github.com/settings/tokens"
															target="_blank"
															rel="noopener noreferrer"
														>
															Create one here
														</a>
														.
													</Alert>
													<TextField
														fullWidth
														size="small"
														type="password"
														label="Personal Access Token"
														placeholder="ghp_..."
														value={githubPAT}
														onChange={(e) => setGithubPAT(e.target.value)}
														helperText="This token will be stored securely in your browser"
													/>
													<Button
														variant="outlined"
														size="small"
														onClick={handleSaveGitHubPAT}
														disabled={!githubPAT.trim()}
														startIcon={<Settings />}
													>
														Save Token
													</Button>
												</Stack>
											</Collapse>
										</Box>
									)}
									{/* Jira API Token Configuration */}
									{!provider.authenticated && provider.id === "jira" && (
										<Box mt={2}>
											<Box display="flex" alignItems="center" gap={1} mb={1}>
												<IconButton
													size="small"
													onClick={() => handleToggleSettings(provider.id)}
													sx={{
														transform: expandedSettings.has(provider.id)
															? "rotate(180deg)"
															: "rotate(0deg)",
														transition: "transform 0.3s",
													}}
												>
													<ExpandMore />
												</IconButton>
												<Typography variant="body2" color="text.secondary">
													API Token Configuration
												</Typography>
											</Box>

											<Collapse in={expandedSettings.has(provider.id)}>
												<Stack spacing={2} mt={1}>
													<Alert severity="info" sx={{ fontSize: "0.875rem" }}>
														Enter your Jira Cloud details. You can create an API token at{" "}
														<a
															href="https://id.atlassian.com/manage-profile/security/api-tokens"
															target="_blank"
															rel="noopener noreferrer"
														>
															Atlassian Account Security
														</a>
														.
													</Alert>
													<TextField
														fullWidth
														size="small"
														type="url"
														label="Jira Base URL"
														placeholder="https://yourcompany.atlassian.net"
														value={jiraBaseUrl}
														onChange={(e) => setJiraBaseUrl(e.target.value)}
														helperText="Your Jira Cloud instance URL"
													/>
													<TextField
														fullWidth
														size="small"
														type="email"
														label="Email Address"
														placeholder="you@company.com"
														value={jiraEmail}
														onChange={(e) => setJiraEmail(e.target.value)}
														helperText="Your Jira account email"
													/>
													<TextField
														fullWidth
														size="small"
														type="password"
														label="API Token"
														placeholder="Your Jira API token"
														value={jiraApiToken}
														onChange={(e) => setJiraApiToken(e.target.value)}
														helperText="This token will be stored securely in your browser"
													/>
													<Button
														variant="outlined"
														size="small"
														onClick={handleSaveJiraConfig}
														disabled={
															!jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()
														}
														startIcon={<Settings />}
													>
														Save Configuration
													</Button>
												</Stack>
											</Collapse>
										</Box>
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
										<Tooltip
											title={
												!canSync
													? !provider.enabled
														? "Enable provider to sync"
														: !provider.folderId
															? "Select a bookmark folder first"
															: "Provider not ready"
													: ""
											}
										>
											<span>
												<Button
													size="small"
													variant="outlined"
													startIcon={isSyncing ? <CircularProgress size={16} /> : <Sync />}
													onClick={() => handleSync(provider.id)}
													disabled={!canSync || isSyncing}
												>
													{isSyncing ? "Syncing..." : "Sync Now"}
												</Button>
											</span>
										</Tooltip>
									)}
								</CardActions>
							</Card>
						);
					})}
				</Stack>
			)}

			{/* Folder Creation Dialog */}
			<Dialog
				open={createFolderDialogOpen}
				onClose={() => {
					setCreateFolderDialogOpen(false);
					setNewFolderName("");
					setError(null);
				}}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Create New Bookmark Folder</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>
						Enter a name for the new bookmark folder. It will be created under "Other Bookmarks".
					</DialogContentText>
					<TextField
						autoFocus
						fullWidth
						label="Folder Name"
						value={newFolderName}
						onChange={(e) => setNewFolderName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && newFolderName.trim()) {
								handleCreateFolder();
							}
						}}
						error={!!error}
						helperText={error}
						disabled={creatingFolder}
					/>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setCreateFolderDialogOpen(false);
							setNewFolderName("");
							setError(null);
						}}
						disabled={creatingFolder}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreateFolder}
						variant="contained"
						disabled={!newFolderName.trim() || creatingFolder}
						startIcon={creatingFolder ? <CircularProgress size={16} /> : undefined}
					>
						{creatingFolder ? "Creating..." : "Create"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
}
