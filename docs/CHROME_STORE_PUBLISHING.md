# Chrome Extension Publishing Guide

**Date:** October 19, 2025  
**Extension:** Live Folders  
**Status:** Ready for Publication

## Overview

Publishing your Chrome extension to the Chrome Web Store involves preparation, submission, and review. Here's the complete process.

## Prerequisites

### ✅ Extension Must Be Complete

- [x] Core functionality working (GitHub & Jira sync)
- [x] UI polished (popup, sidepanel, settings)
- [x] OAuth2 authentication implemented
- [x] Error handling and edge cases covered
- [x] Documentation complete

### ✅ Required Assets

You'll need these assets for the Web Store listing:

1. **Extension Icons** (already have these):
   - ✅ 16x16, 32x32, 48x48, 128x128 PNG icons
   - Located in `public/` folder

2. **Store Listing Assets** (need to create):
   - **Screenshots** (1280x800 or 640x400 pixels)
   - **Promotional images** (optional but recommended)
   - **Detailed description**
   - **Privacy policy** (required)

## Step 1: Prepare for Publication

### 1.1 Create Production Build

```bash
# Ensure you're using production environment variables
cp .env.local.sample .env.local
# Edit .env.local with production OAuth credentials

# Build the extension
npm run build

# Test the built extension
# Load dist/ folder in Chrome and verify everything works
```

### 1.2 Create Store Assets

#### Screenshots (Required - 1-5 screenshots)

Take screenshots showing:

1. **Main UI** - Sidepanel with providers configured
2. **Authentication Flow** - OAuth connection process
3. **Bookmark Sync** - Showing synced PRs/issues in bookmarks
4. **Settings** - Provider configuration options
5. **Collapsible Sections** - UI organization features

**Specifications:**

- Size: 1280x800 pixels (recommended) or 640x400 pixels
- Format: PNG or JPEG
- Show the extension in action, not just static UI

#### Promotional Images (Optional)

- **Small tile**: 440x280 pixels
- **Large tile**: 920x680 pixels  
- **Marquee**: 1400x560 pixels

### 1.3 Write Store Listing Content

#### Title (Max 45 characters)

```text
Live Folders - GitHub & Jira Sync
```

#### Summary (Max 132 characters)

```text
Sync GitHub PRs and Jira issues as bookmarks. Quick access to your work items with real-time updates.
```#### Description (Max 16,384 characters)

```markdown
# Live Folders - Seamless GitHub & Jira Integration

Transform your browser bookmarks into a powerful productivity tool. Live Folders automatically syncs your GitHub pull requests and Jira issues as organized bookmark folders, giving you instant access to your work items.

## 🚀 Key Features

### Multi-Provider Support
• **GitHub Integration**: Sync pull requests you created, are assigned to, or need to review
• **Jira Integration**: Sync issues across Cloud and Server instances
• **Real-time Updates**: Automatic background sync keeps bookmarks current

### Smart Organization  
• **Dynamic Folder Titles**: Show review counts and totals (e.g., "GitHub PRs (3 review • 12 total)")
• **Intelligent Filtering**: Created by you, assigned to you, review requests
• **Customizable Titles**: Include status, assignee, age, priority, and more

### Flexible Authentication
• **OAuth 2.0**: Secure authentication with GitHub and Jira
• **Personal Access Tokens**: Alternative auth method for GitHub
• **API Tokens**: Support for Jira Cloud and Server

### Advanced Features
• **Collapsible UI**: Clean, organized settings interface
• **Background Sync**: Configurable sync intervals (5min - 24hr)
• **Conflict Resolution**: Smart handling of bookmark conflicts
• **Rate Limiting**: Respects API limits with intelligent retry logic
• **Error Recovery**: Graceful handling of network issues and token expiration

## 🔧 Easy Setup

1. **Install Extension**: One-click install from Chrome Web Store
2. **Configure Providers**: Add GitHub and/or Jira credentials  
3. **Select Folder**: Choose where to sync your bookmarks
4. **Customize**: Configure titles, filters, and sync preferences
5. **Done**: Your bookmarks stay automatically updated!

## 🔒 Privacy & Security

• **Local Storage**: All data stored locally in your browser
• **Secure Authentication**: OAuth 2.0 with automatic token refresh  
• **No Data Collection**: We don't collect or transmit your personal data
• **Open Source**: Full transparency with public GitHub repository

## 📋 Use Cases

### For Developers
• Quick access to PRs awaiting your review
• Track issues across multiple Jira projects
• Monitor work items without switching contexts
• Keep bookmarks organized and current

### For Teams  
• Shared visibility into team work items
• Consistent bookmark organization
• Reduced context switching
• Better work-life balance with organized access

## 🛠️ Technical Details

• **Manifest V3**: Built with the latest Chrome extension standards
• **TypeScript**: Type-safe development for reliability
• **React + MUI**: Modern, accessible user interface
• **Background Service Worker**: Efficient, non-blocking sync
• **Cross-browser Compatible**: Works with Chrome, Edge, and other Chromium browsers

## 📖 Getting Started

After installation:

1. Click the Live Folders icon in your toolbar
2. Choose "GitHub" or "Jira" to begin setup
3. Follow the authentication flow  
4. Configure your sync preferences
5. Your bookmarks will appear automatically!

## 🆘 Support

Need help? Check our documentation:
• Setup guides for GitHub and Jira OAuth
• Troubleshooting common issues  
• Advanced configuration options

Visit our GitHub repository for:
• Issue reporting and feature requests
• Technical documentation
• Community discussions

## 🏆 Why Live Folders?

Traditional bookmark management is static and quickly becomes outdated. Live Folders bridges the gap between your development tools and browser, creating a living, breathing bookmark system that evolves with your work.

Whether you're a solo developer tracking your own PRs and issues, or part of a team managing complex projects across GitHub and Jira, Live Folders keeps your most important work items just one click away.

**Download Live Folders today and experience the future of bookmark management!**
```

### 1.4 Create Privacy Policy

You'll need a privacy policy. Here's a template:

#### Privacy Policy for Live Folders

```markdown
# Privacy Policy for Live Folders Chrome Extension

**Effective Date:** October 19, 2025

## Data Collection

Live Folders does not collect, store, or transmit any personal data to external servers.

## Data Storage

All data is stored locally in your browser using Chrome's storage APIs:

• **Authentication Tokens**: Stored securely in browser storage
• **Provider Configurations**: Your GitHub/Jira settings  
• **Bookmark Data**: Cached locally for performance
• **User Preferences**: UI settings and sync intervals

## Data Usage

The extension only accesses:

• **GitHub API**: To fetch your pull requests (with your explicit permission)
• **Jira API**: To fetch your issues (with your explicit permission)  
• **Chrome Bookmarks API**: To create and update bookmark folders

## Third-Party Services

The extension connects to:

• **GitHub.com**: For OAuth authentication and PR data
• **Atlassian Jira**: For OAuth authentication and issue data

These connections are made directly from your browser with your explicit consent.

## Data Sharing

We do not share, sell, or transmit any user data to third parties.

## User Rights

You can:

• **Delete Data**: Uninstall the extension to remove all data
• **Revoke Access**: Disconnect providers at any time
• **Export Data**: Bookmarks remain in your browser

## Contact

For privacy questions, visit our GitHub repository or contact [your-email].

**Last Updated:** October 19, 2025
```

Host this privacy policy on:

- Your GitHub repository (as `PRIVACY.md`)
- A simple website (GitHub Pages works)
- Include the URL in your Web Store listing

## Step 2: Chrome Web Store Developer Account

### 2.1 Create Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with your Google account
3. **Pay the $5 registration fee** (one-time payment)
4. Verify your identity (may require phone verification)

### 2.2 Account Setup

- Complete your developer profile
- Add payment methods (if you plan to charge for the extension)
- Agree to developer terms

## Step 3: Prepare Extension Package

### 3.1 Final Production Build

```bash
# Clean build
rm -rf dist/
npm run build

# Test the built extension one more time
# Load dist/ folder in Chrome as unpacked extension
# Verify all features work correctly
```

### 3.2 Create ZIP Package

```bash
# Create a clean zip of the dist folder
cd dist/
zip -r ../live-folders-extension.zip .
cd ..

# The zip file should contain:
# - manifest.json
# - All built assets
# - No source code, node_modules, or .env files
```

### 3.3 Verify Package Contents

```bash
# Check what's in the zip
unzip -l live-folders-extension.zip

# Should see:
# manifest.json
# assets/
# src/
# public/
# (No .env, no source TypeScript files)
```

## Step 4: Submit to Chrome Web Store

### 4.1 Upload Extension

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click **"New Item"**
3. **Upload** your `live-folders-extension.zip` file
4. Wait for upload and initial processing

### 4.2 Fill Out Store Listing

#### Basic Information

- **Title**: Live Folders - GitHub & Jira Sync
- **Summary**: Your 132-character summary
- **Description**: Your full description (use markdown formatting)
- **Category**: Productivity
- **Language**: English

#### Visual Assets

- **Icon**: Will be extracted from manifest.json
- **Screenshots**: Upload 1-5 screenshots (1280x800 recommended)
- **Promotional images**: Optional but recommended

#### Additional Details

- **Privacy Policy**: URL to your privacy policy
- **Support URL**: Link to GitHub repository or support page
- **Version**: Should match your manifest.json version

### 4.3 Distribution Settings

#### Visibility

- **Public**: Anyone can find and install
- **Unlisted**: Only people with link can install
- **Private**: Only specific users/groups

For Live Folders, choose **Public**.

#### Regions

- Select regions where you want to distribute
- Default: All regions (recommended)

#### Pricing

- **Free**: Recommended for Live Folders
- **Paid**: Requires payment processing setup

### 4.4 Privacy & Security

#### Single Purpose

Clearly state: "Sync GitHub pull requests and Jira issues as browser bookmarks"

#### Permissions Justification

Explain why you need each permission:

- **`bookmarks`**: "Create and manage bookmark folders for synced items"
- **`storage`**: "Store user preferences and authentication tokens"  
- **`identity`**: "OAuth authentication with GitHub and Jira"
- **`alarms`**: "Schedule periodic background sync"
- **Host permissions**: "Access GitHub and Jira APIs to fetch user data"

#### Data Usage

- Explain how you handle user data
- Reference your privacy policy
- Confirm no data collection/transmission

## Step 5: Review Process

### 5.1 Initial Submission

After submitting:

- **Automated checks** run immediately (malware, manifest validation)
- **Manual review** begins (can take hours to several days)
- You'll receive email updates on review progress

### 5.2 Review Timeline

- **Automated review**: Minutes to hours
- **Manual review**: Few hours to 7 days  
- **Policy review**: Additional time if flagged
- **First-time developers**: May take longer

### 5.3 Common Review Issues

#### Manifest V3 Compliance

- ✅ Your extension already uses Manifest V3
- ✅ Service worker instead of background page
- ✅ Proper permission declarations

#### Permission Justification  

- **Be specific** about why each permission is needed
- **Link permissions to features** users can see
- **Avoid requesting excessive permissions**

#### Privacy Policy

- **Must be accessible** before users install
- **Must be accurate** and complete
- **Must address data handling**

## Step 6: After Approval

### 6.1 Publication

Once approved:

- Extension goes live on Chrome Web Store
- Users can find and install it
- You get a permanent extension URL

### 6.2 Extension URL Format

```text
https://chrome.google.com/webstore/detail/live-folders/[EXTENSION_ID]
```

### 6.3 Post-Launch Tasks

#### Update OAuth Apps

Your extension will have a **new, permanent ID** after publishing. You'll need to:

1. **Update GitHub OAuth App**:
   - Add production redirect URI: `https://[NEW_ID].chromiumapp.org/github`

2. **Update Jira OAuth App**:
   - Add production redirect URI: `https://[NEW_ID].chromiumapp.org/jira`

3. **Update Environment Variables**:
   - Use production OAuth credentials
   - Test with the published extension

#### Monitor Performance

- Check Chrome Web Store analytics
- Monitor user reviews and ratings
- Track installation numbers

## Step 7: Updates & Maintenance

### 7.1 Publishing Updates

```bash
# Update version in manifest.json
# Make your changes
npm run build

# Create new zip package
cd dist/
zip -r ../live-folders-extension-v1.1.0.zip .

# Upload to Chrome Web Store Developer Dashboard
# Updates usually review faster than initial submissions
```

### 7.2 Version Management

- **Increment version numbers** properly (semantic versioning)
- **Test thoroughly** before each update
- **Write clear release notes** for users

## Troubleshooting

### Common Submission Issues

#### "Manifest validation failed"

- Check manifest.json syntax
- Ensure all required fields are present
- Validate against Manifest V3 spec

#### "Permission issues"  

- Justify each permission in submission form
- Remove unused permissions
- Be specific about usage

#### "Privacy policy required"

- Host privacy policy on accessible URL
- Include URL in submission form
- Ensure policy covers all data usage

#### "Screenshots rejected"

- Use correct dimensions (1280x800 or 640x400)
- Show actual extension functionality
- Avoid placeholder or stock images

### Getting Help

- **Chrome Web Store Help**: [support.google.com/chrome_webstore](https://support.google.com/chrome_webstore/)
- **Developer Forums**: Chrome extension community
- **Documentation**: [developer.chrome.com/docs/webstore/](https://developer.chrome.com/docs/webstore/)

## Estimated Timeline

### First-Time Publisher

- **Account setup**: 30 minutes
- **Asset creation**: 2-4 hours (screenshots, description)
- **Submission**: 30 minutes  
- **Review wait**: 1-7 days
- **Total**: 3-5 days

### Experienced Publisher  

- **Updates**: 1-2 hours
- **Review wait**: Few hours to 2 days
- **Total**: Same day to 3 days

## Checklist Before Submitting

- [ ] Extension fully tested and working
- [ ] Production build created (`npm run build`)
- [ ] Screenshots taken (1280x800 pixels)
- [ ] Store description written
- [ ] Privacy policy created and hosted
- [ ] ZIP package created from `dist/` folder
- [ ] Developer account created ($5 fee paid)
- [ ] OAuth apps configured for production
- [ ] All required assets prepared

## Cost Breakdown

- **Chrome Web Store Developer Registration**: $5 (one-time)
- **Privacy Policy Hosting**: Free (GitHub Pages)
- **OAuth App Registration**: Free (GitHub & Jira)
- **Extension Development**: Your time
- **Total Upfront Cost**: $5

## Success Tips

1. **Clear Description**: Explain exactly what your extension does
2. **Great Screenshots**: Show the extension in action
3. **Proper Permissions**: Only request what you actually need
4. **Privacy Compliance**: Be transparent about data usage
5. **Test Thoroughly**: Ensure everything works before submitting
6. **Responsive Support**: Monitor reviews and respond to issues

## Conclusion

Publishing Live Folders to the Chrome Web Store is straightforward once you have all the assets prepared. The key is thorough preparation - good screenshots, clear descriptions, and proper privacy documentation.

Your extension is well-built with modern standards (Manifest V3, TypeScript, proper architecture), so you shouldn't encounter technical review issues.

**Next Steps:**

1. Create your store assets (screenshots, description)
2. Set up Chrome Web Store developer account  
3. Submit for review
4. Update OAuth apps after approval

Good luck with your publication! 🚀
