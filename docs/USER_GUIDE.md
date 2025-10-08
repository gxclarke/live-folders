# Live Folders User Guide

Welcome to **Live Folders** - the browser extension that automatically syncs your GitHub PRs, Jira issues, and other items directly to your browser bookmarks!

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Using the Popup](#using-the-popup)
- [Using the Sidepanel](#using-the-sidepanel)
- [Provider Setup](#provider-setup)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

Live Folders keeps your work items synchronized as browser bookmarks. Never lose track of your:

- **GitHub Pull Requests** - PRs you authored or are reviewing
- **Jira Issues** - Issues assigned to you
- *(More providers coming soon!)*

### Key Features

- ✅ **Automatic Syncing** - Configurable sync intervals (1-60 minutes)
- ✅ **OAuth Authentication** - Secure provider connections
- ✅ **Smart Organization** - Choose which bookmark folder to use
- ✅ **Real-time Search** - Find items instantly across all providers
- ✅ **Quick Access** - One-click to open any synced item

---

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Live Folders page on Chrome Web Store
2. Click "Add to Chrome"
3. Confirm the permissions
4. The extension icon will appear in your toolbar

### From Source (Developer Mode)

1. Clone or download the repository
2. Run `npm install` and `npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right)
5. Click "Load unpacked"
6. Select the `dist` folder from the project

---

## Quick Start

### 1. Open the Extension

Click the Live Folders icon in your browser toolbar to open the popup.

### 2. Connect a Provider

1. Click the **Settings** button (gear icon) to open the sidepanel
2. Go to the **Providers** tab
3. Click **Connect** next to GitHub or Jira
4. Complete the OAuth flow in the popup window
5. The provider will show "Connected" when successful

### 3. Configure Sync

1. In the **Providers** tab, select a bookmark folder for each provider
2. Toggle the provider **ON** (switch on the right)
3. Click **Sync Now** to perform your first sync

### 4. Access Your Items

- **Popup**: View provider status and quick sync
- **Items Tab**: Browse and search all synced bookmarks
- **Bookmarks Bar**: Items appear in your chosen folder

---

## Using the Popup

The popup provides quick access to your providers and sync operations.

### Provider Cards

Each provider card shows:

- **Provider Icon** - GitHub or Jira logo
- **Connection Status** - "Connected" (green) or "Not Connected" (gray)
- **Item Count** - Number of synced items
- **Sync Button** - Sync this provider only
- **Connect Button** - Authenticate with the provider (if not connected)

### Quick Actions

**Sync All Button**

- Click to sync all enabled providers at once
- Shows loading indicator during sync
- Errors are displayed if sync fails

**Settings Button**

- Opens the sidepanel for detailed configuration
- Access provider settings, items view, and extension settings

---

## Using the Sidepanel

The sidepanel provides full control over the extension. Click the **Settings** button in the popup to open it.

### Providers Tab

**Configure Your Providers**

1. **Enable/Disable Provider**
   - Use the toggle switch on the right
   - Provider must be connected to enable
   - Disabled providers won't sync

2. **Select Bookmark Folder**
   - Choose where items will be stored
   - Dropdown shows all your bookmark folders
   - Defaults to root folder if not selected

3. **Authentication**
   - Click **Connect** to start OAuth flow
   - Status shows "Connected" when authenticated
   - Re-authenticate if connection fails

4. **Manual Sync**
   - Click **Sync Now** to sync immediately
   - Must be enabled and connected
   - Shows last sync timestamp

### Items Tab

**Browse All Synced Items**

1. **Search Bar**
   - Type to filter by title, URL, provider, or repository
   - Case-insensitive search
   - Real-time filtering

2. **Item Cards**
   - Provider icon for visual identification
   - Title and URL displayed
   - Metadata chips (type, state, labels)
   - Repository name (for GitHub)

3. **Open Items**
   - Click the external link icon to open in a new tab
   - Direct access to the item on the provider's site

### Settings Tab

**Extension Configuration**

1. **Sync Settings**
   - **Sync Interval**: 1-60 minutes (default: 15)
   - **Max Items Per Provider**: Limit synced items (default: 100)

2. **Notifications**
   - Enable/disable notifications
   - Error notifications
   - Success notifications

3. **Appearance**
   - **Theme**: Auto, Light, or Dark
   - Auto follows system preference

4. **Advanced**
   - Debug Mode: Enable detailed logging
   - More options coming soon

5. **Actions**
   - **Save**: Apply changes
   - **Reset**: Restore defaults

---

## Provider Setup

### GitHub Setup

**What You'll Need:**

- A GitHub account
- Access to repositories you want to track

**Authentication Steps:**

1. Click **Connect** in the Providers tab
2. You'll be redirected to GitHub
3. Review the requested permissions:
   - `repo` - Access repositories
   - `read:user` - Read user profile
   - `read:org` - Read organization membership
4. Click **Authorize**
5. You'll be redirected back to the extension

**What Gets Synced:**

- Pull requests you authored
- Pull requests you're requested to review
- Open and draft PRs
- Updates every sync interval

**Folder Organization:**

```text
📁 Your Selected Folder
  ├── 📄 [GitHub] PR Title 1
  ├── 📄 [GitHub] PR Title 2
  └── ...
```

### Jira Setup

**What You'll Need:**

- Jira Cloud account OR Jira Server/Data Center
- Valid credentials or API token

**Authentication Options:**

**Option 1: OAuth 2.0 (Jira Cloud)**

1. Click **Connect** in the Providers tab
2. Enter your Jira Cloud URL (e.g., `yourcompany.atlassian.net`)
3. Complete OAuth flow
4. Authorize the application

**Option 2: API Token (Jira Cloud)**

1. Generate an API token in your Jira settings
2. Configure in the extension settings
3. Provide email and token

**Option 3: Basic Auth (Jira Server/Data Center)**

1. Use your Jira username
2. Provide your password
3. Configure server URL

**What Gets Synced:**

- Issues assigned to you
- Issues not in "Done" status
- Updates every sync interval

**Folder Organization:**

```text
📁 Your Selected Folder
  ├── 📄 [Jira] PROJ-123: Issue Title
  ├── 📄 [Jira] PROJ-124: Another Issue
  └── ...
```

---

## Settings

### Sync Interval

**How It Works:**

- Extension syncs automatically at the configured interval
- Background sync runs even when browser is idle
- Default: 15 minutes

**Configuration:**

1. Go to Settings tab in sidepanel
2. Adjust the "Sync Interval" slider
3. Choose between 1-60 minutes
4. Click **Save**

**Recommendations:**

- **1-5 minutes**: High-frequency updates, active development
- **15-30 minutes**: Balanced performance and freshness
- **30-60 minutes**: Low-frequency, reduce API calls

### Max Items Per Provider

**Purpose:**

- Limit the number of items synced per provider
- Prevent bookmark folder clutter
- Improve performance

**Configuration:**

1. Go to Settings tab
2. Enter desired max items (default: 100)
3. Click **Save**

**Note:** Most recent items are kept when limit is reached.

### Notifications

**Enable Notifications:**

- Get desktop notifications for sync events
- Errors and successes

**Configuration:**

1. Check "Enable notifications"
2. Choose notification types:
   - Error notifications (recommended)
   - Success notifications (optional)
3. Click **Save**

### Theme

**Options:**

- **Auto**: Follows your system theme
- **Light**: Always use light theme
- **Dark**: Always use dark theme

**Configuration:**

1. Select theme from dropdown
2. Click **Save**
3. Changes apply immediately

---

## Troubleshooting

### Provider Won't Connect

**Symptoms:**

- "Not Connected" status persists
- OAuth flow fails
- Error messages during authentication

**Solutions:**

1. **Check Browser Permissions**
   - Ensure popup blockers aren't blocking the OAuth window
   - Allow popups for the extension

2. **Re-authenticate**
   - Click **Connect** again
   - Complete the OAuth flow
   - Check for error messages

3. **Clear Extension Data**
   - Go to `chrome://extensions/`
   - Find Live Folders
   - Click "Remove" and reinstall

4. **Check Provider Status**
   - Ensure GitHub/Jira is accessible
   - Check your internet connection
   - Verify your account has proper permissions

### Items Not Syncing

**Symptoms:**

- Bookmark folder remains empty
- Old items not updating
- No new items appearing

**Solutions:**

1. **Verify Provider is Enabled**
   - Go to Providers tab
   - Check toggle is ON
   - Ensure "Connected" status

2. **Check Folder Selection**
   - Verify a bookmark folder is selected
   - Ensure folder still exists
   - Try selecting a different folder

3. **Manual Sync**
   - Click **Sync Now** in Providers tab
   - Check for error messages
   - Review browser console for details

4. **Check Sync Interval**
   - Ensure interval is set correctly
   - Try reducing interval temporarily
   - Check last sync timestamp

### Duplicate Bookmarks

**Symptoms:**

- Multiple bookmarks for same item
- Old versions not removed

**Solutions:**

1. **URL-Based Deduplication**
   - Extension uses URLs to prevent duplicates
   - Duplicates may occur if URL changes

2. **Manual Cleanup**
   - Remove duplicate bookmarks manually
   - Next sync will maintain clean state

3. **Re-sync**
   - Disable provider
   - Delete all bookmarks in folder
   - Re-enable and sync

### Performance Issues

**Symptoms:**

- Slow sync operations
- Browser lag during sync
- High memory usage

**Solutions:**

1. **Reduce Max Items**
   - Lower "Max Items Per Provider" setting
   - Keep only essential items

2. **Increase Sync Interval**
   - Reduce sync frequency
   - Use manual sync when needed

3. **Disable Unused Providers**
   - Toggle off providers you don't use
   - Reduces background processing

### Error Messages

**Common Errors:**

**"Authentication failed"**

- Re-authenticate with provider
- Check credentials are correct
- Ensure account has proper permissions

**"Sync failed"**

- Check internet connection
- Verify provider API is accessible
- Check browser console for details

**"Rate limit exceeded"**

- Provider API rate limit reached
- Increase sync interval
- Wait for limit reset

**"Bookmark operation failed"**

- Check bookmark permissions
- Ensure folder exists
- Try different folder

---

## FAQ

### General

**Q: Is my data secure?**
A: Yes! Authentication tokens are stored securely in browser storage. OAuth flow uses PKCE for additional security. No data is sent to third-party servers.

**Q: Which browsers are supported?**
A: Chrome and Chromium-based browsers (Edge, Brave, etc.). Firefox support may be added in the future.

**Q: Does it work offline?**
A: No, an internet connection is required to sync with providers. Cached bookmarks remain accessible offline.

**Q: How many providers can I connect?**
A: Currently supports GitHub and Jira. More providers coming soon!

### Syncing

**Q: How often does it sync?**
A: Based on your configured interval (1-60 minutes). You can also manually sync anytime.

**Q: Will old items be removed?**
A: Yes, items no longer matching the sync criteria are automatically removed from bookmarks.

**Q: Can I sync to multiple folders?**
A: Each provider syncs to one folder. You can choose different folders for each provider.

**Q: What happens if I delete a synced bookmark?**
A: It will be re-created on the next sync if it still matches the sync criteria.

### Privacy & Permissions

**Q: What permissions does the extension need?**
A:

- `bookmarks` - Create and manage bookmarks
- `storage` - Save settings and auth tokens
- `alarms` - Schedule periodic syncs
- `identity` - OAuth authentication
- Provider API access during OAuth

**Q: Where are my tokens stored?**
A: Securely in browser's local storage. Only accessible by the extension.

**Q: Can I revoke access?**
A: Yes, disconnect provider in the extension and revoke access in provider settings (GitHub/Jira).

### Advanced

**Q: Can I export my settings?**
A: Not currently available. Feature planned for future release.

**Q: Can I customize sync queries?**
A: Not in the UI. Advanced users can modify provider code to customize queries.

**Q: Does it support self-hosted Jira?**
A: Yes! Jira Server and Data Center are supported with basic authentication.

**Q: Can I sync private repositories?**
A: Yes, if you have access. The OAuth flow requests repo access.

---

## Getting Help

### Debug Mode

Enable debug mode in Settings tab for detailed logging:

1. Go to Settings > Advanced
2. Check "Debug Mode"
3. Click Save
4. Open browser console (F12)
5. Look for `[Live Folders]` logs

### Report Issues

Found a bug? Have a feature request?

1. Enable Debug Mode
2. Reproduce the issue
3. Copy console logs
4. Open an issue on GitHub with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Console logs
   - Browser version

### Community

- **GitHub Repository**: [github.com/gxclarke/live-folders](https://github.com/gxclarke/live-folders)
- **Issue Tracker**: Report bugs and request features
- **Discussions**: Ask questions and share tips

---

## Keyboard Shortcuts

Currently, no keyboard shortcuts are configured. This feature may be added in a future release.

---

## What's Next?

Upcoming features:

- 📊 **Analytics Dashboard** - Sync statistics and insights
- 🔔 **Smart Notifications** - Customizable notification rules
- 🔄 **Conflict Resolution** - Handle bookmark conflicts intelligently
- 🎨 **Custom Themes** - More theme options
- 🔌 **More Providers** - GitLab, Bitbucket, Linear, and more!

---

## Version Information

**Current Version**: 1.0.0
**Last Updated**: October 2025

For version history and release notes, see [CHANGELOG.md](../CHANGELOG.md)

---

**Thank you for using Live Folders!** 🎉

If you find this extension helpful, please consider:

- ⭐ Starring the GitHub repository
- 📝 Writing a review on the Chrome Web Store
- 🐛 Reporting bugs and suggesting features
- 💡 Contributing to the project
