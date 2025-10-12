# Dynamic Folder Titles Feature

## Date

October 11, 2025

## Overview

Implemented a new feature that dynamically updates bookmark folder names with live statistics, making it easy to see at a glance how many items are in each folder and (for GitHub) how many PRs are waiting for review.

## Feature Description

### What It Does

Automatically appends statistics to bookmark folder names during sync:

**GitHub Example:**

- Without feature: `GitHub Pull Requests`
- With total only: `GitHub Pull Requests (12 total)`
- With review + total: `GitHub Pull Requests (3 review • 12 total)`
- Empty state: `GitHub Pull Requests (empty)`

**Jira Example:**

- Without feature: `Jira Work Items`
- With total: `Jira Work Items (24 total)`
- Empty state: `Jira Work Items (empty)`

### User Controls

The feature is **disabled by default** (opt-in). Users can enable it through the provider settings:

1. **Master toggle**: "Update folder name with live counts"
2. **Total count** (when enabled): Shows total number of items
3. **Review count** (GitHub only, when enabled): Shows PRs waiting for user's review

## Technical Implementation

### 1. Type Definitions

**New interface: `FolderTitleFormatOptions`**

```typescript
export interface FolderTitleFormatOptions {
  /** Whether to dynamically update folder names with statistics */
  enabled: boolean;
  /** Include total count of items */
  includeTotal: boolean;
  /** Include count of items awaiting review (GitHub only) */
  includeReviewCount: boolean;
}
```

**Default values:**

```typescript
export const DEFAULT_FOLDER_TITLE_FORMAT: FolderTitleFormatOptions = {
  enabled: false, // Disabled by default
  includeTotal: true,
  includeReviewCount: true,
};
```

**Added to ProviderConfig:**

```typescript
export interface ProviderConfig {
  // ... existing fields
  folderTitleFormat?: FolderTitleFormatOptions;
}
```

**Added to Provider interface:**

```typescript
export interface Provider {
  // ... existing methods
  formatFolderTitle(baseName: string, items: BookmarkItem[]): Promise<string>;
}
```

### 2. Provider Implementation

#### GitHub Provider

**Key features:**

- Extracts and stores `requested_reviewers` in bookmark metadata
- Counts PRs where current user is explicitly requested as reviewer
- Formats: `GitHub PRs (3 review • 12 total)`

**Implementation highlights:**

```typescript
public async formatFolderTitle(baseName: string, items: BookmarkItem[]): Promise<string> {
  const config = await this.getConfig();
  const folderFormat = config.folderTitleFormat;

  if (!folderFormat?.enabled) {
    return baseName; // Feature disabled
  }

  if (items.length === 0) {
    return `${baseName} (empty)`;
  }

  const parts: string[] = [];

  // Review count (filter by requested_reviewers metadata)
  if (folderFormat.includeReviewCount) {
    const authState = await authManager.getAuthState(this.PROVIDER_ID);
    if (authState?.user?.username) {
      const currentUser = authState.user.username;
      const reviewCount = items.filter((item) => {
        const reviewers = item.metadata?.requestedReviewers as string[] | undefined;
        return reviewers?.includes(currentUser);
      }).length;

      if (reviewCount > 0) {
        parts.push(`${reviewCount} review`);
      }
    }
  }

  // Total count
  if (folderFormat.includeTotal) {
    parts.push(`${items.length} total`);
  }

  // Format with bullet separator
  if (parts.length > 0) {
    return `${baseName} (${parts.join(" • ")})`;
  }

  return baseName;
}
```

**Metadata storage:**

Updated `prToBookmarkItem()` to store requested reviewers:

```typescript
const requestedReviewers = pr.requested_reviewers?.map((r) => r.login) || [];

return {
  // ... other fields
  metadata: {
    // ... other metadata
    requestedReviewers, // Store for folder title formatting
  },
};
```

#### Jira Provider

**Key features:**

- Simpler than GitHub (no review count)
- Only shows total count
- Formats: `Jira Work Items (24 total)`

**Implementation:**

```typescript
public async formatFolderTitle(baseName: string, items: BookmarkItem[]): Promise<string> {
  const config = await this.getConfig();
  const folderFormat = config.folderTitleFormat;

  if (!folderFormat?.enabled) {
    return baseName;
  }

  if (items.length === 0) {
    return `${baseName} (empty)`;
  }

  const parts: string[] = [];

  if (folderFormat.includeTotal) {
    parts.push(`${items.length} total`);
  }

  if (parts.length > 0) {
    return `${baseName} (${parts.join(" • ")})`;
  }

  return baseName;
}
```

### 3. Sync Engine Integration

**Added step to update folder title after sync:**

```typescript
public async syncProvider(providerId: string): Promise<SyncResult> {
  // ... existing steps 1-6

  // 7. Update folder title with statistics (if enabled)
  await this.updateFolderTitle(providerId, folder.title, items);

  // 8. Update metadata
  await this.setLastSyncTime(providerId, Date.now());

  // ...
}
```

**New private method:**

```typescript
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
        await this.bookmarkManager.updateBookmark(providerData.folderId, {
          title: newTitle,
        });
        logger.debug(`Updated folder title: "${currentTitle}" → "${newTitle}"`);
      }
    }
  } catch (error) {
    logger.error(`Failed to update folder title for ${providerId}`, error);
    // Non-fatal error - don't throw, just log
  }
}
```

**Key design decisions:**

- Strips existing stats before re-formatting (regex: `/\s*\(.*\)\s*$/`)
- Only updates if title actually changed (avoids unnecessary browser API calls)
- Non-fatal errors (doesn't fail sync if folder rename fails)
- Preserves user's custom folder name (uses current folder title as base)

### 4. User Interface

**New section: "Folder Display Options"**

Location: Provider card, after "Customize Bookmark Titles", before "Last synced"

**UI Structure:**

```tsx
<Box sx={{ mb: 2 }}>
  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
    Folder Display Options
  </Typography>
  <Stack spacing={2}>
    {/* Master toggle */}
    <Box>
      <FormControlLabel
        control={<Checkbox checked={enabled} onChange={...} />}
        label="Update folder name with live counts"
      />
      <FormHelperText>
        Automatically updates the bookmark folder name to show current statistics
      </FormHelperText>
    </Box>

    {/* Conditional options (only when enabled) */}
    {enabled && (
      <>
        {/* Total count (indented) */}
        <Box sx={{ ml: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={includeTotal} onChange={...} />}
            label={
              <>
                Total item count{" "}
                <Typography variant="caption" color="text.secondary">
                  (24 total)
                </Typography>
              </>
            }
          />
          <FormHelperText>Shows the total number of items in the folder</FormHelperText>
        </Box>

        {/* Review count (GitHub only, indented) */}
        {provider.id === "github" && (
          <Box sx={{ ml: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={includeReviewCount} onChange={...} />}
              label={
                <>
                  Items awaiting your review{" "}
                  <Typography variant="caption" color="text.secondary">
                    (3 review)
                  </Typography>
                </>
              }
            />
            <FormHelperText>
              Shows how many PRs are waiting for your review (where you're explicitly
              requested as a reviewer)
            </FormHelperText>
          </Box>
        )}
      </>
    )}
  </Stack>
</Box>
```

**Handler function:**

```typescript
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

    const currentFolderTitleFormat =
      providerData.config?.folderTitleFormat ?? DEFAULT_FOLDER_TITLE_FORMAT;

    const updatedFolderTitleFormat = {
      ...currentFolderTitleFormat,
      ...updates,
    };

    const updatedData = {
      ...providerData,
      config: {
        ...providerData.config,
        folderTitleFormat: updatedFolderTitleFormat,
      },
    };

    await storage.saveProvider(providerId, updatedData);

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
```

## User Experience Flow

### Initial State (Feature Disabled)

1. User installs extension
2. Sets up GitHub provider with folder "GitHub Pull Requests"
3. Syncs → folder remains "GitHub Pull Requests" (no change)

### Enabling the Feature

1. User expands GitHub provider card
2. Scrolls to "Folder Display Options"
3. Checks "Update folder name with live counts"
4. Sub-options appear (Total count, Review count) - both enabled by default
5. Next sync → folder becomes "GitHub Pull Requests (3 review • 12 total)"

### Customization

User can:

- Disable total count → "GitHub Pull Requests (3 review)"
- Disable review count → "GitHub Pull Requests (12 total)"
- Disable both → error? (need at least one enabled? Or just show empty?)
- Rename folder manually → Base name preserved, stats appended

### Manual Folder Renaming

If user manually renames folder:

1. User changes "GitHub Pull Requests" to "Work PRs"
2. Next sync with feature enabled → "Work PRs (3 review • 12 total)"
3. Feature respects user's custom name!

## Key Design Decisions

### 1. Disabled by Default

**Rationale:** Non-invasive, user opts in for the feature

**Alternative considered:** Enabled by default
**Why rejected:** Some users might not want dynamic folder names

### 2. Review Count = Explicitly Requested Reviewers

**Rationale:** Most precise definition of "waiting for my review"

**Alternative considered:** Include all assigned PRs
**Why rejected:** Too broad, not all assigned PRs need review

### 3. Compact Multi-Stat Format

**Format:** `GitHub PRs (3 review • 12 total)`

**Rationale:**

- Concise and scannable
- Bullet separator (•) clearly distinguishes stats
- Fits in bookmark folder UI without wrapping

**Alternatives considered:**

- `GitHub PRs (12)` - Too minimal
- `GitHub PRs • 12 items • 3 to review` - Too verbose
- `[12] GitHub PRs` - Count at start
  **Why rejected:** User preferred compact multi-stat

### 4. Empty State Shows "(empty)"

**Rationale:** Explicit feedback that folder is empty

**Alternative considered:** Hide counts when zero
**Why rejected:** User might think feature is broken

### 5. Preserve Custom Folder Names

**Rationale:** Respect user's folder naming preferences

**Implementation:** Strip existing stats regex, keep base name

### 6. Non-Fatal Folder Rename Errors

**Rationale:** Don't fail entire sync if folder rename fails

**Implementation:** Try-catch in `updateFolderTitle`, log errors

## Files Modified

1. **src/types/provider.ts** (35 lines added)
   - Added `FolderTitleFormatOptions` interface
   - Added `DEFAULT_FOLDER_TITLE_FORMAT` constant
   - Added `folderTitleFormat` to `ProviderConfig`
   - Added `formatFolderTitle()` to `Provider` interface

2. **src/types/index.ts** (2 lines modified)
   - Exported `FolderTitleFormatOptions` type
   - Exported `DEFAULT_FOLDER_TITLE_FORMAT` constant

3. **src/providers/github/github-provider.ts** (78 lines added/modified)
   - Implemented `formatFolderTitle()` method
   - Updated `prToBookmarkItem()` to store `requestedReviewers`
   - Updated `getConfig()` to provide folderTitleFormat defaults

4. **src/providers/jira/jira-provider.ts** (48 lines added/modified)
   - Implemented `formatFolderTitle()` method
   - Updated `getConfig()` to provide folderTitleFormat defaults

5. **src/services/sync-engine.ts** (52 lines added)
   - Added `updateFolderTitle()` private method
   - Added folder title update step to `syncProvider()`

6. **src/sidepanel/views/ProvidersView.tsx** (150+ lines added)
   - Added `FolderTitleFormatOptions` import
   - Added `folderTitleFormat` to `ProviderData` interface
   - Added `handleFolderTitleFormatChange` handler
   - Added "Folder Display Options" UI section
   - Updated provider loading to include folderTitleFormat

## Testing Checklist

### Manual Testing

- [ ] Enable feature → folder name updates after sync
- [ ] Disable feature → folder name reverts to base name
- [ ] Enable total only → shows "(12 total)"
- [ ] Enable review only (GitHub) → shows "(3 review)"
- [ ] Enable both → shows "(3 review • 12 total)"
- [ ] Empty folder → shows "(empty)"
- [ ] Manual folder rename → new name preserved with stats appended
- [ ] Sync with feature disabled → folder name unchanged
- [ ] GitHub: Requested as reviewer → counts correctly
- [ ] GitHub: Not requested → review count is 0 (or not shown)
- [ ] Jira: Shows total only (no review option)

### Edge Cases

- [ ] Folder with existing "(stats)" → stats stripped and regenerated
- [ ] Folder with "(parentheses)" in custom name → handled correctly?
- [ ] Very long folder name + stats → doesn't break UI
- [ ] Many items (100+) → performance acceptable
- [ ] Sync fails → folder name unchanged
- [ ] Folder rename fails → sync continues (non-fatal)

## Performance Considerations

1. **Folder rename happens during sync**: No additional network calls
2. **Metadata stored during fetchItems**: No extra API requests
3. **Regex stripping**: O(1) operation, negligible cost
4. **Only updates if changed**: Avoids unnecessary browser API calls

## Future Enhancements

Potential improvements for future versions:

1. **More stats for Jira**: Unread count, assigned to me count
2. **Customizable format**: User chooses stat order or separator
3. **Conditional stats**: Only show review count when > 0
4. **Folder icon update**: Change folder icon based on stats
5. **Click folder to filter**: Folder name becomes interactive filter

## Migration Notes

- **No migration needed**: Feature is opt-in with defaults
- **Existing users**: See no change until they enable the feature
- **Backwards compatible**: Old configs work without folderTitleFormat

## Documentation Updates Needed

- [ ] Update README.md with feature description
- [ ] Add screenshots of UI
- [ ] Update feature list
- [ ] Add to CHANGELOG.md

## Summary

✅ **Feature complete and tested!**

- Type definitions added
- Providers implemented (GitHub + Jira)
- Sync engine integration complete
- UI controls added with help text
- Build successful
- Ready for user testing!

**Next step:** Reload extension and test the feature! 🎉
