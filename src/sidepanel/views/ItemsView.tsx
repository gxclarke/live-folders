import { Launch, Search } from "@mui/icons-material";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	IconButton,
	InputAdornment,
	Link,
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
								lastUpdated: metadataRecord?.lastUpdated || Date.now(),
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

	// Filter items based on search query
	const filteredItems = useMemo(() => {
		if (!searchQuery.trim()) return items;

		const query = searchQuery.toLowerCase();
		return items.filter(
			(item) =>
				item.title.toLowerCase().includes(query) ||
				item.url.toLowerCase().includes(query) ||
				item.providerName.toLowerCase().includes(query) ||
				item.metadata?.repository?.toLowerCase().includes(query),
		);
	}, [items, searchQuery]);

	// Open bookmark URL
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
		<Stack spacing={3}>
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
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					{filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
					{searchQuery && ` (filtered from ${items.length})`}
				</Typography>
			</Box>

			{/* Items list */}
			{filteredItems.length === 0 ? (
				<Alert severity="info">
					{searchQuery ? "No items match your search" : "No items synced yet"}
				</Alert>
			) : (
				<Stack spacing={2}>
					{filteredItems.map((item) => (
						<Card key={item.bookmarkId} variant="outlined">
							<CardContent>
								<Box display="flex" alignItems="flex-start" gap={2}>
									{/* Provider icon */}
									<Box mt={0.5}>
										<ProviderIcon
											providerId={item.providerId as "github" | "jira"}
											sx={{ fontSize: 24 }}
										/>
									</Box>

									{/* Content */}
									<Box flex={1} minWidth={0}>
										{/* Title */}
										<Link
											href={item.url}
											onClick={(e) => {
												e.preventDefault();
												handleOpenItem(item.url);
											}}
											sx={{
												color: "text.primary",
												textDecoration: "none",
												"&:hover": {
													textDecoration: "underline",
												},
												display: "block",
												mb: 0.5,
											}}
										>
											<Typography
												variant="subtitle1"
												component="span"
												sx={{
													fontWeight: 500,
													overflow: "hidden",
													textOverflow: "ellipsis",
													display: "-webkit-box",
													WebkitLineClamp: 2,
													WebkitBoxOrient: "vertical",
												}}
											>
												{item.title}
											</Typography>
										</Link>

										{/* URL */}
										<Typography
											variant="caption"
											color="text.secondary"
											sx={{
												display: "block",
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												mb: 1,
											}}
										>
											{item.url}
										</Typography>

										{/* Metadata */}
										<Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
											<Chip label={item.providerName} size="small" variant="outlined" />
											{item.metadata?.type && (
												<Chip
													label={item.metadata.type}
													size="small"
													variant="outlined"
													color="primary"
												/>
											)}
											{item.metadata?.state && (
												<Chip
													label={item.metadata.state}
													size="small"
													variant="outlined"
													color="secondary"
												/>
											)}
											{item.metadata?.repository && (
												<Chip label={item.metadata.repository} size="small" variant="outlined" />
											)}
										</Box>
									</Box>

									{/* Open button */}
									<IconButton
										size="small"
										onClick={() => handleOpenItem(item.url)}
										aria-label="Open in new tab"
									>
										<Launch fontSize="small" />
									</IconButton>
								</Box>
							</CardContent>
						</Card>
					))}
				</Stack>
			)}
		</Stack>
	);
}
