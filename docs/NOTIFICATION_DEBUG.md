# 🔔 Notification Debugging Guide - UPDATED

## ✅ NEW: Test Notification Button Added

I've added a **"Test Notification"** button to the Settings page to help diagnose the issue.

---

## Quick Fix Steps

### 1. Reload the Extension

**CRITICAL:** The extension has been rebuilt with fixes and a test button.

1. Go to `chrome://extensions`
2. Find **"Live Folders"**
3. Click the **Reload** button (circular arrow icon)

### 2. Open the Sidepanel

1. Click the Live Folders extension icon
2. Click **"Open side panel"**
3. Go to the **Settings** tab

### 3. Enable Notification Settings

Make sure both checkboxes are checked:

- ✅ **"Enable notifications"**
- ✅ **"Notify on successful sync"**

### 4. Test Notifications

In the Settings tab, under the Notifications section:

1. Click the **"Test Notification"** button
2. Watch for a browser notification to appear

**What you should see:**

- A notification with title: **"Test Notification"**
- Message: **"If you see this, notifications are working! 🎉"**
- The Live Folders icon

---

## If Test Notification Works ✅

Great! Notifications are enabled. Now test a real sync:

1. Go to **Providers** tab
2. Click the **sync icon** (circular arrows) on a provider
3. You should see a notification like:
   > **GitHub synced successfully**
   > 3 added, 1 updated

---

## If Test Notification DOESN'T Work ❌

### Check 1: Browser Console Messages

1. Open `chrome://extensions`
2. Find "Live Folders"
3. Click **"service worker"** (opens DevTools)
4. Click the **"Test Notification"** button again
5. Look for messages in the console

**Expected logs:**

```text
[SettingsView] Testing notification...
[NotificationService] Notification shown: livefolder-xxxxx
[SettingsView] Test notification sent: livefolder-xxxxx
```

**If you see "Notifications disabled in settings":**

- The settings aren't being saved properly
- Try toggling the checkboxes OFF then ON
- Click **Save Changes**
- Try test button again

**If you see "Failed to show notification: Unable to download all specified images":**

- The icon path is wrong (should be fixed in latest build)
- Make sure you reloaded the extension
- Try rebuilding: `npm run build`

### Check 2: Chrome Notification Permission

Chrome needs permission to show notifications:

1. Right-click the Live Folders extension icon
2. Click **"Manage extension"**
3. Scroll down to **"Permissions"**
4. Make sure "Display notifications" is allowed

OR:

1. Go to Chrome Settings
2. Privacy and security → Site Settings → Notifications
3. Look for "Live Folders" or the extension ID
4. Make sure it's set to **"Allow"**

### Check 3: macOS System Notifications

If you're on macOS:

1. Open **System Settings** (or System Preferences)
2. Go to **Notifications**
3. Find **Google Chrome** in the list
4. Make sure:
   - ✅ "Allow notifications" is ON
   - ✅ Notification style is not "None"

**Also check:**

- ❌ Focus mode is OFF (or Chrome is allowed)
- ❌ Do Not Disturb is OFF

### Check 4: Windows Notification Settings

If you're on Windows:

1. Open **Settings**
2. System → Notifications
3. Find **Google Chrome**
4. Make sure notifications are enabled

**Also check:**

- ❌ Focus Assist is OFF (or Chrome is in priority list)

---

## Debug Console Commands

If the test button doesn't help, try these console commands:

### 1. Check Current Settings

In the **service worker console** (`chrome://extensions` → "service worker"):

```javascript
chrome.storage.local.get(['settings'], (result) => {
  console.log('Settings:', JSON.stringify(result.settings, null, 2));
});
```

### 2. Manually Enable Settings

```javascript
chrome.storage.local.get(['settings'], (result) => {
  const settings = result.settings || {};
  settings.enableNotifications = true;
  settings.notifyOnSuccess = true;
  settings.notifyOnError = true;
  chrome.storage.local.set({ settings }, () => {
    console.log('✅ Forced settings enabled:', settings);
  });
});
```

### 3. Test Raw Chrome Notification

```javascript
chrome.notifications.create('test-' + Date.now(), {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('public/icon-128.png'),
  title: 'Raw Chrome Test',
  message: 'Direct notification test'
}, (id) => {
  console.log('Created:', id);
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError);
  }
});
```

---

## Common Issues & Solutions

### Issue: "Test button shows success but no notification appears"

**Cause:** System-level notifications are blocked.

**Fix:**

1. Check macOS/Windows notification settings (see above)
2. Restart Chrome completely
3. Check if other Chrome extensions can show notifications

### Issue: "Settings keep reverting to disabled"

**Cause:** Settings not being saved to storage.

**Fix:**

1. Use the manual console command (section above)
2. Click Save Changes button after toggling checkboxes
3. Check browser console for storage errors

### Issue: "Icon loading error"

**Cause:** Extension not rebuilt after latest fix.

**Fix:**

```bash
cd /Users/garyclarke/GitHub/gxclarke/live-folders
npm run build
```

Then reload the extension.

---

## What's Been Fixed

1. ✅ **Icon path**: Changed from `logo.png` to `public/icon-128.png`
2. ✅ **NotificationService initialization**: Added to background service worker
3. ✅ **Sync integration**: Notifications now called after sync completes
4. ✅ **Debug logging**: Added logs to track notification flow
5. ✅ **Test button**: New UI button to test notifications directly

---

## Next Steps

1. ✅ Reload the extension
2. ✅ Open Settings tab
3. ✅ Enable notification checkboxes
4. ✅ Click **"Test Notification"** button
5. 📝 Report back what happens!

If the test button works but real sync notifications don't, we'll need to check the sync flow specifically.
