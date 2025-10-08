# Phase 4: Sync Engine - Implementation Plan

## Overview

Phase 4 implements the synchronization engine that bridges external providers (GitHub, Jira) with the browser's bookmark system. This is the core functionality that makes Live Folders "live."

**Goal:** Automatic synchronization of external items into browser bookmarks

**Dependencies:**

- ✅ Phase 1: Types, Storage, Logger, Browser utils
- ✅ Phase 2: AuthManager, GitHub Provider, Jira Provider
- ✅ Phase 3: Provider Registry

---

## Architecture Strategy

### Sync Flow Overview

```text
1. Trigger (Manual or Scheduled)
   ↓
2. Fetch Items from Provider (via ProviderRegistry)
   ↓
3. Get Current Bookmarks from Folder
   ↓
4. Calculate Diff (toAdd, toUpdate, toDelete)
   ↓
5. Apply Changes to Bookmarks
   ↓
6. Update Metadata Storage
   ↓
7. Emit Sync Complete Event
```

### Component Architecture

```text
Services (src/services/)
├── bookmark-manager.ts - Browser bookmarks API wrapper
├── sync-engine.ts - Sync orchestration and diff logic
└── provider-registry.ts - ✅ Already implemented

Background (src/background/)
├── scheduler.ts - Periodic sync scheduling
└── index.ts - Service worker entry point
```

### Key Design Principles

1. **Idempotent Syncs**: Running sync twice should be safe
2. **Atomic Operations**: Batch changes, rollback on error
3. **Conflict Resolution**: Last write wins, prefer external source
4. **Error Resilience**: Continue syncing other providers if one fails
5. **Performance**: Minimize bookmark API calls, batch operations

---

## Phase 4.1: Bookmark Manager

**Goal:** Wrap browser.bookmarks API with type-safe, error-resistant operations

### File: `src/services/bookmark-manager.ts`

#### Core Operations

**Folder Management:**

```typescript
class BookmarkManager {
  // Create bookmark folder
  async createFolder(
    title: string,
    parentId?: string
  ): Promise<string>

  // Get folder by ID
  async getFolder(folderId: string): Promise<BookmarkNode | null>

  // Get folder by title (find or create)
  async getFolderByTitle(
    title: string,
    parentId?: string
  ): Promise<string>

  // Get all bookmarks in folder
  async getFolderContents(
    folderId: string
  ): Promise<BookmarkNode[]>

  // Clear all bookmarks in folder (keep folder)
  async clearFolder(folderId: string): Promise<void>

  // Delete folder and all contents
  async deleteFolder(folderId: string): Promise<void>
}
```

**Bookmark Operations:**

```typescript
class BookmarkManager {
  // Create single bookmark
  async createBookmark(
    folderId: string,
    item: BookmarkItem
  ): Promise<string>

  // Update bookmark (URL or title)
  async updateBookmark(
    bookmarkId: string,
    updates: { title?: string; url?: string }
  ): Promise<void>

  // Delete bookmark
  async deleteBookmark(bookmarkId: string): Promise<void>

  // Get bookmark by ID
  async getBookmark(
    bookmarkId: string
  ): Promise<BookmarkNode | null>

  // Find bookmark by URL in folder
  async findBookmarkByUrl(
    folderId: string,
    url: string
  ): Promise<string | null>
}
```

**Batch Operations:**

```typescript
class BookmarkManager {
  // Create multiple bookmarks (optimized)
  async batchCreate(
    folderId: string,
    items: BookmarkItem[]
  ): Promise<string[]>

  // Delete multiple bookmarks (optimized)
  async batchDelete(bookmarkIds: string[]): Promise<void>

  // Update multiple bookmarks (optimized)
  async batchUpdate(
    updates: Array<{
      bookmarkId: string;
      changes: { title?: string; url?: string };
    }>
  ): Promise<void>
}
```

#### Implementation Details

**Browser API Types:**

```typescript
interface BookmarkNode {
  id: string;
  parentId?: string;
  index?: number;
  url?: string;
  title: string;
  dateAdded?: number;
  dateGroupModified?: number;
  children?: BookmarkNode[];
}
```

**Error Handling:**

- Wrap all `browser.bookmarks.*` calls in try-catch
- Log errors with context
- Return null/empty arrays on non-critical errors
- Throw on critical errors (e.g., folder not found)

**Performance Optimizations:**

- Cache folder IDs to avoid repeated lookups
- Batch operations when possible
- Use `browser.bookmarks.getSubTree()` instead of multiple gets

---

## Phase 4.2: Sync Engine Core

**Goal:** Orchestrate sync process and calculate diffs between current and new state

### File: `src/services/sync-engine.ts`

#### Sync Diff Algorithm

**Diff Types:**

```typescript
interface SyncDiff {
  toAdd: BookmarkItem[];        // Items not in bookmarks
  toUpdate: UpdateItem[];        // Items changed
  toDelete: string[];            // Bookmark IDs to remove
}

interface UpdateItem {
  bookmarkId: string;
  oldItem: BookmarkItem;
  newItem: BookmarkItem;
}
```

**Algorithm:**

```typescript
async calculateDiff(
  folderId: string,
  fetchedItems: BookmarkItem[]
): Promise<SyncDiff> {
  // 1. Get current bookmarks from folder
  const currentBookmarks = await bookmarkManager.getFolderContents(folderId);

  // 2. Build lookup maps
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
  const toAdd = fetchedItems.filter(
    item => !currentMap.has(item.url)
  );

  // 4. Find items to delete (in current, not in fetched)
  const toDelete = currentBookmarks
    .filter(bookmark => bookmark.url && !fetchedMap.has(bookmark.url))
    .map(bookmark => bookmark.id);

  // 5. Find items to update (in both, but title changed)
  const toUpdate = [];
  for (const [url, item] of fetchedMap) {
    const current = currentMap.get(url);
    if (current && current.title !== item.title) {
      toUpdate.push({
        bookmarkId: current.id,
        oldItem: {
          id: current.id,
          title: current.title,
          url: current.url!,
        },
        newItem: item,
      });
    }
  }

  return { toAdd, toUpdate, toDelete };
}
```

#### Sync Orchestration

**Main Sync Methods:**

```typescript
class SyncEngine {
  // Sync all enabled providers
  async syncAll(): Promise<SyncResult>

  // Sync single provider
  async syncProvider(providerId: string): Promise<SyncResult>

  // Get last sync time
  getLastSyncTime(providerId: string): Promise<number | null>

  // Set last sync time
  setLastSyncTime(providerId: string, timestamp: number): Promise<void>
}
```

**Sync Result:**

```typescript
interface SyncResult {
  providerId: string;
  success: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeleted: number;
  error?: string;
  duration: number; // milliseconds
}
```

**Sync Process:**

```typescript
async syncProvider(providerId: string): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // 1. Get provider config (folder ID)
    const config = await storage.getProviderConfig(providerId);
    if (!config?.folderId) {
      throw new Error("Provider folder not configured");
    }

    // 2. Fetch items from provider
    const items = await providerRegistry.fetchProviderItems(providerId);

    // 3. Calculate diff
    const diff = await this.calculateDiff(config.folderId, items);

    // 4. Apply changes
    await this.applyChanges(config.folderId, diff);

    // 5. Update metadata
    await this.setLastSyncTime(providerId, Date.now());

    return {
      providerId,
      success: true,
      itemsAdded: diff.toAdd.length,
      itemsUpdated: diff.toUpdate.length,
      itemsDeleted: diff.toDelete.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    logger.error(`Sync failed for ${providerId}`, error);
    return {
      providerId,
      success: false,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}
```

**Apply Changes:**

```typescript
async applyChanges(folderId: string, diff: SyncDiff): Promise<void> {
  // Delete first (free up space)
  if (diff.toDelete.length > 0) {
    await bookmarkManager.batchDelete(diff.toDelete);
  }

  // Then update
  if (diff.toUpdate.length > 0) {
    const updates = diff.toUpdate.map(item => ({
      bookmarkId: item.bookmarkId,
      changes: { title: item.newItem.title },
    }));
    await bookmarkManager.batchUpdate(updates);
  }

  // Finally add new items
  if (diff.toAdd.length > 0) {
    await bookmarkManager.batchCreate(folderId, diff.toAdd);
  }
}
```

---

## Phase 4.3: Background Scheduler

**Goal:** Schedule periodic syncs using browser alarms

### File: `src/background/scheduler.ts`

#### Alarm-Based Scheduling

**Scheduler Class:**

```typescript
class SyncScheduler {
  private syncEngine: SyncEngine;
  private defaultInterval: number = 60; // seconds

  constructor(syncEngine: SyncEngine) {
    this.syncEngine = syncEngine;
  }

  // Start scheduler
  async start(): Promise<void>

  // Stop scheduler
  async stop(): Promise<void>

  // Schedule next sync
  async scheduleNextSync(delayInSeconds?: number): Promise<void>

  // Handle alarm event
  async handleAlarm(alarm: browser.alarms.Alarm): Promise<void>

  // Get/set sync interval
  getSyncInterval(): Promise<number>
  setSyncInterval(seconds: number): Promise<void>
}
```

**Implementation:**

```typescript
async start() {
  const interval = await this.getSyncInterval();
  await browser.alarms.create("sync-all", {
    periodInMinutes: interval / 60,
  });
  logger.info(`Sync scheduler started (interval: ${interval}s)`);
}

async stop() {
  await browser.alarms.clear("sync-all");
  logger.info("Sync scheduler stopped");
}

async handleAlarm(alarm: browser.alarms.Alarm) {
  if (alarm.name === "sync-all") {
    logger.info("Scheduled sync triggered");
    const results = await this.syncEngine.syncAll();
    logger.info("Scheduled sync completed", results);
  }
}
```

### File: `src/background/index.ts`

**Service Worker Entry Point:**

```typescript
import { SyncEngine } from "@/services/sync-engine";
import { SyncScheduler } from "./scheduler";
import { ProviderRegistry } from "@/services/provider-registry";
import { BookmarkManager } from "@/services/bookmark-manager";
import { Logger } from "@/utils/logger";

const logger = new Logger("Background");
let syncEngine: SyncEngine;
let scheduler: SyncScheduler;

// Extension installed/updated
browser.runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension installed/updated: ${details.reason}`);

  if (details.reason === "install") {
    // First install: create default folder structure
    const bookmarkManager = BookmarkManager.getInstance();
    const rootFolderId = await bookmarkManager.createFolder("Live Folders");
    logger.info(`Created root folder: ${rootFolderId}`);

    // Create folders for each provider
    const githubFolderId = await bookmarkManager.createFolder(
      "GitHub PRs",
      rootFolderId
    );
    const jiraFolderId = await bookmarkManager.createFolder(
      "Jira Issues",
      rootFolderId
    );

    // Save folder IDs to storage
    const storage = StorageManager.getInstance();
    await storage.saveProviderConfig("github", {
      enabled: false,
      folderId: githubFolderId,
    });
    await storage.saveProviderConfig("jira", {
      enabled: false,
      folderId: jiraFolderId,
    });

    logger.info("Initial setup complete");
  }

  // Initialize services
  syncEngine = SyncEngine.getInstance();
  scheduler = new SyncScheduler(syncEngine);
  await scheduler.start();
});

// Alarm handler
browser.alarms.onAlarm.addListener(async (alarm) => {
  await scheduler.handleAlarm(alarm);
});

// Message handler (from popup/sidepanel)
browser.runtime.onMessage.addListener(async (message, sender) => {
  logger.info("Message received", message);

  switch (message.type) {
    case "SYNC_ALL":
      return await syncEngine.syncAll();

    case "SYNC_PROVIDER":
      return await syncEngine.syncProvider(message.providerId);

    case "SET_SYNC_INTERVAL":
      await scheduler.setSyncInterval(message.interval);
      return { success: true };

    default:
      logger.warn(`Unknown message type: ${message.type}`);
      return { error: "Unknown message type" };
  }
});
```

---

## Implementation Order

### Phase 4.1: Bookmark Manager (Day 1-2)

1. ✅ Create `src/services/bookmark-manager.ts`
2. ✅ Implement folder operations (create, get, find)
3. ✅ Implement bookmark CRUD operations
4. ✅ Implement batch operations
5. ✅ Add comprehensive error handling
6. ✅ Test with browser.bookmarks API

### Phase 4.2: Sync Engine Core (Day 3-4)

1. ✅ Create `src/services/sync-engine.ts`
2. ✅ Implement diff calculation algorithm
3. ✅ Implement sync orchestration
4. ✅ Implement apply changes logic
5. ✅ Add metadata tracking (last sync time)
6. ✅ Test sync flow end-to-end

### Phase 4.3: Background Scheduler (Day 5)

1. ✅ Create `src/background/scheduler.ts`
2. ✅ Implement alarm-based scheduling
3. ✅ Create `src/background/index.ts`
4. ✅ Set up extension lifecycle handlers
5. ✅ Test background sync
6. ✅ Update manifest.json with background script

### Phase 4.4: Integration & Testing (Day 6)

1. ✅ Test complete sync flow (GitHub)
2. ✅ Test complete sync flow (Jira)
3. ✅ Test error scenarios
4. ✅ Test sync interval changes
5. ✅ Create Phase 4 completion documentation

---

## Technical Considerations

### Browser Bookmarks API

**Key Methods:**

- `browser.bookmarks.create()` - Create bookmark/folder
- `browser.bookmarks.update()` - Update title/URL
- `browser.bookmarks.remove()` - Delete bookmark
- `browser.bookmarks.removeTree()` - Delete folder recursively
- `browser.bookmarks.getSubTree()` - Get folder contents
- `browser.bookmarks.search()` - Search bookmarks

**Limitations:**

- No atomic batch operations (must loop)
- No transactions (can't rollback)
- Rate limiting (Firefox: ~100 ops/sec)

**Workarounds:**

- Batch with delays between operations
- Keep operations idempotent
- Log all changes for manual recovery

### Sync Strategy

**When to Sync:**

1. **Periodic** - Every 60 seconds (configurable)
2. **Manual** - User clicks "Sync Now"
3. **On Auth** - After successful authentication
4. **On Enable** - When provider is enabled

**Conflict Resolution:**

- **Strategy**: Last write wins, prefer external source
- **Rationale**: External items are source of truth
- **Edge Case**: User manually edits bookmark → gets overwritten
  - Future: Add "pinned" bookmarks that don't sync

### Performance Optimization

**Strategies:**

1. **Minimize API Calls**: Batch get operations
2. **Diff Before Apply**: Only change what's different
3. **Concurrent Syncs**: Sync providers in parallel
4. **Caching**: Cache folder IDs, avoid repeated lookups
5. **Rate Limiting**: Respect browser API limits

---

## Success Criteria

Phase 4 is complete when:

1. ✅ BookmarkManager can create/update/delete bookmarks
2. ✅ SyncEngine can calculate accurate diffs
3. ✅ SyncEngine can sync all enabled providers
4. ✅ Background scheduler runs periodic syncs
5. ✅ Extension creates folder structure on install
6. ✅ Manual sync works from message passing
7. ✅ All TypeScript compilation passes
8. ✅ All linting passes (Biome + Markdown)
9. ✅ Phase 4 completion documentation created

---

## Testing Strategy

### Manual Testing Checklist

**Bookmark Manager:**

- [ ] Create folder in bookmarks
- [ ] Create bookmark in folder
- [ ] Update bookmark title
- [ ] Delete bookmark
- [ ] Batch create 10 bookmarks
- [ ] Clear folder (delete all bookmarks)

**Sync Engine:**

- [ ] Sync GitHub provider (adds PRs)
- [ ] Sync again (no duplicates)
- [ ] Close PR on GitHub, sync (bookmark deleted)
- [ ] Rename PR on GitHub, sync (bookmark title updated)
- [ ] Sync Jira provider
- [ ] Sync all providers at once

**Background Scheduler:**

- [ ] Install extension (folders created)
- [ ] Wait 60 seconds (auto sync triggers)
- [ ] Change sync interval to 120 seconds
- [ ] Verify new interval works

### Error Scenarios

- [ ] Sync with unauthenticated provider (graceful failure)
- [ ] Sync with network error (retry logic)
- [ ] Delete provider folder manually (recreate on next sync)
- [ ] Rate limiting (backoff)

---

## Next Steps (Phase 5)

After Phase 4 completion:

- **Phase 5**: Background Service Worker - Complete background script implementation
- **Phase 6**: User Interface - Popup and sidepanel UI
- **Phase 7**: Testing & Polish - Unit tests, E2E tests

---

## Notes

- **Folder Structure**: Create "Live Folders" root, then "GitHub PRs", "Jira Issues" subfolders
- **Metadata Storage**: Store folder IDs in provider configs
- **Sync Interval**: Default 60s, configurable via settings (future)
- **Error Handling**: Log all errors, continue with other providers
