# Firefox Side Panel Fix

**Date:** October 10, 2025  
**Issue:** Settings cog button doesn't work in Firefox  
**Status:** ✅ Fixed

---

## Problem

When clicking the settings cog icon in the popup, nothing happened in Firefox. This was because:

1. Firefox doesn't support the `chrome.sidePanel` API
2. The code checked for `chrome.sidePanel` but just logged a warning and did nothing
3. Users had no way to access settings

---

## Solution

Updated `src/popup/hooks/useProviders.tsx` to detect Firefox and open settings in a new tab instead of using the side panel API.

### Code Changes

**Before:**

```typescript
const openSettings = async () => {
  try {
    const window = await chrome.windows.getCurrent();
    if (window.id && chrome.sidePanel) {
      await chrome.sidePanel.open({ windowId: window.id });
      self.close();
    } else {
      logger.warn("Side panel API not available");
    }
  } catch (err) {
    logger.error("Failed to open sidepanel", err as Error);
  }
};
```

**After:**

```typescript
const openSettings = async () => {
  try {
    // Detect if running in Firefox (sidePanel API not supported)
    const isFirefox = !chrome.sidePanel || navigator.userAgent.includes('Firefox');
    
    if (isFirefox) {
      // Firefox: Open sidepanel in a new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL('src/sidepanel/index.html'),
      });
      // Close the popup after opening tab
      self.close();
    } else {
      // Chrome: Use side panel API
      const window = await chrome.windows.getCurrent();
      if (window.id) {
        await chrome.sidePanel.open({ windowId: window.id });
        // Close the popup after opening sidepanel
        self.close();
      }
    }
  } catch (err) {
    logger.error("Failed to open settings", err as Error);
  }
};
```

---

## Behavior Now

### Chrome

- Settings cog opens side panel (panel slides in from right)
- Popup closes after side panel opens

### Firefox

- Settings cog opens sidepanel content in a new tab
- Popup closes after tab opens
- Full functionality available in the tab

---

## Testing

### Chrome

1. Click extension icon → popup opens
2. Click settings cog (⚙️)
3. ✅ Side panel should slide in from right
4. ✅ Popup should close

### Firefox

1. Click extension icon → popup opens
2. Click settings cog (⚙️)
3. ✅ New tab should open with sidepanel content
4. ✅ Popup should close
5. ✅ Can navigate between Providers, Items, Settings tabs

---

## Why This Approach?

### Detection Method

We use two checks to detect Firefox:

```typescript
const isFirefox = !chrome.sidePanel || navigator.userAgent.includes('Firefox');
```

1. **`!chrome.sidePanel`**: API doesn't exist in Firefox
2. **`navigator.userAgent.includes('Firefox')`**: Explicit Firefox detection

This ensures the workaround works even if Firefox adds `chrome.sidePanel` in the future but it doesn't work properly.

### Alternative Considered

We could have:

- Used `browser.runtime.getBrowserInfo()` - More accurate but async
- Modified the UI to hide the settings button - Bad UX
- Shown an error message - Confusing for users

Opening in a tab is the cleanest solution - users get full functionality with minimal difference in UX.

---

## Future Improvements

If Firefox adds side panel API support in the future:

1. Remove the Firefox detection
2. Let the API availability check (`!chrome.sidePanel`) handle it automatically
3. No code changes needed - will automatically use native API

---

## Impact

✅ **Firefox users can now access settings!**

- Settings tab works identically in both browsers
- Providers view accessible
- Items view accessible
- All functionality preserved

---

## Related Files

- `src/popup/hooks/useProviders.tsx` - Fixed openSettings function
- `docs/FIREFOX_TESTING.md` - Updated to reflect fix
- `docs/FIREFOX_IMPLEMENTATION.md` - Known issues section updated

---

**Status:** ✅ Resolved - Firefox compatibility improved
