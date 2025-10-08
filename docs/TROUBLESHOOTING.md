# Troubleshooting Guide

This guide helps you diagnose and fix common issues with Live Folders.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Sync Problems](#sync-problems)
- [Bookmark Issues](#bookmark-issues)
- [Performance Problems](#performance-problems)
- [Error Messages](#error-messages)
- [Debug Mode](#debug-mode)
- [Getting Support](#getting-support)

---

## Authentication Issues

### Provider Won't Connect

**Symptoms:**

- OAuth window closes without success
- "Not Connected" status persists
- Authentication error messages

**Diagnostic Steps:**

1. **Check Browser Popup Settings**

   ```text
   Problem: OAuth window is blocked
   Solution: Allow popups for the extension
   ```

   - Click the popup blocker icon in address bar
   - Allow popups from the extension
   - Try connecting again

2. **Verify Internet Connection**

   - Ensure stable internet connection
   - Check if provider website is accessible
   - Try accessing GitHub/Jira directly in browser

3. **Clear Extension Data**

   - Go to `chrome://extensions/`
   - Find Live Folders
   - Click "Remove extension data"
   - Try authenticating again

4. **Check Browser Console**

   - Open DevTools (F12)
   - Look for authentication errors
   - See [Debug Mode](#debug-mode) for details

**Solutions:**

✅ **For GitHub:**

- Ensure you're logged into GitHub
- Check GitHub isn't experiencing downtime
- Verify OAuth app permissions in GitHub settings
- Try revoking and re-authorizing

✅ **For Jira:**

- Verify Jira URL is correct (e.g., `company.atlassian.net`)
- Check API token is valid (for token auth)
- Ensure credentials haven't expired
- Try regenerating API token

### Authentication Randomly Fails

**Symptoms:**

- Provider disconnects unexpectedly
- "Re-authenticate" messages appear
- Intermittent connection issues

**Causes:**

- Token expired
- Provider API changes
- Network interruptions

**Solutions:**

1. **Re-authenticate**
   - Go to Providers tab
   - Click "Connect" again
   - Complete OAuth flow

2. **Check Token Refresh**
   - Extension should auto-refresh tokens
   - If failing, check browser console
   - Enable Debug Mode for details

3. **Verify Provider Status**
   - Check provider status page
   - Ensure API is operational
   - Check for maintenance windows

---

## Sync Problems

### Items Not Syncing

**Symptoms:**

- Bookmark folder remains empty
- No new items appearing
- Old items not updating
- Last sync timestamp not changing

**Diagnostic Checklist:**

- [ ] Provider is connected (green checkmark)
- [ ] Provider is enabled (toggle ON)
- [ ] Bookmark folder is selected
- [ ] Sync interval is configured
- [ ] No error messages in console

**Step-by-Step Solutions:**

**1. Verify Provider Status**

```text
Go to: Providers tab
Check: Connection status = "Connected"
Check: Toggle switch = ON (green)
Action: If not connected, re-authenticate
```

**2. Confirm Folder Selection**

```text
Go to: Providers tab
Check: Folder dropdown shows a folder name
Action: If empty, select a folder
Note: Folder must exist in bookmarks
```

**3. Manual Sync Test**

```text
Go to: Providers tab
Click: "Sync Now" button
Wait: 5-10 seconds
Check: Last sync timestamp updates
```

**4. Check Console for Errors**

```text
Open: DevTools (F12)
Tab: Console
Filter: Look for [Live Folders] messages
Check: Any red error messages?
```

**5. Verify Sync Interval**

```text
Go to: Settings tab
Check: Sync interval is set (1-60 min)
Action: Try setting to 5 minutes
Click: Save
Wait: 5 minutes and check bookmarks
```

### Sync Fails with Errors

**Common Error Messages:**

**"Rate limit exceeded"**

```text
Cause: Too many API calls to provider
Solution:
1. Increase sync interval to 30+ minutes
2. Wait for rate limit to reset (usually 1 hour)
3. Reduce max items per provider
```

**"Network request failed"**

```text
Cause: Internet connection or provider API issue
Solution:
1. Check internet connection
2. Verify provider website is accessible
3. Check provider status page
4. Try again in a few minutes
```

**"Authentication required"**

```text
Cause: Token expired or invalid
Solution:
1. Go to Providers tab
2. Click "Connect" to re-authenticate
3. Complete OAuth flow
```

**"Bookmark operation failed"**

```text
Cause: Bookmark API permission issue
Solution:
1. Check extension has bookmark permissions
2. Try selecting a different folder
3. Check folder still exists
4. Restart browser
```

### Partial Sync (Some Items Missing)

**Symptoms:**

- Only some items synced
- Expected items not appearing
- Count doesn't match provider

**Causes & Solutions:**

**1. Max Items Limit Reached**

```text
Check: Settings > Max Items Per Provider
Current: Default is 100
Action: Increase limit if needed
Note: Higher limits = more bookmarks
```

**2. Provider Query Filters**

```text
GitHub: Only shows PRs you authored or review
Jira: Only shows issues assigned to you
Action: Check provider for more items
Note: Filters are built into provider logic
```

**3. API Pagination Issues**

```text
Symptom: Exactly 100 items (or another round number)
Cause: API pagination limit
Action: Check browser console for errors
```

---

## Bookmark Issues

### Duplicate Bookmarks

**Symptoms:**

- Same item appears multiple times
- Old versions not removed
- Cluttered bookmark folder

**Causes:**

- URL changed for item
- Folder changed during sync
- Extension reinstalled

**Solutions:**

**Quick Fix:**

1. Manually delete duplicate bookmarks
2. Next sync will maintain clean state

**Deep Clean:**

1. Disable provider (toggle OFF)
2. Delete all bookmarks in folder
3. Re-enable provider (toggle ON)
4. Click "Sync Now"
5. Fresh sync with no duplicates

**Prevention:**

```text
- Don't change folders during sync
- Let extension manage bookmark lifecycle
- Avoid manual bookmark edits in sync folder
```

### Bookmarks Disappear

**Symptoms:**

- Synced bookmarks vanish
- Folder becomes empty
- Items deleted unexpectedly

**Causes:**

**1. Items No Longer Match Criteria**

```text
GitHub: PR was merged or closed
Jira: Issue was marked as Done
Action: This is expected behavior
Note: Extension only syncs active items
```

**2. Folder Deleted or Changed**

```text
Check: Folder still exists in bookmarks
Check: Provider configuration shows correct folder
Action: Re-select folder in Providers tab
```

**3. Provider Disabled**

```text
Check: Provider toggle is ON
Check: Provider is connected
Action: Re-enable if needed
```

**4. Extension Disabled**

```text
Check: Extension is enabled in chrome://extensions/
Action: Enable extension
Note: Re-sync will restore bookmarks
```

### Wrong Bookmark Folder

**Symptoms:**

- Items appear in unexpected folder
- Can't find synced bookmarks
- Items in wrong location

**Solutions:**

1. **Check Provider Configuration**

   - Go to Providers tab
   - Look at folder dropdown
   - Verify correct folder selected

2. **Change Folder**

   - Select new folder in dropdown
   - Click "Sync Now"
   - Items will move to new location

3. **Clean Up Old Location**
   - Manually delete bookmarks from old folder
   - Or disable provider temporarily
   - Re-enable with correct folder

---

## Performance Problems

### Slow Sync Operations

**Symptoms:**

- Sync takes minutes to complete
- Browser becomes unresponsive
- High CPU/memory usage

**Solutions:**

**1. Reduce Max Items**

```text
Go to: Settings tab
Current: Max Items Per Provider
Action: Lower from 100 to 50 or 25
Click: Save
```

**2. Increase Sync Interval**

```text
Go to: Settings tab
Current: Sync interval
Action: Change from 5 min to 30 min
Click: Save
Benefit: Reduces background processing
```

**3. Disable Unused Providers**

```text
Go to: Providers tab
Action: Toggle OFF providers you don't use
Benefit: Reduces sync workload
```

**4. Clear Browser Cache**

```text
Go to: chrome://settings/clearBrowserData
Select: Cached images and files
Time range: All time
Click: Clear data
```

### High Memory Usage

**Symptoms:**

- Browser using lots of RAM
- Tab crashes
- System slowdown

**Solutions:**

1. **Reduce Item Count**

   - Lower max items per provider
   - Disable unused providers
   - Sync less frequently

2. **Restart Browser**

   - Close all tabs
   - Restart Chrome
   - Memory should normalize

3. **Check for Conflicts**
   - Disable other extensions temporarily
   - Check if problem persists
   - Re-enable one at a time

---

## Error Messages

### "Extension error occurred"

**Meaning:** Unexpected error in extension code

**Debug Steps:**

1. Enable Debug Mode
2. Check console for stack trace
3. Note which action triggered error
4. Report issue with details

**Quick Fix:**

- Reload extension (chrome://extensions/)
- Restart browser
- Reinstall if persists

### "Failed to fetch from provider"

**Meaning:** Can't retrieve data from GitHub/Jira

**Causes:**

- Network connection issue
- Provider API down
- Rate limit exceeded
- Authentication expired

**Solutions:**

1. Check internet connection
2. Verify provider website accessible
3. Re-authenticate if needed
4. Wait and try again

### "Bookmark folder not found"

**Meaning:** Selected folder no longer exists

**Solutions:**

1. Go to Providers tab
2. Select a different folder
3. Or create the missing folder
4. Click "Sync Now"

---

## Debug Mode

### Enabling Debug Mode

**Steps:**

1. Open sidepanel (click extension icon → Settings)
2. Go to **Settings** tab
3. Scroll to **Advanced** section
4. Check ✅ **Debug Mode**
5. Click **Save**

**What It Does:**

- Enables detailed console logging
- Shows all API calls
- Displays sync operations
- Logs state changes
- Helps diagnose issues

### Reading Debug Logs

**Open Console:**

```text
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Console" tab
3. Look for messages starting with [Live Folders]
```

**Log Levels:**

```text
[Live Folders:INFO] - General information
[Live Folders:WARN] - Warnings (not critical)
[Live Folders:ERROR] - Errors (requires attention)
[Live Folders:DEBUG] - Detailed debug info
```

**What to Look For:**

```text
✅ Green messages = Success
⚠️ Yellow messages = Warnings
❌ Red messages = Errors

Common patterns:
- "Syncing provider: github" = Sync started
- "Sync complete: X items" = Sync successful
- "Authentication failed" = Auth issue
- "Rate limit exceeded" = Too many requests
```

### Collecting Debug Information

**For Bug Reports:**

1. Enable Debug Mode
2. Reproduce the issue
3. Copy relevant console logs
4. Note:
   - Browser version
   - Extension version
   - Steps to reproduce
   - Expected vs actual behavior

**Example Log Collection:**

```text
Right-click in Console → Save as... → debug-logs.txt
Or:
Select log messages → Right-click → Copy
```

---

## Getting Support

### Before Asking for Help

**Please Check:**

- [ ] Read this troubleshooting guide
- [ ] Checked [FAQ](USER_GUIDE.md#faq) in user guide
- [ ] Enabled Debug Mode and checked console
- [ ] Tried basic fixes (restart, re-auth, etc.)
- [ ] Searched existing GitHub issues

### How to Report Issues

**Good Bug Reports Include:**

1. **Description**

   ```text
   Clear description of the problem
   What you expected to happen
   What actually happened
   ```

2. **Steps to Reproduce**

   ```text
   1. Go to...
   2. Click...
   3. Observe...
   ```

3. **Environment**

   ```text
   - Browser: Chrome 118.0.5993.88
   - OS: macOS 14.0
   - Extension Version: 1.0.0
   - Provider: GitHub
   ```

4. **Debug Logs**

   ```text
   Paste relevant console logs
   Include timestamps if helpful
   Remove sensitive information (tokens, emails)
   ```

5. **Screenshots**

   ```text
   Show error messages
   Show extension state
   Highlight relevant UI
   ```

### Where to Get Help

**📖 Documentation:**

- [User Guide](USER_GUIDE.md) - Full documentation
- [Quick Start](QUICK_START.md) - Getting started
- [FAQ](USER_GUIDE.md#faq) - Common questions

**🐛 Bug Reports:**

- [GitHub Issues](https://github.com/gxclarke/live-folders/issues)
- Check existing issues first
- Use issue templates
- Provide debug information

**💡 Feature Requests:**

- [GitHub Discussions](https://github.com/gxclarke/live-folders/discussions)
- Describe use case
- Explain expected behavior
- Vote on existing requests

**👥 Community:**

- [GitHub Discussions](https://github.com/gxclarke/live-folders/discussions)
- Ask questions
- Share tips and tricks
- Help other users

---

## Quick Reference

### Reset Everything

**Nuclear Option (Last Resort):**

1. Disable all providers
2. Delete all synced bookmarks
3. Go to `chrome://extensions/`
4. Click "Remove" on Live Folders
5. Reinstall extension
6. Reconfigure from scratch

### Common Command Reference

```text
Open Popup: Click extension icon
Open Sidepanel: Popup → Settings button
Manual Sync: Providers tab → Sync Now
Re-authenticate: Providers tab → Connect
Debug Mode: Settings tab → Advanced → Debug Mode
Extension Settings: chrome://extensions/
Clear Data: chrome://extensions/ → Details → Remove extension data
```

### Diagnostic Checklist

```text
[ ] Extension enabled in chrome://extensions/
[ ] Provider connected (green checkmark)
[ ] Provider enabled (toggle ON)
[ ] Bookmark folder selected
[ ] Sync interval configured
[ ] Internet connection working
[ ] Provider website accessible
[ ] No console errors
[ ] Debug mode enabled (for investigation)
```

---

**Still Having Issues?**

Open a [GitHub Issue](https://github.com/gxclarke/live-folders/issues) with:

- Description of problem
- Steps to reproduce
- Debug logs
- Environment details

We're here to help! 🚀
