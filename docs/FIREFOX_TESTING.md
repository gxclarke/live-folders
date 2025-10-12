# 🦊 Firefox Compatibility Testing Guide

**Date:** October 10, 2025  
**Status:** Ready for testing

---

## Quick Start

### Option 1: Run Firefox with Auto-Reload (Recommended for Development)

```bash
npm run dev:firefox
```

This will:

- Launch Firefox with the extension loaded
- Auto-reload the extension when files change
- Open the debugging page automatically

### Option 2: Manual Testing in Firefox

```bash
# Build the extension
npm run build

# Then load manually:
# 1. Open Firefox
# 2. Go to about:debugging#/runtime/this-firefox
# 3. Click "Load Temporary Add-on"
# 4. Navigate to dist/ and select manifest.json
```

### Option 3: Build Firefox Package (.xpi)

```bash
npm run build:firefox
```

This creates a signed `.xpi` file in the `artifacts/` directory.

---

## 🔍 Firefox-Specific Compatibility Checks

### Critical API Differences to Test

#### 1. **Side Panel API** ⚠️ **CRITICAL**

**Status:** Chrome-only feature (as of Oct 2025)

Firefox doesn't support `chrome.sidePanel` yet. We need to verify fallback behavior.

**Test:**

1. Load extension in Firefox
2. Click the extension icon
3. **Expected:** Popup should still work
4. **Issue:** "Open side panel" button may not work

**Fix needed if broken:** We should detect Firefox and either:

- Hide the "Open side panel" button in Firefox
- Open sidepanel in a new tab instead

#### 2. **Service Worker vs Background Scripts**

**Chrome:** Uses `service_worker` (MV3)  
**Firefox:** May need `background.scripts` for older versions

**Test:**

1. Open Firefox DevTools for extension
2. Check if background script loads
3. Look for errors in console

**Current config:**

```typescript
background: {
  service_worker: "src/background/main.ts",
  type: "module",
}
```

**If broken:** May need conditional config for Firefox:

```typescript
background: {
  scripts: ["src/background/main.ts"], // Firefox fallback
}
```

#### 3. **Notifications**

**Test:**

1. Enable notifications in Settings
2. Trigger a sync
3. Check if notification appears

**Firefox-specific:**

- Notification icon paths may differ
- Firefox uses `browser.notifications` (webextension-polyfill should handle this)

#### 4. **Identity/OAuth**

**Chrome:** `chrome.identity.launchWebAuthFlow()`  
**Firefox:** May have different OAuth flow

**Test:**

1. Try to authenticate with GitHub provider
2. Check if OAuth popup opens
3. Verify redirect back to extension

**Known issue:** Firefox has stricter redirect URI requirements

#### 5. **Bookmarks API**

**Test:**

1. Sync a provider
2. Check if bookmarks are created in Firefox
3. Verify folder structure

**Should work:** Both Chrome and Firefox support `browser.bookmarks` identically

#### 6. **Storage API**

**Test:**

1. Change settings and save
2. Close and reopen extension
3. Verify settings persist

**Should work:** `browser.storage.local` is identical across browsers

---

## 📋 Test Checklist

### Phase 1: Extension Loading

- [ ] Extension loads without errors in `about:debugging`
- [ ] No manifest errors in console
- [ ] Background service worker starts
- [ ] Icons display correctly (16px, 32px, 48px, 128px)

### Phase 2: Popup UI

- [ ] Clicking extension icon opens popup
- [ ] Popup displays correctly (no layout issues)
- [ ] Provider cards show
- [ ] Quick sync buttons work
- [ ] "Open side panel" button behavior (may not work - see Issue #1)

### Phase 3: Side Panel (Firefox Limitations)

- [ ] **Expected to fail:** Side panel may not open in Firefox
- [ ] Document workaround: Open settings in new tab instead
- [ ] Consider: Detect Firefox and show different UI

### Phase 4: Provider Authentication

- [ ] GitHub OAuth flow works
  - [ ] Auth button clicks
  - [ ] OAuth popup opens
  - [ ] Redirect back to extension
  - [ ] Token stored successfully
- [ ] Jira authentication works (if using API token, should be fine)

### Phase 5: Sync Functionality

- [ ] Manual sync triggers
- [ ] Items are fetched from providers
- [ ] Bookmarks are created in Firefox
- [ ] Folder structure matches Chrome behavior
- [ ] Sync status updates correctly

### Phase 6: Notifications

- [ ] Notification permission requested
- [ ] Test notification button works
- [ ] Success notifications appear after sync
- [ ] Error notifications appear on failure
- [ ] Notification icon displays (Firefox may need different path)

### Phase 7: Settings

- [ ] Settings page loads (popup or tab)
- [ ] All toggles work
- [ ] Sync interval slider works
- [ ] Theme switching works
- [ ] Settings persist after reload

### Phase 8: Storage & Persistence

- [ ] Provider configurations saved
- [ ] Authentication tokens persist
- [ ] Bookmark metadata stored
- [ ] Settings survive browser restart

### Phase 9: Error Handling

- [ ] Network errors handled gracefully
- [ ] Invalid tokens show proper errors
- [ ] Rate limiting works
- [ ] Conflict resolution works

### Phase 10: Performance

- [ ] Extension doesn't slow down Firefox
- [ ] Memory usage reasonable
- [ ] No console errors or warnings
- [ ] Background script doesn't consume excessive CPU

---

## 🐛 Known Firefox Issues & Workarounds

### Issue #1: Side Panel Not Supported

**Symptom:** "Open side panel" button does nothing

**Workaround:**

1. Detect Firefox: Check `navigator.userAgent` or `browser.runtime.getBrowserInfo()`
2. In Firefox: Open sidepanel content in a new tab instead
3. Update UI: Show "Open in new tab" for Firefox users

**Code fix location:** `src/popup/App.tsx`

```typescript
// Detect Firefox
const isFirefox = navigator.userAgent.includes('Firefox');

// In button handler:
if (isFirefox) {
  browser.tabs.create({ url: browser.runtime.getURL('src/sidepanel/index.html') });
} else {
  browser.sidePanel.open();
}
```

### Issue #2: OAuth Redirect URI

**Symptom:** OAuth flow fails after authorization

**Workaround:**

1. Firefox requires redirect URI to match exactly
2. Check `browser.identity.getRedirectURL()`
3. Update OAuth config for Firefox

**Code fix location:** `src/services/auth-manager.ts`

### Issue #3: Service Worker Support

**Symptom:** Background script doesn't load

**Workaround:**
Firefox MV3 support is still evolving. May need:

```typescript
// manifest.config.ts
background: {
  // For Firefox compatibility
  scripts: isFirefox ? ["src/background/main.ts"] : undefined,
  service_worker: !isFirefox ? "src/background/main.ts" : undefined,
  type: "module",
}
```

---

## 🔧 Debugging Tools

### Firefox DevTools for Extensions

1. **Open debugging page:**

   ```text
   about:debugging#/runtime/this-firefox
   ```

2. **Inspect extension:**
   - Click "Inspect" under your extension
   - Opens DevTools for background script

3. **View popup console:**
   - Right-click extension icon → "Inspect Popup"

4. **Check manifest errors:**
   - Errors shown in red on debugging page

### Browser Console

Open with: `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Shift+J` (macOS)

Filter by extension:

```javascript
// Show only extension logs
console.log('[LiveFolders]', 'message');
```

### web-ext CLI Debugging

```bash
# Verbose output
web-ext run --verbose --source-dir=dist

# Specific Firefox version
web-ext run --firefox=/Applications/Firefox.app/Contents/MacOS/firefox

# Custom profile
web-ext run --firefox-profile=dev-profile

# Auto-reload on changes
web-ext run --watch-file=dist/**/*
```

---

## 📊 Compatibility Matrix

| Feature | Chrome | Firefox | Status | Notes |
|---------|--------|---------|--------|-------|
| Manifest V3 | ✅ Full | ⚠️ Partial | ⚠️ | Firefox MV3 support limited |
| Service Worker | ✅ Yes | ⚠️ Experimental | ⚠️ | May need fallback |
| Side Panel | ✅ Yes | ❌ No | ❌ | **Use tabs in Firefox** |
| Bookmarks API | ✅ Yes | ✅ Yes | ✅ | Identical |
| Storage API | ✅ Yes | ✅ Yes | ✅ | Identical |
| Notifications | ✅ Yes | ✅ Yes | ✅ | Should work |
| Identity/OAuth | ✅ Yes | ⚠️ Different | ⚠️ | Redirect URI differs |
| Alarms API | ✅ Yes | ✅ Yes | ✅ | Identical |
| webextension-polyfill | ✅ Yes | ✅ Yes | ✅ | Handles differences |

---

## 🚀 Next Steps

1. **Run initial test:**

   ```bash
   npm run dev:firefox
   ```

2. **Test core functionality:**
   - Extension loads
   - Popup works
   - Settings accessible
   - Authentication works
   - Sync creates bookmarks

3. **Document issues:**
   - Create GitHub issues for Firefox-specific bugs
   - Tag with `browser:firefox` label

4. **Fix critical issues:**
   - Side panel fallback (use tabs)
   - OAuth redirect (if broken)
   - Service worker (if not loading)

5. **Test again:**
   - Verify all fixes work
   - Run full test checklist

6. **Update README:**
   - Add Firefox compatibility notes
   - Document known limitations
   - Provide installation instructions

---

## 📝 Reporting Issues

When reporting Firefox-specific bugs:

**Include:**

- Firefox version: `Help → About Firefox`
- Extension manifest version
- Console error messages
- Steps to reproduce
- Expected vs actual behavior

**Template:**

```markdown
## Firefox Bug Report

**Firefox Version:** 119.0
**Extension Version:** 1.0.0
**OS:** macOS 14.0

**Bug:** [Brief description]

**Steps to Reproduce:**
1. Load extension in Firefox
2. Click X
3. Observe Y

**Expected:** Should do Z

**Actual:** Does W instead

**Console Errors:**

```text
[error log here]
```

**Screenshots:** [if applicable]

---

## ✅ Success Criteria

Extension is **Firefox-compatible** when:

- ✅ Loads without manifest errors
- ✅ Background script runs
- ✅ Popup UI displays correctly
- ✅ Authentication flow works (OAuth or token)
- ✅ Sync creates bookmarks in Firefox
- ✅ Settings persist across sessions
- ✅ Notifications appear (if enabled)
- ✅ No critical errors in console
- ⚠️ Side panel alternative implemented (open in tab)

---

## 📚 Resources

- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [web-ext CLI Reference](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/)
- [Firefox MV3 Support](https://blog.mozilla.org/addons/2022/05/18/manifest-v3-in-firefox-recap-next-steps/)
- [Browser Compatibility Table](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs)

---

**Good luck with Firefox testing! 🦊**
