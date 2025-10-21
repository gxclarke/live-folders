import { Launch, Search } from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  CardContent,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { ProviderIcon } from "@/components/ProviderIcon";
import { ItemsListSkeleton } from "@/components/Skeletons";
import { BookmarkManager } from "@/services/bookmark-manager";
import { ProviderRegistry } from "@/services/provider-registry";
import { StorageManager } from "@/services/storage";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";

const logger = new Logger("ItemsView");

interface BookmarkItemDisplay {
  bookmarkId: string;
  itemId: string;
  title: string;
  url: string;
  providerId: string;
  providerName: string;
  metadata?: {
    type?: string;
    state?: string;
    repository?: string;
    labels?: string[];
  };
  lastUpdated: number;
}

export function ItemsView() {
  const [items, setItems] = useState<BookmarkItemDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load all bookmarks from all providers
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);

        const storage = StorageManager.getInstance();
        const registry = ProviderRegistry.getInstance();
        const bookmarkManager = BookmarkManager.getInstance();

        // Get all provider data
        const providersData = await storage.getProviders();
        const bookmarksData = await storage.getAllBookmarkMetadata();

        const allItems: BookmarkItemDisplay[] = [];

        // Process each provider
        for (const [providerId, providerData] of Object.entries(providersData)) {
          if (!providerData.folderId) continue;

          const provider = registry.getProvider(providerId);
          if (!provider) continue;

          const providerBookmarks = bookmarksData[providerId] || {};

          // Get folder contents
          const folderContents = await bookmarkManager.getFolderContents(providerData.folderId);

          // Map bookmarks to display items
          for (const bookmark of folderContents) {
            if (bookmark.url) {
              // Find metadata for this bookmark
              const metadataRecord = Object.values(providerBookmarks).find(
                (record) => record.bookmarkId === bookmark.id,
              );

              // Get browser bookmark to get full metadata
              const browserBookmark = await browser.bookmarks.get(bookmark.id);
              const fullBookmark = browserBookmark[0];

              // Use provider timestamps if available, fallback to browser bookmark date
              const displayTimestamp =
                metadataRecord?.updatedAt || // Provider update time
                metadataRecord?.createdAt || // Provider creation time
                fullBookmark.dateAdded || // Browser bookmark creation time
                Date.now(); // Current time as last resort

              allItems.push({
                bookmarkId: bookmark.id,
                itemId: metadataRecord?.itemId || bookmark.id,
                title: fullBookmark.title || "Untitled",
                url: fullBookmark.url || "",
                providerId,
                providerName: provider.metadata.name,
                metadata: {
                  type: undefined, // TODO: Extract from bookmark metadata storage
                  state: undefined,
                  repository: undefined,
                  labels: undefined,
                },
                lastUpdated: displayTimestamp,
              });
            }
          }
        }

        // Sort by last updated (newest first)
        allItems.sort((a, b) => b.lastUpdated - a.lastUpdated);

        setItems(allItems);
        logger.info(`Loaded ${allItems.length} items`);
      } catch (err) {
        logger.error("Failed to load items", err as Error);
        setError(err instanceof Error ? err.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) {
      return "just now";
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}w ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(days / 365);
    return `${years}y ago`;
  };

  // Filter items by search query and sort by last updated (most recent first)
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query) ||
          item.providerName.toLowerCase().includes(query) ||
          item.metadata?.type?.toLowerCase().includes(query) ||
          item.metadata?.state?.toLowerCase().includes(query) ||
          item.metadata?.repository?.toLowerCase().includes(query),
      );
    }

    // Sort by last updated (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return dateB - dateA;
    });
  }, [items, searchQuery]); // Open bookmark URL
  const handleOpenItem = (url: string) => {
    chrome.tabs.create({ url });
  };

  // Render loading state
  if (loading) {
    return <ItemsListSkeleton />;
  }

  // Render error state
  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ width: "100%", overflow: "hidden" }}>
      <Box>
        <Typography variant="h5" component="h1" gutterBottom>
          Synced Items
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All bookmarks synced from your providers
        </Typography>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search items..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Items count */}
      <Typography variant="body2" color="text.secondary">
        {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
        {searchQuery && ` (filtered from ${items.length})`}
      </Typography>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <Alert severity="info">
          {searchQuery ? "No items match your search" : "No items synced yet"}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {filteredItems.map((item) => (
            <Card
              key={item.bookmarkId}
              variant="outlined"
              sx={{
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
              onClick={() => handleOpenItem(item.url)}
            >
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Box display="flex" alignItems="center" gap={1.5} width="100%">
                  {/* Provider icon */}
                  <ProviderIcon providerId={item.providerId} sx={{ fontSize: 20, flexShrink: 0 }} />

                  {/* Content */}
                  <Box flex={1} minWidth={0} overflow="hidden">
                    {/* Title */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        mb: 0.5,
                      }}
                    >
                      {item.title}
                    </Typography>

                    {/* Last updated */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "block",
                      }}
                    >
                      {formatTimeAgo(new Date(item.lastUpdated))}
                    </Typography>
                  </Box>

                  {/* Open icon */}
                  <Launch
                    fontSize="small"
                    sx={{
                      color: "action.active",
                      flexShrink: 0,
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
