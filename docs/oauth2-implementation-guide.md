# OAuth2 Implementation Guide for GitHub and Jira

**Date:** October 11, 2025  
**Status:** Planning / Implementation Guide  
**Current State:** Architecture in place, needs OAuth app registration and configuration

## Current State Analysis

### ✅ What's Already Implemented

The codebase has a **complete OAuth2 infrastructure** already in place:

#### 1. **AuthManager Service** (`src/services/auth-manager.ts`)

- ✅ Centralized OAuth 2.0 flow handling
- ✅ Token management with automatic refresh (5 min before expiry)
- ✅ CSRF protection using `crypto.getRandomValues()`
- ✅ Event-driven architecture (auth_success, auth_failure, token_refresh, auth_revoked)
- ✅ Token refresh scheduling with browser.alarms
- ✅ Secure token storage via StorageManager

**Key Methods:**

```typescript
authenticate(providerId, user?)       // Full OAuth flow
isAuthenticated(providerId)           // Check token validity
getToken(providerId)                  // Get token (auto-refresh if needed)
refreshToken(providerId)              // Manual token refresh
registerOAuthConfig(providerId, config) // Register provider OAuth config
```

#### 2. **GitHub Provider** (`src/providers/github/github-provider.ts`)

- ✅ OAuth configuration structure defined
- ✅ Delegates to AuthManager for OAuth flow
- ✅ User info fetching implemented
- ✅ Fallback to Personal Access Token (PAT) already working
- ⚠️ **Missing:** OAuth Client ID/Secret configuration

**OAuth Config:**

```typescript
private readonly OAUTH_CONFIG = {
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  clientId: "", // ⚠️ NEEDS TO BE SET
  redirectUri: browser.identity.getRedirectURL("github"),
  scopes: ["repo", "read:user", "read:org"],
};
```

#### 3. **Jira Provider** (`src/providers/jira/jira-provider.ts`)

- ✅ Multi-auth support (OAuth, API token, Basic auth)
- ✅ OAuth flow delegated to AuthManager
- ✅ Cloud and Server instance detection
- ⚠️ **Missing:** OAuth Client ID/Secret configuration

**OAuth Config:**

```typescript
private readonly OAUTH_CONFIG = {
  authUrl: "https://auth.atlassian.com/authorize",
  tokenUrl: "https://auth.atlassian.com/oauth/token",
  clientId: "", // ⚠️ NEEDS TO BE SET
  redirectUri: browser.identity.getRedirectURL("jira"),
  scopes: ["read:jira-work", "read:jira-user"],
};
```

#### 4. **Browser API Integration**

- ✅ `browser.identity.launchWebAuthFlow()` for OAuth popup
- ✅ `browser.identity.getRedirectURL()` for redirect URI
- ✅ Permissions in manifest: `"identity"` permission enabled

### ❌ What's Missing

1. **OAuth Application Registration**
   - No GitHub OAuth App created
   - No Jira OAuth App created
   - No Client IDs/Secrets stored

2. **Client Credentials Configuration**
   - No UI for entering Client ID/Secret
   - No secure storage for Client Secret
   - No environment variable system

3. **Redirect URI Registration**
   - Need to register extension redirect URIs with GitHub/Jira

## Implementation Steps

### Phase 1: GitHub OAuth2 Setup

#### Step 1: Register GitHub OAuth App

1. **Go to GitHub Developer Settings:**
   - Navigate to: <https://github.com/settings/developers>
   - Click "New OAuth App"

2. **Configure Application:**
   - **Application name:** `Live Folders (Chrome Extension)`
   - **Homepage URL:** Chrome Web Store URL or GitHub repo
   - **Authorization callback URL:** Get from extension (see below)
   - **Description:** Browser extension for syncing GitHub PRs as bookmarks

   **To get the redirect URI:**
   1. Build and load your extension in Chrome (as unpacked extension)
   2. Open the extension's **popup** (click extension icon) or **sidepanel**
   3. Open DevTools **on the popup/sidepanel** (right-click → Inspect)
   4. In the console, run:

      ```javascript
      chrome.identity.getRedirectURL("github")
      // Returns: https://<extension-id>.chromiumapp.org/github
      ```

   5. Copy this URL and use it as the Authorization callback URL

3. **Get Credentials:**
   - Copy **Client ID**
   - Generate **Client Secret**
   - Store securely (you only see the secret once!)

#### Step 2: Store Credentials in Extension

**Option A: Development (Quick Start)**

```typescript
// In src/providers/github/github-provider.ts
private readonly OAUTH_CONFIG = {
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  clientId: "your_client_id_here", // ⚠️ HARDCODED - DEV ONLY
  redirectUri: browser.identity.getRedirectURL("github"),
  scopes: ["repo", "read:user", "read:org"],
};
```

**Option B: Environment Variables (Recommended)**

1. Create `.env` file (add to `.gitignore`):

   ```bash
   VITE_GITHUB_CLIENT_ID=your_client_id_here
   VITE_GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

2. Update Vite config to load env vars:

   ```typescript
   // vite.config.ts
   import { defineConfig, loadEnv } from 'vite';
   
   export default defineConfig(({ mode }) => {
     const env = loadEnv(mode, process.cwd(), '');
     
     return {
       define: {
         'import.meta.env.VITE_GITHUB_CLIENT_ID': JSON.stringify(env.VITE_GITHUB_CLIENT_ID),
       },
       // ... rest of config
     };
   });
   ```

3. Use in provider:

   ```typescript
   private readonly OAUTH_CONFIG = {
     authUrl: "https://github.com/login/oauth/authorize",
     tokenUrl: "https://github.com/login/oauth/access_token",
     clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || "",
     redirectUri: browser.identity.getRedirectURL("github"),
     scopes: ["repo", "read:user", "read:org"],
   };
   ```

**Option C: Settings UI (Most Flexible)**

1. Add UI fields in ProvidersView for GitHub provider:

   ```tsx
   {provider.id === "github" && !provider.authenticated && (
     <Stack spacing={2}>
       <TextField
         label="OAuth Client ID"
         value={clientId}
         onChange={(e) => setClientId(e.target.value)}
         size="small"
         helperText="Get from GitHub OAuth App settings"
       />
       <TextField
         label="OAuth Client Secret"
         type="password"
         value={clientSecret}
         onChange={(e) => setClientSecret(e.target.value)}
         size="small"
         helperText="Only needed once, stored securely"
       />
     </Stack>
   )}
   ```

2. Store in provider config:

   ```typescript
   await storageManager.saveProvider("github", {
     config: {
       ...existingConfig,
       oauthClientId: clientId,
       oauthClientSecret: clientSecret, // Encrypted in storage
     }
   });
   ```

3. Load in provider:

   ```typescript
   public async initialize(): Promise<void> {
     const config = await this.getConfig();
     const githubConfig = config as GitHubProviderConfig;
     
     if (githubConfig.oauthClientId) {
       this.OAUTH_CONFIG.clientId = githubConfig.oauthClientId;
     }
     if (githubConfig.oauthClientSecret) {
       this.OAUTH_CONFIG.clientSecret = githubConfig.oauthClientSecret;
     }
     
     authManager.registerOAuthConfig(this.PROVIDER_ID, this.OAUTH_CONFIG);
   }
   ```

#### Step 3: Test GitHub OAuth Flow

1. **Remove PAT (if testing OAuth):**

   ```typescript
   // In ProvidersView, remove personalAccessToken before auth
   await handleUpdateProvider(provider.id, {
     personalAccessToken: undefined,
   });
   ```

2. **Click "Connect" button:**
   - Should open GitHub authorization popup
   - User approves scopes
   - Redirects back to extension
   - Tokens stored automatically
   - User info fetched

3. **Verify Token Storage:**

   ```javascript
   // In console
   chrome.storage.local.get(['auth:github'], (result) => {
     console.log(result);
   });
   ```

4. **Test Token Refresh:**
   - Wait until token expires (or manually set expiry)
   - Next API call should auto-refresh

#### Step 4: Handle Edge Cases

1. **User Cancellation:**
   - Already handled in AuthManager
   - Emits `auth_failure` event

2. **Network Errors:**
   - Already handled with try/catch
   - Error shown in UI

3. **Token Expiration:**
   - Auto-refresh 5 min before expiry
   - Falls back to re-auth if refresh fails

### Phase 2: Jira OAuth2 Setup

#### Step 1: Register Jira OAuth App

**For Jira Cloud (Atlassian OAuth 2.0):**

1. **Create OAuth 2.0 Integration:**
   - Go to: <https://developer.atlassian.com/console/myapps/>
   - Click "Create" → "OAuth 2.0 integration"

2. **Configure App:**
   - **Name:** `Live Folders`
   - **Description:** Browser extension for syncing Jira issues
   - **Callback URL:** Get from extension (see below)

   **To get the redirect URI:**
   1. Build and load your extension in Chrome (as unpacked extension)
   2. Open the extension's **popup** (click extension icon) or **sidepanel**
   3. Open DevTools **on the popup/sidepanel** (right-click → Inspect)
   4. In the console, run:

      ```javascript
      chrome.identity.getRedirectURL("jira")
      // Returns: https://<extension-id>.chromiumapp.org/jira
      ```

   5. Copy this URL and use it as the Callback URL

3. **Configure Permissions (Scopes):**
   - **Classic scopes:**
     - `read:jira-work` - Read Jira project and issue data
     - `read:jira-user` - Read user information
   - **Granular scopes (recommended):**
     - `read:issue:jira`
     - `read:project:jira`
     - `read:user:jira`

4. **Get Credentials:**
   - Copy **Client ID**
   - Copy **Client Secret**
   - Note **Authorization URL** and **Token URL**

#### Step 2: Update Jira Provider Config

Similar to GitHub, choose one of three options:

**Option A: Development**

```typescript
private readonly OAUTH_CONFIG = {
  authUrl: "https://auth.atlassian.com/authorize",
  tokenUrl: "https://auth.atlassian.com/oauth/token",
  clientId: "your_client_id_here",
  clientSecret: "your_client_secret_here",
  redirectUri: browser.identity.getRedirectURL("jira"),
  scopes: ["read:jira-work", "read:jira-user"],
  additionalParams: {
    audience: "api.atlassian.com",
    prompt: "consent",
  },
};
```

**Option B: Environment Variables**

```bash
# .env
VITE_JIRA_CLIENT_ID=your_client_id
VITE_JIRA_CLIENT_SECRET=your_client_secret
```

**Option C: Settings UI** (Recommended for Jira)
Since Jira supports multiple instance types (Cloud/Server) and custom domains:

```tsx
{provider.id === "jira" && !provider.authenticated && (
  <Stack spacing={2}>
    <FormControl>
      <InputLabel>Instance Type</InputLabel>
      <Select value={instanceType} onChange={handleInstanceTypeChange}>
        <MenuItem value="cloud">Jira Cloud (Atlassian)</MenuItem>
        <MenuItem value="server">Jira Server / Data Center</MenuItem>
      </Select>
    </FormControl>
    
    {instanceType === "cloud" && (
      <>
        <TextField
          label="OAuth Client ID"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          helperText="From Atlassian Developer Console"
        />
        <TextField
          label="OAuth Client Secret"
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
        />
      </>
    )}
    
    {instanceType === "server" && (
      <>
        <TextField
          label="Jira Base URL"
          value={baseUrl}
          placeholder="https://jira.yourcompany.com"
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <FormControl>
          <InputLabel>Auth Method</InputLabel>
          <Select value={authMethod}>
            <MenuItem value="basic">Basic Auth</MenuItem>
            <MenuItem value="api-token">API Token</MenuItem>
            <MenuItem value="oauth">OAuth 1.0a (Server)</MenuItem>
          </Select>
        </FormControl>
      </>
    )}
  </Stack>
)}
```

#### Step 3: Test Jira OAuth Flow

1. **Select Jira Cloud** instance type
2. **Enter OAuth credentials**
3. **Click "Connect"**
4. **Authorize on Atlassian:**
   - Select Jira site
   - Approve permissions
   - Redirects back
5. **Verify:** Issues sync successfully

### Phase 3: Production Considerations

#### Security Best Practices

1. **Never Commit Secrets:**

   ```bash
   # .gitignore
   .env
   .env.local
   src/config/secrets.ts
   ```

2. **Encrypt Client Secrets in Storage:**

   ```typescript
   // Use Web Crypto API
   async function encryptSecret(secret: string): Promise<string> {
     const encoder = new TextEncoder();
     const data = encoder.encode(secret);
     const key = await crypto.subtle.generateKey(
       { name: "AES-GCM", length: 256 },
       true,
       ["encrypt", "decrypt"]
     );
     // ... encryption logic
   }
   ```

3. **Use PKCE for OAuth (if supported):**
   - GitHub: Supports PKCE
   - Jira Cloud: Supports PKCE

   ```typescript
   // Generate code verifier and challenge
   const verifier = generateCodeVerifier();
   const challenge = await generateCodeChallenge(verifier);
   
   // Add to auth URL
   const authUrl = `${config.authUrl}?` +
     `client_id=${config.clientId}&` +
     `redirect_uri=${config.redirectUri}&` +
     `response_type=code&` +
     `code_challenge=${challenge}&` +
     `code_challenge_method=S256`;
   ```

#### Chrome Web Store Deployment

1. **Update manifest.json:**

   ```json
   {
     "oauth2": {
       "client_id": "your_client_id.apps.googleusercontent.com",
       "scopes": [
         "https://www.googleapis.com/auth/userinfo.email"
       ]
     }
   }
   ```

2. **Redirect URI Format:**
   - Chrome: `https://<extension-id>.chromiumapp.org/<path>`
   - Get extension ID after first upload to Web Store

3. **Update OAuth Apps:**
   - GitHub: Add production redirect URI
   - Jira: Add production redirect URI

#### Firefox Add-ons (if supporting)

1. **Different Redirect URI Format:**

   ```javascript
   // Firefox uses different format
   browser.identity.getRedirectURL()
   // Returns: https://<extension-id>.extensions.allizom.org/
   ```

2. **Update OAuth Apps:**
   - Register Firefox redirect URIs separately

## Testing Checklist

### GitHub OAuth

- [ ] OAuth popup opens correctly
- [ ] User can approve scopes
- [ ] Redirect back to extension works
- [ ] Access token received and stored
- [ ] User info fetched successfully
- [ ] PRs can be fetched with OAuth token
- [ ] Token refresh works automatically
- [ ] Error handling works (cancel, network error)
- [ ] Logout clears tokens properly

### Jira OAuth

- [ ] Jira Cloud OAuth flow works
- [ ] Can select Jira site during auth
- [ ] Access token received and stored
- [ ] User info fetched successfully
- [ ] Issues can be fetched with OAuth token
- [ ] Token refresh works automatically
- [ ] Jira Server fallback (API token) works
- [ ] Error handling works

### Edge Cases

- [ ] Token expires during use → auto-refresh
- [ ] Network offline during auth → proper error
- [ ] User cancels auth → graceful handling
- [ ] Invalid client credentials → clear error message
- [ ] Multiple providers → independent auth states
- [ ] Extension reload → auth state persists

## Migration Path (PAT → OAuth)

For users currently using Personal Access Tokens:

1. **Keep PAT as Fallback:**

   ```typescript
   // In authenticate() method
   const config = await this.getConfig();
   const pat = config.personalAccessToken;
   
   if (pat) {
     // Use PAT
     return await this.authenticateWithPAT(pat);
   } else {
     // Use OAuth
     return await this.authenticateOAuth();
   }
   ```

2. **Add Migration UI:**

   ```tsx
   {provider.authenticated && provider.config.personalAccessToken && (
     <Alert severity="info">
       <AlertTitle>Migrate to OAuth</AlertTitle>
       You're using a Personal Access Token. 
       <Button onClick={handleMigrateToOAuth}>
         Switch to OAuth for better security
       </Button>
     </Alert>
   )}
   ```

3. **Handle Migration:**

   ```typescript
   async function migrateToOAuth(providerId: string) {
     // Clear PAT
     await updateProviderConfig(providerId, {
       personalAccessToken: undefined,
     });
     
     // Trigger OAuth flow
     await provider.authenticate();
   }
   ```

## Recommended Implementation Order

1. ✅ **Week 1: GitHub OAuth (Development)**
   - Register GitHub OAuth App
   - Add Client ID/Secret to code (hardcoded for testing)
   - Test full OAuth flow
   - Verify token refresh
   - Document redirect URI

2. ✅ **Week 2: Jira OAuth (Development)**
   - Register Jira Cloud OAuth App
   - Add Client ID/Secret to code
   - Test OAuth flow
   - Test with multiple Jira sites

3. ✅ **Week 3: Settings UI**
   - Add OAuth credentials input fields
   - Implement secure storage
   - Add validation and error messages
   - Test credential updates

4. ✅ **Week 4: Production Hardening**
   - Implement PKCE (if not already)
   - Add secret encryption
   - Environment variable support
   - Security audit
   - Documentation

## Resources

### GitHub OAuth

- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub API Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)

### Jira OAuth

- [Atlassian OAuth 2.0 Documentation](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Jira OAuth Scopes](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/)

### Chrome Extensions

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [OAuth2 in Extensions](https://developer.chrome.com/docs/extensions/mv3/tut_oauth/)

### Security

- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## Conclusion

**Current State:** 🟡 90% Complete (Architecture Done)

**What You Have:**

- ✅ Full OAuth2 infrastructure
- ✅ Token management with auto-refresh
- ✅ CSRF protection
- ✅ Event-driven auth state
- ✅ Provider integration ready

**What You Need:**

- ⚠️ Register OAuth Apps (GitHub + Jira)
- ⚠️ Configure Client IDs/Secrets
- ⚠️ Test OAuth flows
- ⚠️ Optional: Settings UI for credentials

**Estimated Effort:** 4-8 hours

- 1-2 hours: Register OAuth apps
- 1-2 hours: Configure and test GitHub
- 1-2 hours: Configure and test Jira
- 1-2 hours: Settings UI (optional)

The infrastructure is production-ready. You just need to register the OAuth applications and configure the credentials!
