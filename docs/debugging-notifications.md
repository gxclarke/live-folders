# Debugging Notifications - Troubleshooting Guide

## ✅ Fixed Issues

### Icon Loading Error (RESOLVED)

**Error:** `Failed to show notification: Error: Unable to download all specified images.`

**Fix Applied:** Changed notification icon path from `logo.png` to `public/icon-128.png` in NotificationService.

If you see this error, rebuild the extension with `npm run build` and reload.

---

## Quick Checklist

If notifications aren't appearing, verify these steps:

### 1. Extension Reload ✅

**CRITICAL:** After rebuilding, you MUST reload the extension:

1. Open Chrome → Extensions page (`chrome://extensions`)
2. Find "Live Folders"
3. Click the **Reload** icon (circular arrow)
4. Or disable/enable the extension

### 2. Settings Configuration ✅

Open the sidepanel → Settings tab and verify:

- ☑️ **"Enable notifications"** is checked (master toggle)
- ☑️ **"Notify on successful sync"** is checked

**NOTE:** `notifyOnSuccess` defaults to **FALSE** in the code. You must manually enable it!

### 3. Browser Permissions ✅

Check if browser notifications are blocked:

1. Right-click the extension icon → "Manage Extension"
2. Check "Site Settings" → Notifications
3. Or check Chrome Settings → Privacy and Security → Site Settings → Notifications
4. Make sure Chrome itself allows notifications (system level on macOS)

### 4. Trigger a Sync ✅

Notifications only appear when sync actually runs:

1. Open sidepanel → Providers tab
2. Click the sync icon on a provider card
3. Or wait for automatic sync (default: 1 minute interval)

### 5. Check Console Logs 🔍

Open Chrome DevTools for the extension:

1. Go to `chrome://extensions`
2. Find "Live Folders"
3. Click "service worker" link (under "Inspect views")
4. Look for these log messages:

**Success path:**

```text
[SyncEngine] Notification settings: enableNotifications=true, notifyOnSuccess=true
[SyncEngine] Sending success notification: GitHub - 3 added, 1 updated
[NotificationService] Notification shown: livefolder-1234567890-abc123
```

**If disabled:**

```text
[SyncEngine] Notification settings: enableNotifications=true, notifyOnSuccess=false
[SyncEngine] Success notifications disabled - skipping notification
```

**If master toggle off:**

```text
[SyncEngine] Notification settings: enableNotifications=false, notifyOnSuccess=true
[SyncEngine] Success notifications disabled - skipping notification
```

### 6. Test with Error Notification 🧪

Error notifications are easier to test:

1. Enable "Notify on error" in Settings
2. Disconnect your internet
3. Trigger a manual sync
4. You should see an error notification

## Common Issues

### Issue: "No logs in console"

**Solution:** The service worker might be inactive.

1. Trigger any action (open sidepanel, click sync button)
2. Refresh the service worker console
3. Check if logs appear

### Issue: "Settings always show false"

**Solution:** Settings might not be saved.

1. Open sidepanel → Settings
2. Toggle "Enable notifications" OFF then ON
3. Toggle "Notify on successful sync" OFF then ON
4. Check console logs again after sync

### Issue: "Logs show notification sent but nothing appears"

**Possible causes:**

1. **Browser notification permission denied**
   - Check Chrome settings for notification permissions
   - Check macOS System Settings → Notifications → Chrome

2. **Do Not Disturb enabled** (macOS/Windows)
   - Check system notification settings

3. **Chrome notification bug**
   - Try restarting Chrome completely

### Issue: "Rate limited"

If you see: `Notification rate limited for github`

**Solution:** Wait 5 seconds between syncs of the same provider (this is by design).

## Verification Steps

1. ✅ Rebuild: `npm run build`
2. ✅ Reload extension in Chrome
3. ✅ Enable both notification settings
4. ✅ Trigger manual sync
5. ✅ Check service worker console logs
6. ✅ Verify notification appears

## Debug Logging

If issues persist, enable debug mode:

1. Open sidepanel → Settings
2. Enable "Debug mode"
3. Check console for more verbose logs

## Test Notification Manually

You can test notifications directly in the console:

```javascript
// In service worker console:
const { notificationService } = await import('./services/notification-service.js');
await notificationService.notify({
  type: 'SYNC_SUCCESS',
  title: 'Test Notification',
  message: 'This is a test'
});
```

## Next Steps

If none of these work:

1. Check browser console (F12) for JavaScript errors
2. Verify `manifest.json` has "notifications" permission (it should)
3. Try creating a minimal test notification in service worker console
4. Check if other Chrome extensions can show notifications
