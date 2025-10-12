# Smart Title Formatting - Feature Completion

**Completion Date:** October 10, 2025
**Status:** ✅ Implementation Complete (Testing Pending)

## Overview

Implemented smart, configurable title formatting for GitHub PRs and Jira issues in bookmarks. Users can now customize how bookmark titles are generated with options for status indicators, emojis, priority, assignees, age, and more.

## Implementation Summary

### Phase 1: Type Definitions ✅

**Files Modified:**

- `src/types/provider.ts` - Added title format types
- `src/types/index.ts` - Exported new types

**Changes:**

```typescript
// New types added
export type TitleFormatStyle = "compact" | "detailed" | "minimal";

export interface TitleFormatOptions {
  includeStatus: boolean;        // Show status (open/closed/merged)
  includeEmojis: boolean;         // Use emoji icons
  includeAssignee: boolean;       // Show assignee
  includePriority: boolean;       // Show priority (Jira)
  includeAge: boolean;            // Show age indicator (>7 days)
  includeReviewStatus: boolean;   // Show review status (GitHub)
  includeCreator: boolean;        // Show item creator
  format: TitleFormatStyle;       // Style: compact/detailed/minimal
}

export const DEFAULT_TITLE_FORMAT: TitleFormatOptions = {
  includeStatus: true,
  includeEmojis: true,
  includeAssignee: false,
  includePriority: false,
  includeAge: false,
  includeReviewStatus: true,
  includeCreator: false,
  format: "compact",
};

// Updated ProviderConfig interface
export interface ProviderConfig {
  // ...existing fields
  titleFormat?: TitleFormatOptions;
}
```

### Phase 2: GitHub Provider Formatter ✅

**Files Modified:**

- `src/providers/github/github-provider.ts`

**Changes:**

1. Extended `GitHubPR` interface with merge/review data:

   ```typescript
   interface GitHubPR {
     // ...existing fields
     draft?: boolean;
     merged?: boolean;
     mergeable_state?: string; // "clean" | "dirty" | "unstable" | "blocked"
     requested_reviewers?: Array<{ login: string }>;
     assignees?: Array<{ login: string }>;
   }
   ```

2. Added `formatGitHubTitle()` method (130 lines):

   - **Status indicators:**
     - 🟢 Open and ready (clean merge state)
     - 🟡 Draft PR
     - 🔴 Conflicts or blocked
     - 🟠 Unstable (failing checks)
     - ⚫ Merged and closed
     - 🔴 Closed without merge
   - **Review status:**
     - ✅ No pending reviews (or approved)
     - 👁️ Reviews requested (with count)
   - **Age indicator:** ⏰ for PRs >7 days old
   - **Creator:** `@username:` when enabled
   - **Assignee:** `→@username` when different from creator

3. Updated `prToBookmarkItem()` to async, fetches config, uses formatter

**Example Outputs:**

```text
Compact:  🟢 ✅ Add user authentication #123
Creator:  🟢 ✅ @alice: Add user authentication #123
Detailed: 🟢 ✅ @alice: Add user authentication (#123)
Minimal:  🟢 Add user authentication #123
```

### Phase 3: Jira Provider Formatter ✅

**Files Modified:**

- `src/providers/jira/jira-provider.ts`

**Changes:**

1. Added `formatJiraTitle()` method (140 lines):

   - **Priority indicators:**
     - 🔴 Highest/Blocker
     - 🟠 High
     - 🟡 Medium
     - 🟢 Low
     - 🔵 Lowest
   - **Issue type indicators:**
     - 🐛 Bug/Defect
     - 📚 Epic
     - 📖 Story/User Story
     - ✅ Task
     - 📝 Sub-task
     - ⚡ Improvement/Enhancement
     - 🔬 Spike/Research
   - **Status:** Text indicators for TODO/IN PROGRESS/DONE
   - **Assignee:** `@name:` or `@unassigned:` when enabled
   - **Creator:** `by @name` when different from assignee
   - **Age indicator:** ⏰ for issues >7 days old

2. Updated `convertToBookmarkItem()` to async, fetches config, uses formatter

**Example Outputs:**

```text
Compact:  🔴 🐛 @alice: Fix critical login crash [PROJ-123]
Detailed: 🔴 🐛 [IN PROGRESS] @alice: Fix critical login crash (PROJ-123)
Minimal:  🐛 Fix critical login crash [PROJ-123]
```

### Phase 4: UI Controls ✅

**Files Modified:**

- `src/sidepanel/views/ProvidersView.tsx`

**Changes:**

1. Updated `ProviderData` interface to include `titleFormat?: TitleFormatOptions`
2. Added `handleTitleFormatChange()` method (saves to storage, updates local state)
3. Added "Title Format" section in provider cards with:
   - **8 checkboxes:**
     - Include status
     - Use emoji icons
     - Include priority (Jira only)
     - Include assignee (Jira only)
     - Include review status (GitHub only)
     - Show age (>7 days)
     - Show creator
   - **Format style dropdown:**
     - Compact
     - Detailed
     - Minimal
4. Section appears after "Filter Items" and before provider-specific settings
5. Only visible when provider is authenticated and has a folder configured

**UI Layout:**

```text
Provider Card
├── Enable/Disable Toggle
├── Folder Selection
├── Sort Bookmarks By
├── Filter Items
│   ├── Created by me
│   └── Review requests / Assigned to me
├── Title Format ⬅️ NEW SECTION
│   ├── Include status ☑️
│   ├── Use emoji icons ☑️
│   ├── Include priority ☐ (Jira)
│   ├── Include assignee ☐
│   ├── Include review status ☑️ (GitHub)
│   ├── Show age (>7 days) ☐
│   ├── Show creator ☐
│   └── Format Style: [Compact ▼]
└── Last synced: ...
```

### Phase 5: Storage & Sync Verification ✅

**Verification Results:**

1. **Storage Manager (`src/services/storage.ts`):**
   - ✅ `saveProvider()` saves entire `ProviderStorageData` including config
   - ✅ `getProvider()` retrieves full config with titleFormat
   - ✅ No data loss during save/load operations

2. **Sync Engine (`src/services/sync-engine.ts`):**
   - ✅ `syncProvider()` only reads config, doesn't modify it
   - ✅ `setLastSyncTime()` preserves all config fields when updating timestamp
   - ✅ TitleFormat configuration persists through sync operations

3. **ProvidersView Handler:**
   - ✅ `handleTitleFormatChange()` merges updates with existing config
   - ✅ Updates both storage and local state
   - ✅ Partial updates supported (e.g., toggle one checkbox)

## Code Statistics

**Files Modified:** 5

- `src/types/provider.ts` - 60 lines added
- `src/types/index.ts` - 3 lines added
- `src/providers/github/github-provider.ts` - 140 lines added
- `src/providers/jira/jira-provider.ts` - 150 lines added
- `src/sidepanel/views/ProvidersView.tsx` - 140 lines added

**Total Lines:** ~493 lines of new code

**TypeScript Interfaces:** 2 new, 2 extended

**Functions/Methods:** 3 new formatter functions, 1 new UI handler

## Quality Checks

- ✅ TypeScript compilation: No errors (`npx tsc --noEmit`)
- ✅ Biome linting: All issues auto-fixed (`npm run lint:fix`)
- ✅ Type safety: Full type coverage for all new code
- ✅ Code organization: Follows existing patterns and conventions

## Feature Capabilities

### GitHub PR Titles

**Configuration Options:**

- Status indicators (open/draft/merged/closed/conflicts)
- Review status (approved/requested/changes)
- Age indicator (>7 days)
- Creator attribution
- Assignee display
- Format style (compact/detailed/minimal)

**Example Transformations:**

```text
Before: #123: Add user authentication
After:  🟢 ✅ @alice: Add user authentication #123
```

### Jira Issue Titles

**Configuration Options:**

- Priority indicators (highest to lowest)
- Issue type indicators (bug/epic/story/task/etc.)
- Status display
- Assignee display
- Creator attribution
- Age indicator (>7 days)
- Format style (compact/detailed/minimal)

**Example Transformations:**

```text
Before: PROJ-123: Fix critical login crash
After:  🔴 🐛 @alice: Fix critical login crash [PROJ-123]
```

## Default Configuration

```typescript
DEFAULT_TITLE_FORMAT = {
  includeStatus: true,         // ✅ Enabled
  includeEmojis: true,         // ✅ Enabled
  includeAssignee: false,      // ⬜ Disabled
  includePriority: false,      // ⬜ Disabled (Jira)
  includeAge: false,           // ⬜ Disabled
  includeReviewStatus: true,   // ✅ Enabled (GitHub)
  includeCreator: false,       // ⬜ Disabled
  format: "compact",           // Compact style
}
```

**Rationale:** Balance between information density and readability. Status and review status are most valuable for quick scanning, while other options are opt-in to avoid clutter.

## Testing Status

### Automated Tests

- ⏳ **Pending:** Unit tests for formatters
- ⏳ **Pending:** Integration tests with real API data

### Manual Testing

- ⏳ **Pending:** Test all checkbox combinations
- ⏳ **Pending:** Test format style variations
- ⏳ **Pending:** Test edge cases (no creator, no assignee, old items)
- ⏳ **Pending:** Test GitHub PR scenarios
- ⏳ **Pending:** Test Jira issue scenarios
- ⏳ **Pending:** Verify storage persistence
- ⏳ **Pending:** Verify sync preservation

## Next Steps

1. **Manual Testing (Task 6):**
   - Test with real GitHub PRs
   - Test with real Jira issues
   - Verify all format options
   - Test edge cases

2. **Documentation:**
   - Update README with title format feature
   - Add screenshots of UI controls
   - Document format style differences

3. **Potential Enhancements (Future):**
   - Live preview of title format
   - Custom emoji mappings
   - Additional format variables
   - Template-based formatting

## Known Limitations

1. **Provider-Specific Options:**
   - `includePriority` only available for Jira
   - `includeReviewStatus` only available for GitHub
   - UI conditionally shows/hides these options

2. **Age Calculation:**
   - Fixed threshold of 7 days (not configurable)
   - Calculated client-side on each sync

3. **Emoji Mappings:**
   - Fixed emoji set (not customizable)
   - Best-effort mapping for Jira issue types

## Migration Notes

- ✅ **Backwards Compatible:** Existing provider configs without titleFormat will use DEFAULT_TITLE_FORMAT
- ✅ **No Breaking Changes:** All changes are additive
- ✅ **Graceful Degradation:** Missing PR/issue fields handled safely

## Summary

Smart title formatting feature is **fully implemented** and ready for testing. The implementation provides:

- ✅ Flexible configuration with 8 independent options
- ✅ Provider-specific formatting logic (GitHub & Jira)
- ✅ Intuitive UI controls in provider cards
- ✅ Proper storage and sync integration
- ✅ Type-safe implementation with full coverage
- ✅ Backwards-compatible with existing configurations

**Next Phase:** Manual testing with real GitHub and Jira data to validate all formatting scenarios and edge cases.
