# Privacy Policy for Live Folders Chrome Extension

**Effective Date:** October 19, 2025  
**Last Updated:** October 19, 2025

## Overview

Live Folders is a Chrome extension that syncs GitHub pull requests and Jira issues as browser bookmarks. This privacy policy explains how we handle your data.

## Data We Don't Collect

**Live Folders does not collect, store, or transmit any personal data to external servers.**

We do not:

- Collect personal information
- Track user behavior  
- Store data on external servers
- Share data with third parties
- Use analytics or telemetry
- Display advertisements

## Data Storage

All data remains **locally on your device** using Chrome's built-in storage APIs:

### Authentication Data

- **OAuth tokens** for GitHub and Jira access
- **Provider configurations** (URLs, preferences)
- **Stored securely** in browser's encrypted storage

### Application Data  

- **Bookmark metadata** cached for performance
- **User preferences** (sync intervals, UI settings)
- **Sync timestamps** to track last update

### Local Only

All data is stored using:

- `chrome.storage.local` - Extension preferences and tokens
- `chrome.bookmarks` - Your browser's bookmark system
- **No external databases or cloud storage**

## Third-Party Connections

Live Folders connects directly to these services **with your explicit permission**:

### GitHub

- **Purpose**: Fetch your pull requests and repository data
- **Authentication**: OAuth 2.0 (industry standard)
- **Data Accessed**: PRs you created, are assigned to, or need to review
- **Your Control**: Revoke access anytime in GitHub settings

### Jira (Cloud & Server)

- **Purpose**: Fetch your issues and project data  
- **Authentication**: OAuth 2.0 or API tokens
- **Data Accessed**: Issues assigned to you or matching your filters
- **Your Control**: Revoke access anytime in Jira settings

### Direct Connections

- All API calls go **directly from your browser** to GitHub/Jira
- **No proxy servers** or intermediary services
- **Your tokens** are never sent to our servers (we don't have servers!)

## Data Usage

### What We Access

- **GitHub**: Pull requests, repository names, user profile (for authentication)
- **Jira**: Issues, project names, user profile (for authentication)
- **Chrome Bookmarks**: Create and update folders for synced items

### What We Don't Access

- Private repositories (unless you explicitly grant access)
- Email addresses or contact information
- Files or code content from repositories
- Other browser data or history

## Your Rights & Controls

### Full Control

- **Disconnect Providers**: Remove GitHub/Jira access anytime
- **Delete Extension**: Removes all local data completely
- **Selective Access**: Choose which repositories/projects to sync
- **Privacy Settings**: Control what data gets synced as bookmarks

### Data Portability

- **Bookmarks remain yours**: Stored in your browser's bookmark system
- **No vendor lock-in**: Uninstall extension, keep your bookmarks
- **Export options**: Use browser's bookmark export features

## Security

### Token Protection

- **Encrypted storage** using Chrome's secure storage APIs
- **Automatic refresh** prevents token expiration
- **Local only** - tokens never leave your device

### Secure Connections

- **HTTPS only** for all API communications
- **OAuth 2.0** industry-standard authentication
- **CSRF protection** prevents unauthorized access

## Children's Privacy

Live Folders is not designed for or directed at children under 13. We do not knowingly collect information from children under 13.

## Changes to Privacy Policy

If we update this privacy policy:

- **Effective date** will be updated above
- **Notification** via extension update notes
- **Continued use** constitutes acceptance

## Data Retention

### Automatic Cleanup

- **Uninstall extension**: All data removed automatically
- **Token expiration**: Old tokens cleaned up automatically  
- **Cache management**: Temporary data cleared regularly

### Manual Cleanup

- **Settings panel**: Clear cached data anytime
- **Provider disconnect**: Removes associated data
- **Browser tools**: Standard bookmark management

## International Users

Live Folders works globally and respects local privacy laws:

- **GDPR compliance** (EU): Right to access, delete, and portability
- **CCPA compliance** (California): Data transparency and control
- **No data transfers**: Everything stays local on your device

## Technical Implementation

### Open Source Transparency

- **Source code**: Available on GitHub for review
- **No hidden functionality**: Everything is auditable
- **Community contributions**: Public development process

### Extension Permissions

We only request permissions we actually use:

- **`bookmarks`**: Create bookmark folders for synced items
- **`storage`**: Store preferences and tokens locally
- **`identity`**: OAuth authentication flows
- **`alarms`**: Schedule background sync
- **Host permissions**: Access GitHub and Jira APIs

## Contact Information

### Questions or Concerns

For privacy-related questions:

- **GitHub Issues**: [Live Folders Repository](https://github.com/gxclarke/live-folders/issues)
- **Email**: [Your support email when you have one]

### Data Requests

Since all data is stored locally:

- **Access**: Use extension settings to view your data
- **Delete**: Uninstall extension or disconnect providers
- **Export**: Use browser's bookmark export features

## Legal Basis (GDPR)

For EU users, we process data based on:

- **Consent**: You explicitly connect providers and grant permissions
- **Contract**: Necessary for the extension's core functionality  
- **Legitimate Interest**: Local storage for performance and reliability

## Conclusion

**Your privacy is paramount.** Live Folders is designed with privacy-first principles:

- **No data collection**
- **No external servers**  
- **No tracking**
- **Full user control**
- **Open source transparency**

By keeping everything local and connecting directly to your chosen services, we ensure your data stays in your control.

---

**This privacy policy is effective as of October 19, 2025.**

*Last reviewed and updated: October 19, 2025*
