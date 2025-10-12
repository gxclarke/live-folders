/**
 * Bookmark Manager
 * Type-safe wrapper around browser.bookmarks API
 */

import browser from "webextension-polyfill";
import type { BookmarkItem } from "@/types";
import { Logger } from "@/utils/logger";

const logger = new Logger("BookmarkManager");

/**
 * Browser bookmark node interface
 */
export interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkNode[];
}

/**
 * Bookmark Manager Service
 * Manages browser bookmarks with error handling and batch operations
 */
export class BookmarkManager {
  private static instance: BookmarkManager;
  private folderCache: Map<string, string>; // title -> id

  private constructor() {
    this.folderCache = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BookmarkManager {
    if (!BookmarkManager.instance) {
      BookmarkManager.instance = new BookmarkManager();
    }
    return BookmarkManager.instance;
  }

  /**
   * Create a bookmark folder
   */
  public async createFolder(title: string, parentId?: string): Promise<string> {
    try {
      const folder = await browser.bookmarks.create({
        title,
        parentId,
      });

      logger.info(`Created folder: ${title} (${folder.id})`);
      this.folderCache.set(title, folder.id);

      return folder.id;
    } catch (error) {
      logger.error(`Failed to create folder: ${title}`, error);
      throw new Error(
        `Failed to create folder: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get folder by ID
   */
  public async getFolder(folderId: string): Promise<BookmarkNode | null> {
    try {
      const folders = await browser.bookmarks.get(folderId);
      return folders.length > 0 ? (folders[0] as BookmarkNode) : null;
    } catch (error) {
      logger.error(`Failed to get folder: ${folderId}`, error);
      return null;
    }
  }

  /**
   * Find folder by title, create if not found
   */
  public async getFolderByTitle(title: string, parentId?: string): Promise<string> {
    // Check cache first
    if (this.folderCache.has(title)) {
      const cachedId = this.folderCache.get(title);
      if (cachedId) {
        // Verify folder still exists
        const folder = await this.getFolder(cachedId);
        if (folder) {
          return cachedId;
        }
        // Folder was deleted, remove from cache
        this.folderCache.delete(title);
      }
    }

    // Search for folder
    try {
      const results = await browser.bookmarks.search({ title });

      for (const result of results) {
        // Check if it's a folder (no URL) and matches parent
        if (!result.url && (!parentId || result.parentId === parentId)) {
          this.folderCache.set(title, result.id);
          return result.id;
        }
      }

      // Folder not found, create it
      return await this.createFolder(title, parentId);
    } catch (error) {
      logger.error(`Failed to find/create folder: ${title}`, error);
      throw error;
    }
  }

  /**
   * Get all bookmarks in a folder
   */
  public async getFolderContents(folderId: string): Promise<BookmarkNode[]> {
    try {
      const tree = await browser.bookmarks.getSubTree(folderId);

      if (tree.length === 0 || !tree[0].children) {
        return [];
      }

      // Filter out subfolders, return only bookmarks (items with URLs)
      return (tree[0].children as BookmarkNode[]).filter((child) => child.url !== undefined);
    } catch (error) {
      logger.error(`Failed to get folder contents: ${folderId}`, error);
      return [];
    }
  }

  /**
   * Clear all bookmarks in a folder (keeps the folder)
   */
  public async clearFolder(folderId: string): Promise<void> {
    try {
      const contents = await this.getFolderContents(folderId);
      const bookmarkIds = contents.map((item) => item.id);

      if (bookmarkIds.length > 0) {
        await this.batchDelete(bookmarkIds);
        logger.info(`Cleared folder: ${folderId} (${bookmarkIds.length} items)`);
      }
    } catch (error) {
      logger.error(`Failed to clear folder: ${folderId}`, error);
      throw error;
    }
  }

  /**
   * Delete folder and all contents
   */
  public async deleteFolder(folderId: string): Promise<void> {
    try {
      await browser.bookmarks.removeTree(folderId);
      logger.info(`Deleted folder: ${folderId}`);

      // Remove from cache
      for (const [title, id] of this.folderCache.entries()) {
        if (id === folderId) {
          this.folderCache.delete(title);
          break;
        }
      }
    } catch (error) {
      logger.error(`Failed to delete folder: ${folderId}`, error);
      throw error;
    }
  }

  /**
   * Create a bookmark
   */
  public async createBookmark(
    folderId: string,
    item: BookmarkItem,
    index?: number,
  ): Promise<string> {
    try {
      const bookmark = await browser.bookmarks.create({
        parentId: folderId,
        title: item.title,
        url: item.url,
        index, // Optional position in the folder
      });

      logger.debug(`Created bookmark: ${item.title}`);
      return bookmark.id;
    } catch (error) {
      logger.error(`Failed to create bookmark: ${item.title}`, error);
      throw error;
    }
  }

  /**
   * Update a bookmark
   */
  public async updateBookmark(
    bookmarkId: string,
    updates: { title?: string; url?: string },
  ): Promise<void> {
    try {
      await browser.bookmarks.update(bookmarkId, updates);
      logger.debug(`Updated bookmark: ${bookmarkId}`);
    } catch (error) {
      logger.error(`Failed to update bookmark: ${bookmarkId}`, error);
      throw error;
    }
  }

  /**
   * Delete a bookmark
   */
  public async deleteBookmark(bookmarkId: string): Promise<void> {
    try {
      await browser.bookmarks.remove(bookmarkId);
      logger.debug(`Deleted bookmark: ${bookmarkId}`);
    } catch (error) {
      logger.error(`Failed to delete bookmark: ${bookmarkId}`, error);
      throw error;
    }
  }

  /**
   * Get bookmark by ID
   */
  public async getBookmark(bookmarkId: string): Promise<BookmarkNode | null> {
    try {
      const bookmarks = await browser.bookmarks.get(bookmarkId);
      return bookmarks.length > 0 ? (bookmarks[0] as BookmarkNode) : null;
    } catch (error) {
      logger.error(`Failed to get bookmark: ${bookmarkId}`, error);
      return null;
    }
  }

  /**
   * Find bookmark by URL in a folder
   */
  public async findBookmarkByUrl(folderId: string, url: string): Promise<string | null> {
    try {
      const contents = await this.getFolderContents(folderId);
      const bookmark = contents.find((item) => item.url === url);
      return bookmark?.id ?? null;
    } catch (error) {
      logger.error(`Failed to find bookmark by URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Create multiple bookmarks (batch operation)
   */
  public async batchCreate(
    folderId: string,
    items: BookmarkItem[],
    sortOrder: "alphabetical" | "created" | "updated" = "alphabetical",
  ): Promise<string[]> {
    const bookmarkIds: string[] = [];
    const errors: Error[] = [];

    // Sort items based on the sort order
    const sortedItems = [...items].sort((a, b) => {
      switch (sortOrder) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "created":
          return (a.createdAt || 0) - (b.createdAt || 0);
        case "updated":
          return (b.updatedAt || 0) - (a.updatedAt || 0); // Most recent first
        default:
          return 0;
      }
    });

    for (let i = 0; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      try {
        const id = await this.createBookmark(folderId, item, i);
        bookmarkIds.push(id);

        // Small delay to avoid rate limiting (Firefox: ~100 ops/sec)
        if (sortedItems.length > 10) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error("Unknown error"));
      }
    }

    if (errors.length > 0) {
      logger.warn(
        `Batch create completed with ${errors.length} errors out of ${items.length} items`,
      );
    } else {
      logger.info(`Batch created ${bookmarkIds.length} bookmarks (sorted by ${sortOrder})`);
    }

    return bookmarkIds;
  }

  /**
   * Delete multiple bookmarks (batch operation)
   */
  public async batchDelete(bookmarkIds: string[]): Promise<void> {
    const errors: Error[] = [];

    for (const id of bookmarkIds) {
      try {
        await this.deleteBookmark(id);

        // Small delay to avoid rate limiting
        if (bookmarkIds.length > 10) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error("Unknown error"));
      }
    }

    if (errors.length > 0) {
      logger.warn(
        `Batch delete completed with ${errors.length} errors out of ${bookmarkIds.length} items`,
      );
    } else {
      logger.info(`Batch deleted ${bookmarkIds.length} bookmarks`);
    }
  }

  /**
   * Update multiple bookmarks (batch operation)
   */
  public async batchUpdate(
    updates: Array<{
      bookmarkId: string;
      changes: { title?: string; url?: string };
    }>,
  ): Promise<void> {
    const errors: Error[] = [];

    for (const update of updates) {
      try {
        await this.updateBookmark(update.bookmarkId, update.changes);

        // Small delay to avoid rate limiting
        if (updates.length > 10) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error("Unknown error"));
      }
    }

    if (errors.length > 0) {
      logger.warn(
        `Batch update completed with ${errors.length} errors out of ${updates.length} items`,
      );
    } else {
      logger.info(`Batch updated ${updates.length} bookmarks`);
    }
  }

  /**
   * Reorder all bookmarks in a folder according to sort order
   */
  public async reorderFolder(
    folderId: string,
    items: BookmarkItem[],
    sortOrder: "alphabetical" | "created" | "updated" = "alphabetical",
  ): Promise<void> {
    try {
      // Get current bookmarks in the folder
      const currentBookmarks = await this.getFolderContents(folderId);

      // Create a map of URL -> BookmarkItem for quick lookup
      const itemMap = new Map(items.map((item) => [item.url, item]));

      // Build a list of bookmarks with their metadata
      const bookmarksWithMetadata = currentBookmarks
        .filter((bookmark) => bookmark.url && itemMap.has(bookmark.url))
        .map((bookmark) => {
          const item = itemMap.get(bookmark.url!)!;
          return {
            id: bookmark.id,
            title: bookmark.title || "",
            createdAt: item.createdAt || 0,
            updatedAt: item.updatedAt || 0,
          };
        });

      // Sort based on the sort order
      bookmarksWithMetadata.sort((a, b) => {
        switch (sortOrder) {
          case "alphabetical":
            return a.title.localeCompare(b.title);
          case "created":
            return a.createdAt - b.createdAt;
          case "updated":
            return b.updatedAt - a.updatedAt; // Most recent first
          default:
            return 0;
        }
      });

      // Move each bookmark to its correct position
      for (let i = 0; i < bookmarksWithMetadata.length; i++) {
        const bookmark = bookmarksWithMetadata[i];
        try {
          await browser.bookmarks.move(bookmark.id, {
            parentId: folderId,
            index: i,
          });

          // Small delay to avoid overwhelming the API
          if (bookmarksWithMetadata.length > 10) {
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
        } catch (error) {
          logger.error(`Failed to move bookmark ${bookmark.id}`, error);
        }
      }

      logger.info(`Reordered ${bookmarksWithMetadata.length} bookmarks by ${sortOrder}`);
    } catch (error) {
      logger.error("Failed to reorder folder", error);
      throw error;
    }
  }

  /**
   * Clear folder cache (useful after manual bookmark operations)
   */
  public clearCache(): void {
    this.folderCache.clear();
    logger.debug("Folder cache cleared");
  }
}
