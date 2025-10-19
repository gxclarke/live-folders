# Environment Variables Setup Guide

This guide explains how to configure OAuth credentials for the Live Folders extension.

## Quick Start

1. **Copy the sample file:**

   ```bash
   cp .env.local.sample .env.local
   ```

2. **Get OAuth credentials** (see below for detailed steps)

3. **Edit `.env.local`** and paste your credentials

4. **Build the extension:**

   ```bash
   npm run build
   ```

5. **Load the extension** in Chrome and test OAuth authentication

## Getting GitHub OAuth Credentials

### Step 1: Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the application details:
   - **Application name:** `Live Folders (Chrome Extension)`
   - **Homepage URL:** Your Chrome Web Store URL or GitHub repo URL
   - **Authorization callback URL:** See step 2 below
   - **Application description:** Browser extension for syncing GitHub PRs as bookmarks

### Step 2: Get Redirect URI

The OAuth redirect URI is specific to your extension ID. To find it:

1. Build and load your extension in Chrome (unpacked extension for development)
2. Open the extension's **popup** (click the extension icon) or **sidepanel**
3. **Right-click on the popup/sidepanel** and select **"Inspect"** to open DevTools
4. In the DevTools console, run this command:

   ```javascript
   chrome.identity.getRedirectURL("github")
   ```

5. Copy the URL (format: `https://<extension-id>.chromiumapp.org/github`)
6. Go back to your GitHub OAuth App settings and paste this as the **Authorization callback URL**

> **💡 Tip:** You must open DevTools on the extension popup/sidepanel itself, not on a regular webpage. The `chrome.identity` API is only available in the extension's context. If you see "chrome is not defined" or "browser is not defined", you're in the wrong console.

### Step 3: Get Client Credentials

1. After creating the OAuth App, you'll see the **Client ID** - copy it
2. Click **"Generate a new client secret"**
3. **Important:** Copy the client secret immediately - you won't see it again!
4. Paste both values into your `.env.local` file:

   ```bash
   VITE_GITHUB_OAUTH_CLIENT_ID=your_actual_client_id
   VITE_GITHUB_OAUTH_CLIENT_SECRET=your_actual_client_secret
   ```

### Required Scopes

The extension requests these GitHub scopes:

- `repo` - Access to repositories (to read PRs)
- `read:user` - Read user profile information
- `read:org` - Read organization membership (for filtering PRs)

## Getting Jira OAuth Credentials

### Step 1: Create OAuth App

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Click **"Create"** → **"OAuth 2.0 integration"**
3. Fill in the app details:
   - **Name:** `Live Folders`
   - **Description:** Browser extension for syncing Jira issues as bookmarks

### Step 2: Configure Permissions

1. In the **Permissions** tab, add these scopes:
   - `read:jira-work` - Read Jira project and issue data
   - `read:jira-user` - Read user information
   - (Optional) `offline_access` - For refresh tokens

   **Alternatively**, use granular scopes:
   - `read:issue:jira`
   - `read:project:jira`
   - `read:user:jira`

### Step 3: Add Callback URL

1. In the **Authorization** tab, add the callback URL
2. To find your redirect URI:
   - Load the extension in Chrome
   - Open the extension's **popup** or **sidepanel**
   - **Right-click and select "Inspect"** to open DevTools
   - In the console, run: `chrome.identity.getRedirectURL("jira")`
   - Copy the URL (format: `https://<extension-id>.chromiumapp.org/jira`)
3. Paste this into the **Callback URL** field

> **💡 Tip:** The `chrome.identity` API only works in the extension's context (popup/sidepanel DevTools), not in regular webpage consoles.

### Step 4: Get Credentials

1. In the **Settings** tab, you'll find:
   - **Client ID** - copy this
   - **Client Secret** - copy this (generate if needed)
2. Paste into `.env.local`:

   ```bash
   VITE_JIRA_OAUTH_CLIENT_ID=your_actual_client_id
   VITE_JIRA_OAUTH_CLIENT_SECRET=your_actual_client_secret
   ```

## Environment Variables Reference

| Variable | Description | Required | Source |
|----------|-------------|----------|--------|
| `VITE_GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID | Yes (for GitHub OAuth) | [GitHub Settings](https://github.com/settings/developers) |
| `VITE_GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client Secret | Yes (for GitHub OAuth) | [GitHub Settings](https://github.com/settings/developers) |
| `VITE_JIRA_OAUTH_CLIENT_ID` | Jira OAuth App Client ID | Yes (for Jira OAuth) | [Atlassian Console](https://developer.atlassian.com/console/myapps/) |
| `VITE_JIRA_OAUTH_CLIENT_SECRET` | Jira OAuth App Client Secret | Yes (for Jira OAuth) | [Atlassian Console](https://developer.atlassian.com/console/myapps/) |

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env.local` to git**
   - It's already in `.gitignore` (via `*.local` pattern)
   - Contains sensitive credentials

2. **Keep secrets secure**
   - Treat client secrets like passwords
   - Don't share them in screenshots, logs, or error messages
   - Regenerate if compromised

3. **Development vs Production**
   - Use different OAuth Apps for development and production
   - Production OAuth App should use the Chrome Web Store extension ID
   - Development OAuth App uses unpacked extension ID

4. **Rotate credentials regularly**
   - GitHub and Jira allow regenerating secrets
   - Update `.env.local` after rotation

## Troubleshooting

### "OAuth Client ID not configured" warning

**Symptoms:** You see this warning in the console when the extension initializes:

```text
GitHub OAuth Client ID not configured. Set VITE_GITHUB_OAUTH_CLIENT_ID environment variable.
```

**Solutions:**

1. Make sure `.env.local` exists (copy from `.env.local.sample`)
2. Check that you've filled in the actual values (not placeholder text)
3. Rebuild the extension: `npm run build`
4. Reload the extension in Chrome

### OAuth popup doesn't open

**Possible causes:**

1. Client ID is empty or incorrect
2. Redirect URI doesn't match what's registered in OAuth App
3. Extension doesn't have `identity` permission (check `manifest.json`)

**Solutions:**

1. Verify credentials in `.env.local`
2. Check redirect URI matches exactly (case-sensitive)
3. Check browser console for errors

### "redirect_uri_mismatch" error

**Cause:** The redirect URI in your OAuth App doesn't match the extension's redirect URI.

**Solution:**

1. Get the correct redirect URI: `chrome.identity.getRedirectURL("github")`
2. Update your GitHub/Jira OAuth App settings
3. Make sure there are no trailing slashes or typos

### Extension ID changes after publishing

**Cause:** Unpacked extensions have temporary IDs. Published extensions have permanent IDs.

**Solution:**

1. After publishing to Chrome Web Store, get the permanent extension ID
2. Create a **new** OAuth App for production with the production redirect URI
3. Use different environment variables or a build system to handle dev vs prod

## Fallback Authentication

If OAuth is not configured, the extension will fall back to:

- **GitHub:** Personal Access Token (PAT) - entered in Settings
- **Jira:** API Token or Basic Auth - entered in Settings

These work without OAuth setup but require manual token management.

## Production Deployment

For Chrome Web Store deployment:

1. **Create production OAuth Apps** with the Web Store extension ID
2. **Don't bundle secrets** in the published extension
3. **Options for production secrets:**
   - Option A: Hardcode in source (not recommended)
   - Option B: Build-time environment variables
   - Option C: Settings UI for users to enter their own OAuth apps (most flexible)

## Resources

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Atlassian OAuth 2.0 Documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [OAuth 2.0 Overview](https://oauth.net/2/)

## Getting Help

If you run into issues:

1. Check the browser DevTools console for error messages
2. Verify your OAuth App settings match the extension's redirect URI
3. Make sure `.env.local` has valid credentials
4. Try the fallback authentication methods (PAT for GitHub, API Token for Jira)
5. Open an issue on GitHub with logs (redact any sensitive info!)
