/**
 * Sync Engine
 * Orchestrates synchronization between providers and bookmarks
 */

import type { BookmarkItem, BookmarkRecord } from "@/types";
import { Logger } from "@/utils/logger";
import { BookmarkManager, type BookmarkNode } from "./bookmark-manager";
import { NotificationType, notificationService } from "./notification-service";
import { ProviderRegistry } from "./provider-registry";
import { StorageManager } from "./storage";

const logger = new Logger("SyncEngine");

/**
 * Sync diff result
 */
export interface SyncDiff {
  toAdd: BookmarkItem[];
  toUpdate: UpdateItem[];
  toDelete: string[]; // Bookmark IDs
}

/**
 * Item to update
 */
export interface UpdateItem {
  bookmarkId: string;
  oldItem: BookmarkItem;
  newItem: BookmarkItem;
}

/**
 * Sync result
 */
export interface SyncResult {
  providerId: string;
  success: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeleted: number;
  error?: string;
  duration: number; // milliseconds
}

/**
 * Sync Engine Service
 * Calculates diffs and orchestrates synchronization
 */
export class SyncEngine {
  private static instance: SyncEngine;
  private providerRegistry: ProviderRegistry;
  private bookmarkManager: BookmarkManager;
  private storage: StorageManager;

  private constructor() {
    this.providerRegistry = ProviderRegistry.getInstance();
    this.bookmarkManager = BookmarkManager.getInstance();
    this.storage = StorageManager.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  /**
   * Sync all enabled providers
   */
  public async syncAll(): Promise<SyncResult[]> {
    logger.info("Starting sync for all providers");
    const startTime = Date.now();

    const providers = this.providerRegistry.getAllProviders();
    const results: SyncResult[] = [];

    for (const provider of providers) {
      const status = this.providerRegistry.getProviderStatus(provider.metadata.id);

      // Only sync if enabled and authenticated
      if (status?.enabled && status?.authenticated) {
        const result = await this.syncProvider(provider.metadata.id);
        results.push(result);
      } else {
        logger.debug(
          `Skipping ${provider.metadata.id}: enabled=${status?.enabled}, auth=${status?.authenticated}`,
        );
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;

    logger.info(
      `Sync completed: ${successCount}/${results.length} providers succeeded in ${duration}ms`,
    );

    return results;
  }

  /**
   * Sync single provider
   */
  public async syncProvider(providerId: string): Promise<SyncResult> {
    const startTime = Date.now();
    logger.info(`Starting sync for provider: ${providerId}`);

    try {
      // 1. Get provider config (folder ID)
      const providerData = await this.storage.getProvider(providerId);
      if (!providerData?.folderId) {
        throw new Error(`Provider ${providerId} has no folder configured`);
      }

      // 2. Verify folder exists
      const folder = await this.bookmarkManager.getFolder(providerData.folderId);
      if (!folder) {
        throw new Error(`Folder ${providerData.folderId} not found`);
      }

      // 3. Fetch items from provider
      logger.debug(`Fetching items from ${providerId}`);
      const items = await this.providerRegistry.fetchProviderItems(providerId);
      logger.debug(`Fetched ${items.length} items from ${providerId}`);

      // 4. Calculate diff
      const diff = await this.calculateDiff(providerData.folderId, items);
      logger.debug(`Diff: +${diff.toAdd.length} ~${diff.toUpdate.length} -${diff.toDelete.length}`);

      // 5. Apply changes
      const sortOrder = providerData.config?.sortOrder || "alphabetical";
      await this.applyChanges(providerId, providerData.folderId, diff, sortOrder);

      // 6. Reorder all bookmarks in the folder according to sort preference
      await this.bookmarkManager.reorderFolder(providerData.folderId, items, sortOrder);

      // 7. Update folder title with statistics (if enabled)
      await this.updateFolderTitle(providerId, folder.title, items);

      // 8. Update metadata
      await this.setLastSyncTime(providerId, Date.now());

      const duration = Date.now() - startTime;
      logger.info(`Sync completed for ${providerId} in ${duration}ms`);

      // 8. Send success notification if enabled
      const settings = await this.storage.getSettings();
      logger.debug(
        `Notification settings: enableNotifications=${settings.enableNotifications}, notifyOnSuccess=${settings.notifyOnSuccess}`,
      );

      if (settings.enableNotifications && settings.notifyOnSuccess) {
        const provider = this.providerRegistry.getProvider(providerId);
        const providerName = provider?.metadata.name || providerId;
        const totalChanges = diff.toAdd.length + diff.toUpdate.length + diff.toDelete.length;

        if (totalChanges > 0) {
          const parts: string[] = [];
          if (diff.toAdd.length > 0) parts.push(`${diff.toAdd.length} added`);
          if (diff.toUpdate.length > 0) parts.push(`${diff.toUpdate.length} updated`);
          if (diff.toDelete.length > 0) parts.push(`${diff.toDelete.length} removed`);

          logger.debug(`Sending success notification: ${providerName} - ${parts.join(", ")}`);
          await notificationService.notify({
            type: NotificationType.SYNC_SUCCESS,
            title: `${providerName} synced successfully`,
            message: parts.join(", "),
            providerId,
          });
        } else {
          logger.debug(`Sending success notification: ${providerName} - No changes`);
          await notificationService.notify({
            type: NotificationType.SYNC_SUCCESS,
            title: `${providerName} synced successfully`,
            message: "No changes",
            providerId,
          });
        }
      } else {
        logger.debug("Success notifications disabled - skipping notification");
      }

      return {
        providerId,
        success: true,
        itemsAdded: diff.toAdd.length,
        itemsUpdated: diff.toUpdate.length,
        itemsDeleted: diff.toDelete.length,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logger.error(`Sync failed for ${providerId}:`, error);

      // Send error notification if enabled
      const settings = await this.storage.getSettings();
      if (settings.enableNotifications && settings.notifyOnError) {
        const provider = this.providerRegistry.getProvider(providerId);
        const providerName = provider?.metadata.name || providerId;

        await notificationService.notify({
          type: NotificationType.SYNC_ERROR,
          title: `${providerName} sync failed`,
          message: errorMessage,
          providerId,
        });
      }

      return {
        providerId,
        success: false,
        itemsAdded: 0,
        itemsUpdated: 0,
        itemsDeleted: 0,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Calculate diff between current bookmarks and fetched items
   */
  public async calculateDiff(folderId: string, fetchedItems: BookmarkItem[]): Promise<SyncDiff> {
    // 1. Get current bookmarks from folder
    const currentBookmarks = await this.bookmarkManager.getFolderContents(folderId);

    // 2. Build lookup maps (using URL as key)
    const currentMap = new Map<string, BookmarkNode>();
    for (const bookmark of currentBookmarks) {
      if (bookmark.url) {
        currentMap.set(bookmark.url, bookmark);
      }
    }

    const fetchedMap = new Map<string, BookmarkItem>();
    for (const item of fetchedItems) {
      fetchedMap.set(item.url, item);
    }

    // 3. Find items to add (in fetched, not in current)
    const toAdd = fetchedItems.filter((item) => !currentMap.has(item.url));

    // 4. Find items to delete (in current, not in fetched)
    const toDelete = currentBookmarks
      .filter((bookmark) => bookmark.url && !fetchedMap.has(bookmark.url))
      .map((bookmark) => bookmark.id);

    // 5. Find items to update (in both, but title changed)
    const toUpdate: UpdateItem[] = [];
    for (const [url, item] of fetchedMap) {
      const current = currentMap.get(url);
      if (current?.url && current.title !== item.title) {
        toUpdate.push({
          bookmarkId: current.id,
          oldItem: {
            id: current.id,
            providerId: item.providerId,
            title: current.title,
            url: current.url,
          },
          newItem: item,
        });
      }
    }

    return { toAdd, toUpdate, toDelete };
  }

  /**
   * Apply changes to bookmarks
   */
  public async applyChanges(
    providerId: string,
    folderId: string,
    diff: SyncDiff,
    sortOrder: "alphabetical" | "created" | "updated" = "alphabetical",
  ): Promise<void> {
    // Delete first (free up space)
    if (diff.toDelete.length > 0) {
      logger.debug(`Deleting ${diff.toDelete.length} bookmarks`);
      await this.bookmarkManager.batchDelete(diff.toDelete);
    }

    // Then update
    if (diff.toUpdate.length > 0) {
      logger.debug(`Updating ${diff.toUpdate.length} bookmarks`);
      const updates = diff.toUpdate.map((item) => ({
        bookmarkId: item.bookmarkId,
        changes: { title: item.newItem.title },
      }));
      await this.bookmarkManager.batchUpdate(updates);

      // Update metadata timestamps for updated items
      const existingMetadata = await this.storage.getBookmarkMetadata(providerId);
      for (const updateItem of diff.toUpdate) {
        const itemId = updateItem.newItem.id;
        if (existingMetadata[itemId]) {
          existingMetadata[itemId] = {
            ...existingMetadata[itemId],
            lastUpdated: Date.now(),
            createdAt: updateItem.newItem.createdAt,
            updatedAt: updateItem.newItem.updatedAt,
            lastModified: updateItem.newItem.lastModified,
          };
        }
      }
      await this.storage.saveBookmarkMetadata(providerId, existingMetadata);
    }

    // Finally add new items (sorted according to preference)
    if (diff.toAdd.length > 0) {
      logger.debug(`Adding ${diff.toAdd.length} bookmarks (sorted by ${sortOrder})`);
      const bookmarkIds = await this.bookmarkManager.batchCreate(folderId, diff.toAdd, sortOrder);

      // Save bookmark metadata with original timestamps
      if (bookmarkIds.length === diff.toAdd.length) {
        const metadata: { [itemId: string]: BookmarkRecord } = {};

        for (let i = 0; i < diff.toAdd.length; i++) {
          const item = diff.toAdd[i];
          const bookmarkId = bookmarkIds[i];

          metadata[item.id] = {
            itemId: item.id,
            bookmarkId,
            providerId,
            lastUpdated: Date.now(),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            lastModified: item.lastModified,
          };
        }

        await this.storage.saveBookmarkMetadata(providerId, metadata);
        logger.debug(`Saved metadata for ${Object.keys(metadata).length} bookmarks`);
      }
    }

    logger.info(
      `Applied changes: +${diff.toAdd.length} ~${diff.toUpdate.length} -${diff.toDelete.length}`,
    );
  }

  /**
   * Get last sync time for provider
   */
  public async getLastSyncTime(providerId: string): Promise<number | null> {
    try {
      const providerData = await this.storage.getProvider(providerId);
      return providerData?.lastSync ?? null;
    } catch (error) {
      logger.error(`Failed to get last sync time for ${providerId}`, error);
      return null;
    }
  }

  /**
   * Set last sync time for provider
   */
  public async setLastSyncTime(providerId: string, timestamp: number): Promise<void> {
    try {
      const providerData = await this.storage.getProvider(providerId);
      if (providerData) {
        providerData.lastSync = timestamp;
        await this.storage.saveProvider(providerId, providerData);
      }
    } catch (error) {
      logger.error(`Failed to set last sync time for ${providerId}`, error);
    }
  }

  /**
   * Update folder title with dynamic statistics
   */
  private async updateFolderTitle(
    providerId: string,
    currentTitle: string,
    items: BookmarkItem[],
  ): Promise<void> {
    try {
      const provider = this.providerRegistry.getProvider(providerId);
      if (!provider) {
        logger.warn(`Provider ${providerId} not found for folder title update`);
        return;
      }

      // Get the base folder name (remove any existing stats in parentheses)
      const baseName = currentTitle.replace(/\s*\(.*\)\s*$/, "").trim();

      // Format new title using provider's formatting logic
      const newTitle = await provider.formatFolderTitle(baseName, items);

      // Only update if title changed
      if (newTitle !== currentTitle) {
        const providerData = await this.storage.getProvider(providerId);
        if (providerData?.folderId) {
          await this.bookmarkManager.updateBookmark(providerData.folderId, { title: newTitle });
          logger.debug(`Updated folder title: "${currentTitle}" → "${newTitle}"`);
        }
      }
    } catch (error) {
      logger.error(`Failed to update folder title for ${providerId}`, error);
      // Non-fatal error - don't throw, just log
    }
  }
}
