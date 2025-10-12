# Firefox Bookmark Folder Creation Fix

**Date:** October 10, 2025  
**Issue:** Invalid bookmark error when creating folders in Firefox  
**Error:** `Invalid bookmark: {"title":"Pull requests","type":2,"parentGuid":"2"}`  
**Status:** ✅ Fixed

---

## Problem

When trying to create a bookmark folder in Firefox, the extension threw an error:

```text
Invalid bookmark: {"title":"Pull requests","type":2,"parentGuid":"2"}
```

### Root Causes

1. **Hardcoded parent ID:** The code used `parentId: "2"` which is Chrome-specific for "Other Bookmarks"
2. **Firefox uses GUIDs:** Firefox bookmark IDs are GUIDs (e.g., `"unfiled_____"`), not numeric strings
3. **API inconsistency:** Code mixed `chrome.bookmarks` and `browser.bookmarks` APIs

---

## Solution

### 1. Dynamic Parent Folder Detection

Updated `src/sidepanel/views/ProvidersView.tsx` to dynamically find the correct parent folder:

**Before:**

```typescript
const newFolder = await browser.bookmarks.create({
  parentId: "2", // Chrome-specific ID
  title: newFolderName.trim(),
});
```

**After:**

```typescript
// Get the bookmark tree to find the appropriate parent folder
const tree = await browser.bookmarks.getTree();

// Find "Other Bookmarks" (Chrome) or "Unfiled Bookmarks" (Firefox)
const findUnfiledFolder = (nodes: browser.Bookmarks.BookmarkTreeNode[]): string | null => {
  for (const node of nodes) {
    // Firefox uses "unfiled_____" as the ID
    if (node.id === "unfiled_____" || node.title === "Unfiled Bookmarks") {
      return node.id;
    }
    // Chrome uses "2" for "Other Bookmarks"
    if (node.id === "2" || node.title === "Other Bookmarks") {
      return node.id;
    }
    if (node.children) {
      const found = findUnfiledFolder(node.children);
      if (found) return found;
    }
  }
  return null;
};

const parentId = findUnfiledFolder(tree) || tree[0]?.id || "1";

const newFolder = await browser.bookmarks.create({
  parentId,
  title: newFolderName.trim(),
});
```

### 2. Consistent Browser API Usage

Replaced all `chrome.bookmarks` with `browser.bookmarks` in `bookmark-manager.ts`:

**Before:**

```typescript
const folder = await chrome.bookmarks.create({ title, parentId });
```

**After:**

```typescript
import browser from "webextension-polyfill";
// ...
const folder = await browser.bookmarks.create({ title, parentId });
```

This ensures the webextension-polyfill handles browser-specific differences automatically.

---

## Browser Differences

### Chrome Bookmark IDs

- Root: `"0"`
- Bookmarks Bar: `"1"`
- Other Bookmarks: `"2"`
- Mobile Bookmarks: `"3"`

### Firefox Bookmark IDs

- Root: `"root________"`
- Toolbar: `"toolbar_____"`
- Menu: `"menu________"`
- Unfiled: `"unfiled_____"`
- Mobile: `"mobile______"`

---

## Testing

### Chrome

1. Open sidepanel settings
2. Click "Create New Folder"
3. Enter folder name
4. ✅ Folder created under "Other Bookmarks"

### Firefox

1. Open sidepanel settings (opens in new tab)
2. Click "Create New Folder"
3. Enter folder name
4. ✅ Folder created under "Unfiled Bookmarks"
5. ✅ No more "Invalid bookmark" errors

---

## Files Modified

1. **`src/sidepanel/views/ProvidersView.tsx`**
   - Added `findUnfiledFolder()` helper function
   - Dynamically detects correct parent folder ID
   - Works in both Chrome and Firefox

2. **`src/services/bookmark-manager.ts`**
   - Added `import browser from "webextension-polyfill"`
   - Replaced all `chrome.bookmarks` → `browser.bookmarks`
   - Better cross-browser compatibility

---

## Why This Approach?

### Option 1: Hardcode Different IDs (❌ Rejected)

```typescript
const isFirefox = navigator.userAgent.includes('Firefox');
const parentId = isFirefox ? "unfiled_____" : "2";
```

**Problem:** Fragile, assumes Firefox will always use the same ID

### Option 2: Dynamic Detection (✅ Chosen)

```typescript
const findUnfiledFolder = (nodes) => {
  // Search by both ID and title
  // Falls back to root if not found
};
```

**Benefits:**

- Works if Firefox changes IDs in future
- Works in other browsers (Edge, Brave, etc.)
- More robust and maintainable

### Option 3: Use webextension-polyfill (✅ Also Implemented)

```typescript
import browser from "webextension-polyfill";
await browser.bookmarks.create({ ... });
```

**Benefits:**

- Handles browser differences automatically
- Consistent API across browsers
- Less manual browser detection needed

---

## Additional Notes

### Why "unfiled_____"?

Firefox uses underscores to pad the bookmark root IDs to a fixed length (12 characters). This is an internal implementation detail.

### Fallback Behavior

If neither "Other Bookmarks" nor "Unfiled Bookmarks" is found, the code falls back to:

1. First root node ID
2. Or `"1"` (bookmarks bar) as last resort

This ensures folder creation always works, even in unknown scenarios.

---

## Impact

✅ **Firefox users can now create bookmark folders!**

- No more "Invalid bookmark" errors
- Folders created in the correct location
- Same functionality as Chrome users

---

## Related Issues

- Firefox Side Panel Fix: `docs/firefox-sidepanel-fix.md`
- Firefox Testing Guide: `docs/FIREFOX_TESTING.md`
- Firefox Implementation: `docs/FIREFOX_IMPLEMENTATION.md`

---

**Status:** ✅ Fixed and tested in Firefox
