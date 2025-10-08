/**
 * Bookmark Manager
 * Type-safe wrapper around browser.bookmarks API
 */

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
			const folder = await chrome.bookmarks.create({
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
			const folders = await chrome.bookmarks.get(folderId);
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
			const results = await chrome.bookmarks.search({ title });

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
			const tree = await chrome.bookmarks.getSubTree(folderId);

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
			await chrome.bookmarks.removeTree(folderId);
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
	public async createBookmark(folderId: string, item: BookmarkItem): Promise<string> {
		try {
			const bookmark = await chrome.bookmarks.create({
				parentId: folderId,
				title: item.title,
				url: item.url,
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
			await chrome.bookmarks.update(bookmarkId, updates);
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
			await chrome.bookmarks.remove(bookmarkId);
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
			const bookmarks = await chrome.bookmarks.get(bookmarkId);
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
	public async batchCreate(folderId: string, items: BookmarkItem[]): Promise<string[]> {
		const bookmarkIds: string[] = [];
		const errors: Error[] = [];

		for (const item of items) {
			try {
				const id = await this.createBookmark(folderId, item);
				bookmarkIds.push(id);

				// Small delay to avoid rate limiting (Firefox: ~100 ops/sec)
				if (items.length > 10) {
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
			logger.info(`Batch created ${bookmarkIds.length} bookmarks`);
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
	 * Clear folder cache (useful after manual bookmark operations)
	 */
	public clearCache(): void {
		this.folderCache.clear();
		logger.debug("Folder cache cleared");
	}
}
