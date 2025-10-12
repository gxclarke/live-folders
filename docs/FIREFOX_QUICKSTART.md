# 🦊 Firefox Testing - Quick Start

**Status:** ✅ Ready to test  
**Firefox Support:** Enabled

---

## Quick Commands

### Test in Firefox (Development)

```bash
npm run dev:firefox
```

**What this does:**

1. Builds the extension
2. Patches manifest for Firefox compatibility
3. Launches Firefox with extension loaded
4. Auto-reloads on file changes

**You should see Firefox open with:**

- Extension installed as temporary add-on
- Debugging page at `about:debugging`
- Extension icon in toolbar

### Build for Firefox (Production)

```bash
npm run build:firefox
```

**Output:** `artifacts/live_folders-1.0.0.xpi`

---

## What Was Fixed

### ✅ Service Worker → Scripts Array

Firefox doesn't support `background.service_worker` yet. The build process automatically converts it to `scripts` array.

### ✅ Removed Unsupported Features

- `sidePanel` permission (not in Firefox)
- `contentSettings` permission (not needed)
- `side_panel` field (Chrome-only)

### ✅ Added Firefox Settings

- `browser_specific_settings` with extension ID
- Minimum Firefox version: 109.0

---

## Test Checklist

### Basic Functionality

- [ ] Extension loads without errors
- [ ] Click extension icon → popup opens
- [ ] Provider cards display
- [ ] Settings accessible

### Authentication

- [ ] GitHub OAuth works
- [ ] Token persists

### Sync

- [ ] Manual sync creates bookmarks
- [ ] Bookmark folders created correctly
- [ ] Settings persist

### Notifications

- [ ] Test button works
- [ ] Sync notifications appear

---

## Known Issues

### ⚠️ Side Panel Button

**Issue:** "Open side panel" button won't work in Firefox (not supported)

**Workaround:** Extension still works - settings are accessible via popup or can be opened in a new tab

**TODO:** Detect Firefox and change button behavior to open in new tab instead

---

## Debugging

### Check if Extension Loaded

1. Firefox should auto-open to: `about:debugging#/runtime/this-firefox`
2. Look for "Live Folders" in the list
3. Click "Inspect" to see background console

### View Console Logs

Background script console shows:

- Sync operations
- Authentication flows
- Notification attempts
- Any errors

### Common Issues

**Extension doesn't load:**

- Check console output when running `npm run dev:firefox`
- Look for manifest errors
- Verify Firefox version ≥ 109.0

**OAuth fails:**

- Firefox has stricter redirect URI requirements
- Check console for redirect errors
- May need to update `auth-manager.ts`

---

## Files Created

1. **`scripts/patch-firefox-manifest.js`**
   - Automatic manifest patcher
   - Converts Chrome MV3 → Firefox-compatible format

2. **`docs/FIREFOX_TESTING.md`**
   - Comprehensive testing guide
   - API compatibility matrix
   - Debugging instructions

3. **`docs/FIREFOX_IMPLEMENTATION.md`**
   - Implementation details
   - Build process explanation
   - Known limitations

---

## Next Steps

1. **Run Firefox:**

   ```bash
   npm run dev:firefox
   ```

2. **Test core features:**
   - Popup UI
   - Authentication
   - Sync
   - Notifications

3. **Document issues:**
   - Create GitHub issues for Firefox-specific bugs
   - Tag with `browser:firefox`

4. **Fix side panel:**
   - Detect Firefox browser
   - Open sidepanel in tab instead
   - Update button text

---

## Resources

- **Comprehensive Guide:** `docs/FIREFOX_TESTING.md`
- **Implementation Details:** `docs/FIREFOX_IMPLEMENTATION.md`
- **Patch Script:** `scripts/patch-firefox-manifest.js`

---

**Ready to test! 🚀** Firefox should be running right now with your extension loaded.
