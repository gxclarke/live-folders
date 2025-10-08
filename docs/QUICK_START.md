# Quick Start Guide

Get up and running with Live Folders in 5 minutes!

## Step 1: Install the Extension

### Option A: From Chrome Web Store (Recommended)

1. Visit the [Live Folders page](https://chrome.google.com/webstore) *(coming soon)*
2. Click **Add to Chrome**
3. Confirm permissions when prompted

### Option B: From Source (Developers)

1. Clone the repository: `git clone https://github.com/gxclarke/live-folders.git`
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and go to `chrome://extensions/`
5. Enable **Developer mode** (toggle in top-right)
6. Click **Load unpacked** and select the `dist` folder

## Step 2: Connect Your First Provider

### GitHub Example

1. **Open the Extension**
   - Click the Live Folders icon in your browser toolbar

2. **Access Settings**
   - Click the **Settings** button (gear icon)
   - The sidepanel will open on the right

3. **Connect GitHub**
   - Go to the **Providers** tab
   - Find **GitHub** in the list
   - Click the **Connect** button

4. **Authorize**
   - A GitHub OAuth window will open
   - Review the permissions:
     - Access repositories
     - Read user profile
     - Read organization membership
   - Click **Authorize**

5. **Confirm Connection**
   - You'll be redirected back
   - Status should show **Connected** (green checkmark)

## Step 3: Configure Your Provider

1. **Select a Bookmark Folder**
   - In the GitHub provider card, find the folder dropdown
   - Choose where you want PRs saved (e.g., "Work Items")
   - Or create a new folder in your bookmarks first

2. **Enable the Provider**
   - Toggle the switch **ON** (turns green)
   - This allows automatic syncing

3. **First Sync**
   - Click **Sync Now** button
   - Wait a few seconds
   - Your PRs will appear in the selected folder!

## Step 4: Verify Your Bookmarks

1. **Open Bookmarks Manager**
   - Press `Ctrl+Shift+O` (Windows/Linux)
   - Or `Cmd+Shift+O` (Mac)
   - Or go to `chrome://bookmarks/`

2. **Navigate to Your Folder**
   - Find the folder you selected
   - You should see bookmarks like:
     - `[GitHub] feat: implement new feature`
     - `[GitHub] fix: resolve bug in component`

3. **Click Any Bookmark**
   - Opens the PR directly on GitHub
   - Ready to review or work on!

## Step 5: Browse Items in Extension

1. **Open Sidepanel**
   - Click Live Folders icon → Settings

2. **Go to Items Tab**
   - Click **Items** in the top navigation

3. **Search Your Items**
   - Use the search bar to filter by:
     - Title
     - Repository name
     - PR state (open, draft)
     - Provider name

4. **Open Directly**
   - Click the external link icon on any item
   - Opens in a new tab instantly

## Step 6: Configure Automatic Sync

1. **Open Settings Tab**
   - In the sidepanel, click **Settings**

2. **Adjust Sync Interval**
   - Use the slider to set how often to sync
   - Recommended: **15 minutes** (balanced)
   - Options: 1-60 minutes

3. **Save Changes**
   - Click the **Save** button
   - Extension will sync automatically now!

## Common First-Time Tasks

### Add Jira Too

1. Go to **Providers** tab
2. Click **Connect** next to Jira
3. Enter your Jira URL (e.g., `yourcompany.atlassian.net`)
4. Complete OAuth or provide API token
5. Select a different folder for Jira issues
6. Enable and sync!

### Change Theme

1. Go to **Settings** tab
2. Find **Theme** dropdown
3. Choose:
   - **Auto** - Follows system theme
   - **Light** - Always light mode
   - **Dark** - Always dark mode
4. Click **Save**

### Enable Notifications

1. Go to **Settings** tab
2. Check **Enable notifications**
3. Choose notification types:
   - ✅ Error notifications (recommended)
   - ⬜ Success notifications (optional)
4. Click **Save**

## Tips for Success

### 📌 Bookmark Organization

- **Create separate folders** for each provider
- Example structure:

  ```text
  📁 Bookmarks Bar
    ├── 📁 Work Items
    │   ├── 📁 GitHub PRs
    │   └── 📁 Jira Issues
    └── ...
  ```

### ⏰ Sync Frequency

- **Active development**: 5-10 minutes
- **General use**: 15-30 minutes
- **Occasional check**: 30-60 minutes

### 🔍 Searching Items

Search works on:

- Item titles
- URLs
- Provider names
- Repository names (GitHub)
- Project keys (Jira)

### 🎯 Quick Access

**Use the Popup** for:

- Quick status check
- Manual sync
- Open settings

**Use the Sidepanel** for:

- Detailed configuration
- Browsing all items
- Advanced settings

## Troubleshooting Quick Fixes

### Provider Won't Connect

- Disable popup blocker
- Try incognito mode
- Check internet connection
- Re-authenticate

### Items Not Appearing

- Verify provider is **enabled** (toggle ON)
- Check folder is selected
- Click **Sync Now** manually
- Check for error messages

### Duplicate Bookmarks

- Delete duplicates manually
- Disable provider temporarily
- Re-enable and sync fresh

## Next Steps

Now that you're set up:

1. **Explore the Items View**
   - Search and filter your synced items
   - Get familiar with the interface

2. **Read the Full User Guide**
   - See [USER_GUIDE.md](USER_GUIDE.md)
   - Learn advanced features
   - Understand all settings

3. **Customize Your Setup**
   - Fine-tune sync intervals
   - Set up notifications
   - Choose your preferred theme

4. **Join the Community**
   - Star the [GitHub repo](https://github.com/gxclarke/live-folders)
   - Report bugs or request features
   - Share your experience!

## Get Help

- **Full Documentation**: [USER_GUIDE.md](USER_GUIDE.md)
- **Troubleshooting**: [USER_GUIDE.md#troubleshooting](USER_GUIDE.md#troubleshooting)
- **FAQ**: [USER_GUIDE.md#faq](USER_GUIDE.md#faq)
- **Report Issues**: [GitHub Issues](https://github.com/gxclarke/live-folders/issues)

---

**Congratulations!** 🎉

You're now ready to use Live Folders. Your work items will automatically stay in sync with your browser bookmarks!

**Estimated Setup Time**: 5 minutes
**Your Time**: ✅ Complete!
