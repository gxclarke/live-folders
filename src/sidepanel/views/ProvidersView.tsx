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
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
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
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ProviderIcon } from "@/components/ProviderIcon";
import { ProviderListSkeleton } from "@/components/Skeletons";
import type { ProviderStatus } from "@/services/provider-registry";
import { ProviderRegistry } from "@/services/provider-registry";
import { StorageManager } from "@/services/storage";
import { DEFAULT_FOLDER_TITLE_FORMAT, DEFAULT_TITLE_FORMAT } from "@/types";
import type {
  FolderTitleFormatOptions,
  ProviderConfig,
  TitleFormatOptions,
} from "@/types/provider";
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
  titleFormat?: TitleFormatOptions;
  folderTitleFormat?: FolderTitleFormatOptions;
  lastSync?: number;
  status: ProviderStatus;
}

interface BookmarkFolder {
  id: string;
  title: string;
}

/**
 * Section types for collapsible sections
 */
type SectionType = "titleFormat" | "folderDisplay" | "filters";

export function ProvidersView() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());
  // Section expansion state: Record<providerId, Set<sectionType>>
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<SectionType>>>({});
  const [githubPAT, setGithubPAT] = useState<string>("");
  const [jiraBaseUrl, setJiraBaseUrl] = useState<string>("");
  const [jiraEmail, setJiraEmail] = useState<string>("");
  const [jiraApiToken, setJiraApiToken] = useState<string>("");
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderCreationProviderId, setFolderCreationProviderId] = useState<string | null>(null);
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
            titleFormat: providerData?.config?.titleFormat ?? DEFAULT_TITLE_FORMAT,
            folderTitleFormat:
              providerData?.config?.folderTitleFormat ?? DEFAULT_FOLDER_TITLE_FORMAT,
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

  // Handle title format changes
  const handleTitleFormatChange = async (
    providerId: string,
    updates: Partial<TitleFormatOptions>,
  ) => {
    try {
      const storage = StorageManager.getInstance();
      const providerData = await storage.getProvider(providerId);

      if (!providerData) {
        throw new Error(`Provider ${providerId} not found`);
      }

      // Get current title format or use defaults
      const currentTitleFormat = providerData.config?.titleFormat ?? DEFAULT_TITLE_FORMAT;

      // Merge updates with current title format
      const updatedTitleFormat = {
        ...currentTitleFormat,
        ...updates,
      };

      // Update provider data with new title format
      const updatedData = {
        ...providerData,
        config: {
          ...providerData.config,
          titleFormat: updatedTitleFormat,
        },
      };

      await storage.saveProvider(providerId, updatedData);

      // Update local state
      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, titleFormat: updatedTitleFormat } : p)),
      );

      logger.info(`Provider ${providerId} title format updated`, { updates });
    } catch (err) {
      logger.error(`Failed to update title format for ${providerId}`, err as Error);
      setError(err instanceof Error ? err.message : "Failed to update title format");
    }
  };

  const handleFolderTitleFormatChange = async (
    providerId: string,
    updates: Partial<FolderTitleFormatOptions>,
  ) => {
    try {
      const storage = StorageManager.getInstance();
      const providerData = await storage.getProvider(providerId);

      if (!providerData) {
        throw new Error(`Provider ${providerId} not found`);
      }

      // Get current folder title format or use defaults
      const currentFolderTitleFormat =
        providerData.config?.folderTitleFormat ?? DEFAULT_FOLDER_TITLE_FORMAT;

      // Merge updates with current folder title format
      const updatedFolderTitleFormat = {
        ...currentFolderTitleFormat,
        ...updates,
      };

      // Update provider data with new folder title format
      const updatedData = {
        ...providerData,
        config: {
          ...providerData.config,
          folderTitleFormat: updatedFolderTitleFormat,
        },
      };

      await storage.saveProvider(providerId, updatedData);

      // Update local state
      setProviders((prev) =>
        prev.map((p) =>
          p.id === providerId ? { ...p, folderTitleFormat: updatedFolderTitleFormat } : p,
        ),
      );

      logger.info(`Provider ${providerId} folder title format updated`, { updates });
    } catch (err) {
      logger.error(`Failed to update folder title format for ${providerId}`, err as Error);
      setError(err instanceof Error ? err.message : "Failed to update folder title format");
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

  // Toggle collapsible section expansion
  const handleToggleSection = (providerId: string, section: SectionType) => {
    setExpandedSections((prev) => {
      const providerSections = prev[providerId] || new Set<SectionType>();
      const next = new Set(providerSections);

      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }

      return {
        ...prev,
        [providerId]: next,
      };
    });
  };

  // Helper: Count enabled title format options
  const countTitleFormatOptions = (config: ProviderConfig): number => {
    const options = config.titleFormat || DEFAULT_TITLE_FORMAT;
    let count = 0;
    if (options.includeStatus) count++;
    if (options.includeCreator) count++;
    if (options.includeAssignee) count++;
    if (options.includeAge) count++;
    if (options.includePriority) count++;
    if (options.includeReviewStatus) count++;
    return count;
  };

  // Helper: Generate title format preview text
  const getTitleFormatPreview = (config: ProviderConfig): string => {
    const count = countTitleFormatOptions(config);
    return count === 0 ? "No options enabled" : `${count} option${count === 1 ? "" : "s"} enabled`;
  };

  // Helper: Generate folder display preview text
  const getFolderDisplayPreview = (config: ProviderConfig): string => {
    const folderFormat = config.folderTitleFormat || DEFAULT_FOLDER_TITLE_FORMAT;
    if (!folderFormat.enabled) {
      return "Static folder names";
    }

    const parts: string[] = [];
    if (folderFormat.includeReviewCount) parts.push("review count");
    if (folderFormat.includeTotal) parts.push("total count");

    return parts.length > 0 ? `Showing ${parts.join(" • ")}` : "Dynamic titles enabled";
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

      // Get the bookmark tree to find the appropriate parent folder
      const tree = await browser.bookmarks.getTree();

      // Find "Other Bookmarks" (Chrome: id="2") or "Unfiled Bookmarks" (Firefox: id="unfiled_____")
      // We'll use the first root node's ID if we can't find a specific one
      let parentId = tree[0]?.id || "1"; // Default to root or toolbar

      // Try to find "Other Bookmarks" (Chrome) or "Unfiled Bookmarks" (Firefox)
      const findUnfiledFolder = (nodes: browser.Bookmarks.BookmarkTreeNode[]): string | null => {
        for (const node of nodes) {
          // Firefox uses "unfiled_____" as the ID for unfiled bookmarks
          if (node.id === "unfiled_____" || node.title === "Unfiled Bookmarks") {
            return node.id;
          }
          // Chrome uses "2" for "Other Bookmarks"
          if (node.id === "2" || node.title === "Other Bookmarks") {
            return node.id;
          }
          // Recursively search children
          if (node.children) {
            const found = findUnfiledFolder(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const unfiledId = findUnfiledFolder(tree);
      if (unfiledId) {
        parentId = unfiledId;
      }

      // Create folder
      const newFolder = await browser.bookmarks.create({
        parentId,
        title: newFolderName.trim(),
      });

      logger.info(`Created new folder: ${newFolder.title}`, { id: newFolder.id, parentId });

      // Refresh folder list
      await fetchFolders();

      // Auto-select the newly created folder for the provider that initiated the dialog
      if (folderCreationProviderId) {
        await handleFolderChange(folderCreationProviderId, newFolder.id);
        logger.info(`Auto-selected new folder for provider ${folderCreationProviderId}`, {
          folderId: newFolder.id,
        });
      }

      // Close dialog and reset state
      setCreateFolderDialogOpen(false);
      setNewFolderName("");
      setFolderCreationProviderId(null);
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
        // Refresh provider status from registry to get updated authenticated state
        const registry = ProviderRegistry.getInstance();
        await registry.refreshProviderStatus(providerId);

        // Update local state with the refreshed status
        const status = registry.getProviderStatus(providerId);

        setProviders((prev) =>
          prev.map((p) => {
            if (p.id === providerId) {
              return {
                ...p,
                authenticated: status?.authenticated ?? true,
                status: status || p.status,
              };
            }
            return p;
          }),
        );

        logger.info(`Provider ${providerId} connection successful`, {
          authenticated: status?.authenticated,
        });
      }
    } catch (err) {
      logger.error(`Failed to connect provider ${providerId}`, err as Error);
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  // Disconnect provider
  const handleDisconnect = async (providerId: string) => {
    try {
      logger.info(`Disconnecting provider ${providerId}`);

      // Clear authentication via auth manager
      const authManager = (await import("@/services/auth-manager")).authManager;
      await authManager.revokeAuth(providerId);

      // Refresh provider status
      const registry = ProviderRegistry.getInstance();
      await registry.refreshProviderStatus(providerId);
      const status = registry.getProviderStatus(providerId);

      // Update local state
      setProviders((prev) =>
        prev.map((p) => {
          if (p.id === providerId) {
            return {
              ...p,
              authenticated: false,
              enabled: false, // Disable when disconnected
              status: status || p.status,
            };
          }
          return p;
        }),
      );

      logger.info(`Provider ${providerId} disconnected successfully`);
    } catch (err) {
      logger.error(`Failed to disconnect provider ${providerId}`, err as Error);
      setError(err instanceof Error ? err.message : "Disconnect failed");
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
      <Typography variant="h5" component="h1" gutterBottom>
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
                          onClick={() => {
                            setFolderCreationProviderId(provider.id);
                            setCreateFolderDialogOpen(true);
                          }}
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
                  )}
                  {/* Title Format Options */}
                  {provider.authenticated && provider.folderId && provider.titleFormat && (
                    <Box sx={{ mb: 2 }}>
                      <CollapsibleSection
                        title="Bookmark Title Formatting"
                        subtitle={getTitleFormatPreview(provider)}
                        icon={<Settings fontSize="small" />}
                        expanded={(expandedSections[provider.id] || new Set()).has("titleFormat")}
                        onToggle={() => handleToggleSection(provider.id, "titleFormat")}
                        badge={countTitleFormatOptions(provider)}
                        disabled={!provider.enabled}
                      >
                        <Stack spacing={2}>
                          {/* Status indicator */}
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={provider.titleFormat.includeStatus}
                                  onChange={(e) =>
                                    handleTitleFormatChange(provider.id, {
                                      includeStatus: e.target.checked,
                                    })
                                  }
                                  disabled={!provider.enabled}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    Status indicator{" "}
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {provider.titleFormat.includeEmojis
                                        ? "(🟢 🟡 🔴 ⚫)"
                                        : "([OPEN] [DRAFT] [CLOSED])"}
                                    </Typography>
                                  </Typography>
                                </Box>
                              }
                            />
                            <FormHelperText sx={{ mt: 0, ml: 4 }}>
                              {provider.id === "github"
                                ? "Shows PR state: open & ready (🟢), draft (🟡), conflicts/blocked (🔴), merged (⚫), or closed (🔴)"
                                : "Shows issue type: bug (🐛), story (📖), task (✅), epic (📚), improvement (⚡), or subtask (📝)"}
                            </FormHelperText>
                          </Box>

                          {/* Review status (GitHub only) */}
                          {provider.id === "github" && (
                            <Box>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={provider.titleFormat.includeReviewStatus}
                                    onChange={(e) =>
                                      handleTitleFormatChange(provider.id, {
                                        includeReviewStatus: e.target.checked,
                                      })
                                    }
                                    disabled={!provider.enabled}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">
                                      Review status{" "}
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {provider.titleFormat.includeEmojis
                                          ? "(✅ no reviews, 👁️ pending)"
                                          : "([2 REVIEWS])"}
                                      </Typography>
                                    </Typography>
                                  </Box>
                                }
                              />
                              <FormHelperText sx={{ mt: 0, ml: 4 }}>
                                Shows whether reviewers are requested: checkmark when none
                                requested, eye icon with count when pending
                              </FormHelperText>
                            </Box>
                          )}

                          {/* Priority (Jira only) */}
                          {provider.id === "jira" && (
                            <Box>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={provider.titleFormat.includePriority}
                                    onChange={(e) =>
                                      handleTitleFormatChange(provider.id, {
                                        includePriority: e.target.checked,
                                      })
                                    }
                                    disabled={!provider.enabled}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">
                                      Priority{" "}
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {provider.titleFormat.includeEmojis
                                          ? "(🔴 High, 🟡 Medium, 🟢 Low)"
                                          : "([P1] [P2] [P3])"}
                                      </Typography>
                                    </Typography>
                                  </Box>
                                }
                              />
                              <FormHelperText sx={{ mt: 0, ml: 4 }}>
                                Shows the issue's priority level: highest (🔴), high (🟠), medium
                                (🟡), low (🟢), or lowest (🔵)
                              </FormHelperText>
                            </Box>
                          )}

                          {/* Creator */}
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={provider.titleFormat.includeCreator}
                                  onChange={(e) =>
                                    handleTitleFormatChange(provider.id, {
                                      includeCreator: e.target.checked,
                                    })
                                  }
                                  disabled={!provider.enabled}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    Creator{" "}
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      (@username)
                                    </Typography>
                                  </Typography>
                                </Box>
                              }
                            />
                            <FormHelperText sx={{ mt: 0, ml: 4 }}>
                              {provider.id === "github"
                                ? "Shows who created the PR (@username:). For PRs with assignees different from the creator, also shows assignee (→@username)"
                                : "Shows who created the issue (@username:)"}
                            </FormHelperText>
                          </Box>

                          {/* Assignee (Jira only) */}
                          {provider.id === "jira" && (
                            <Box>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={provider.titleFormat.includeAssignee}
                                    onChange={(e) =>
                                      handleTitleFormatChange(provider.id, {
                                        includeAssignee: e.target.checked,
                                      })
                                    }
                                    disabled={!provider.enabled}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography variant="body2">
                                      Assignee{" "}
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        (→@username if different from creator)
                                      </Typography>
                                    </Typography>
                                  </Box>
                                }
                              />
                              <FormHelperText sx={{ mt: 0, ml: 4 }}>
                                Shows who the issue is assigned to (→@username). Only displayed when
                                assignee differs from creator, or shows "→@unassigned" if no one is
                                assigned
                              </FormHelperText>
                            </Box>
                          )}

                          {/* Age */}
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={provider.titleFormat.includeAge}
                                  onChange={(e) =>
                                    handleTitleFormatChange(provider.id, {
                                      includeAge: e.target.checked,
                                    })
                                  }
                                  disabled={!provider.enabled}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    Age{" "}
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {provider.titleFormat.includeEmojis
                                        ? "(⏰ 10d for items 7+ days old)"
                                        : "([10d] days since created)"}
                                    </Typography>
                                  </Typography>
                                </Box>
                              }
                            />
                            <FormHelperText sx={{ mt: 0, ml: 4 }}>
                              Shows how many days since the item was created. Clock emoji (⏰)
                              appears for items 7+ days old when emojis enabled
                            </FormHelperText>
                          </Box>

                          {/* Emoji toggle */}
                          <Divider sx={{ my: 1 }} />
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={provider.titleFormat.includeEmojis}
                                  onChange={(e) =>
                                    handleTitleFormatChange(provider.id, {
                                      includeEmojis: e.target.checked,
                                    })
                                  }
                                  disabled={!provider.enabled}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    Use emojis instead of text labels
                                  </Typography>
                                </Box>
                              }
                            />
                            <FormHelperText sx={{ mt: 0, ml: 4 }}>
                              When enabled, uses visual icons (🟢 ✅ @user:) instead of text labels
                              ([OPEN] [NO REVIEWS] @user:)
                            </FormHelperText>
                          </Box>
                        </Stack>
                      </CollapsibleSection>
                    </Box>
                  )}

                  {/* Folder Display Options */}
                  {provider.authenticated && provider.folderId && provider.folderTitleFormat && (
                    <Box sx={{ mb: 2 }}>
                      <CollapsibleSection
                        title="Folder Display Options"
                        subtitle={getFolderDisplayPreview(provider)}
                        icon={<Settings fontSize="small" />}
                        expanded={(expandedSections[provider.id] || new Set()).has("folderDisplay")}
                        onToggle={() => handleToggleSection(provider.id, "folderDisplay")}
                        disabled={!provider.enabled}
                      >
                        <Stack spacing={2}>
                          {/* Enable dynamic folder titles */}
                          <Box>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={provider.folderTitleFormat.enabled}
                                  onChange={(e) =>
                                    handleFolderTitleFormatChange(provider.id, {
                                      enabled: e.target.checked,
                                    })
                                  }
                                  disabled={!provider.enabled}
                                  size="small"
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2">
                                    Update folder name with live counts
                                  </Typography>
                                </Box>
                              }
                            />
                            <FormHelperText sx={{ mt: 0, ml: 4 }}>
                              Automatically updates the bookmark folder name to show current
                              statistics
                            </FormHelperText>
                          </Box>

                          {/* Conditional options (only when enabled) */}
                          {provider.folderTitleFormat.enabled && (
                            <>
                              {/* Total count */}
                              <Box sx={{ ml: 2 }}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={provider.folderTitleFormat.includeTotal}
                                      onChange={(e) =>
                                        handleFolderTitleFormatChange(provider.id, {
                                          includeTotal: e.target.checked,
                                        })
                                      }
                                      disabled={!provider.enabled}
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography variant="body2">
                                        Total item count{" "}
                                        <Typography
                                          component="span"
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          (24 total)
                                        </Typography>
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <FormHelperText sx={{ mt: 0, ml: 4 }}>
                                  Shows the total number of items in the folder
                                </FormHelperText>
                              </Box>

                              {/* Review count (GitHub only) */}
                              {provider.id === "github" && (
                                <Box sx={{ ml: 2 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={provider.folderTitleFormat.includeReviewCount}
                                        onChange={(e) =>
                                          handleFolderTitleFormatChange(provider.id, {
                                            includeReviewCount: e.target.checked,
                                          })
                                        }
                                        disabled={!provider.enabled}
                                        size="small"
                                      />
                                    }
                                    label={
                                      <Box>
                                        <Typography variant="body2">
                                          Items awaiting your review{" "}
                                          <Typography
                                            component="span"
                                            variant="caption"
                                            color="text.secondary"
                                          >
                                            (3 review)
                                          </Typography>
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                  <FormHelperText sx={{ mt: 0, ml: 4 }}>
                                    Shows how many PRs are waiting for your review (where you're
                                    explicitly requested as a reviewer)
                                  </FormHelperText>
                                </Box>
                              )}
                            </>
                          )}
                        </Stack>
                      </CollapsibleSection>
                    </Box>
                  )}

                  {/* Last sync info */}
                  {provider.lastSync && (
                    <Typography variant="caption" color="text.secondary">
                      Last synced: {new Date(provider.lastSync).toLocaleString()}
                    </Typography>
                  )}
                  {/* Provider-specific settings */}
                  {provider.id === "github" && (
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
                          {provider.authenticated ? "Token Management" : "Advanced Settings"}
                        </Typography>
                      </Box>

                      <Collapse in={expandedSettings.has(provider.id)}>
                        <Stack spacing={2} mt={1}>
                          {!provider.authenticated && (
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
                          )}
                          {provider.authenticated && (
                            <Alert severity="success" sx={{ fontSize: "0.875rem" }}>
                              Token is active. To update or replace your token, enter a new one
                              below and save.
                            </Alert>
                          )}
                          <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label="Personal Access Token"
                            placeholder="ghp_..."
                            value={githubPAT}
                            onChange={(e) => setGithubPAT(e.target.value)}
                            helperText={
                              provider.authenticated
                                ? "Enter a new token to update the existing one"
                                : "This token will be stored securely in your browser"
                            }
                          />
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleSaveGitHubPAT}
                              disabled={!githubPAT.trim()}
                              startIcon={<Settings />}
                              sx={{ flex: 1 }}
                            >
                              Save Token
                            </Button>
                            {provider.authenticated && (
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleDisconnect(provider.id)}
                                sx={{ flex: 1 }}
                              >
                                Disconnect
                              </Button>
                            )}
                          </Box>
                        </Stack>
                      </Collapse>
                    </Box>
                  )}
                  {/* Jira API Token Configuration */}
                  {provider.id === "jira" && (
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
                          {provider.authenticated ? "Token Management" : "API Token Configuration"}
                        </Typography>
                      </Box>

                      <Collapse in={expandedSettings.has(provider.id)}>
                        <Stack spacing={2} mt={1}>
                          {provider.authenticated ? (
                            <Alert severity="success" sx={{ fontSize: "0.875rem" }}>
                              Your Jira API token is active. You can update it below or disconnect
                              to enter new credentials.
                            </Alert>
                          ) : (
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
                          )}
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
                            helperText={
                              provider.authenticated
                                ? "Update your token here or disconnect to clear"
                                : "This token will be stored securely in your browser"
                            }
                          />
                          <Box display="flex" gap={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleSaveJiraConfig}
                              disabled={
                                !jiraBaseUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()
                              }
                              startIcon={<Settings />}
                            >
                              {provider.authenticated
                                ? "Update Configuration"
                                : "Save Configuration"}
                            </Button>
                            {provider.authenticated && (
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleDisconnect(provider.id)}
                              >
                                Disconnect
                              </Button>
                            )}
                          </Box>
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
                      disabled={authenticating[provider.id]}
                      startIcon={
                        authenticating[provider.id] ? <CircularProgress size={16} /> : undefined
                      }
                    >
                      {authenticating[provider.id] ? "Connecting..." : "Connect"}
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
          setFolderCreationProviderId(null);
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
              setFolderCreationProviderId(null);
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
