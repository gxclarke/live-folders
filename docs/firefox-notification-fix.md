# Firefox Notification Fix

**Date:** October 10, 2025
**Issue:** Sync error when using notifications in Firefox
**Status:** ✅ Fixed

## Problem

When clicking "Sync Now" for a provider in Firefox, the following error occurred:

```text
Type error for parameter options (Property "buttons" is unsupported by Firefox)
for notifications.create.
```

## Root Cause

Firefox's `browser.notifications.create()` API does not support the `buttons` property that Chrome/Edge support. The notification service was always including the `buttons` property regardless of the browser.

### Browser API Differences

**Chrome/Edge:**

```typescript
browser.notifications.create(id, {
  type: "basic",
  iconUrl: "...",
  title: "...",
  message: "...",
  priority: 1,
  buttons: [{ title: "Action" }]  // ✅ Supported
});
```

**Firefox:**

```typescript
browser.notifications.create(id, {
  type: "basic",
  iconUrl: "...",
  title: "...",
  message: "...",
  priority: 1,
  // buttons: [...]  // ❌ Not supported - throws error
});
```

## Solution

Modified `NotificationService.showBrowserNotification()` to detect Firefox and conditionally exclude the `buttons` property:

```typescript
private async showBrowserNotification(
  data: NotificationData,
  buttons?: Array<{ title: string }>,
): Promise<void> {
  const iconUrl = browser.runtime.getURL("public/icon-128.png");

  // Firefox doesn't support buttons in notifications
  const isFirefox = navigator.userAgent.includes("Firefox");

  const notificationOptions: browser.Notifications.CreateNotificationOptions = {
    type: "basic" as const,
    iconUrl,
    title: data.title,
    message: data.message,
    priority: data.priority,
    // Only include buttons for Chrome/Edge (Firefox will throw an error)
    ...(isFirefox ? {} : { buttons: buttons?.slice(0, 2) }), // Max 2 buttons
  };

  await browser.notifications.create(data.id, notificationOptions);
}
```

## Changes Made

**File:** `src/services/notification-service.ts`

1. Added Firefox detection: `const isFirefox = navigator.userAgent.includes("Firefox")`
2. Made `buttons` property conditional using spread operator
3. Added `isFirefox` to logging for debugging
4. Added proper TypeScript typing: `browser.Notifications.CreateNotificationOptions`

## Testing

### Chrome/Edge

- ✅ Notifications work with buttons
- ✅ No errors or warnings

### Firefox

- ✅ Notifications work without buttons
- ✅ No "unsupported property" errors
- ✅ Sync completes successfully

## Related Issues

- Firefox bookmark folder creation (fixed in `docs/firefox-bookmark-fix.md`)
- Firefox side panel fallback (fixed in `docs/firefox-sidepanel-fix.md`)
- Firefox manifest patching (documented in `docs/FIREFOX_IMPLEMENTATION.md`)

## Future Improvements

Consider using feature detection instead of user agent sniffing:

```typescript
// Instead of: navigator.userAgent.includes("Firefox")
// Use: typeof browser.notifications.NotificationOptions.buttons === 'undefined'
```

However, TypeScript type definitions make this difficult to check at runtime, so user agent detection is the simpler approach.
