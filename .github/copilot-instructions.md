# Live Folders - Copilot Instructions


## Critical Terminal Issues to Avoid

### ⚠️ TERMINAL BREAKING COMMANDS - DO NOT USE:

1. **Heredoc commands** - These break VS Code terminal creation:
   ```bash
   # ❌ NEVER USE - Breaks terminals
   cat > file << 'EOF'
   content here
   EOF
   ```

2. **Interactive file creation commands** that wait for input:
   ```bash
   # ❌ AVOID - Can hang terminal system
   cat > filename  # (without heredoc, waits for Ctrl+D)
   ```

3. **Long multi-line terminal commands** that span many lines

### ✅ SAFE ALTERNATIVES:

1. **Use file creation tools instead of terminal commands:**
   ```typescript
   // ✅ SAFE - Use create_file tool
   create_file(filePath, content)
   ```

2. **Simple echo commands for basic content:**
   ```bash
   # ✅ SAFE - Single line, non-interactive
   echo "simple content" > file.txt
   ```

3. **Keep terminal commands short and non-blocking**

## File System Issues Observed

### auth-manager.ts File Corruption - CRITICAL ISSUE
**Status:** Confirmed and reproduced multiple times in session
**Symptoms:**
- `create_file` tool merges new content with ghost/cached content from deleted files
- Results in 5000+ line corrupted files with interleaved code fragments
- Persists even after `rm` command - VS Code caches the content
- TypeScript language service shows thousands of compile errors

**Root Cause:**
- VS Code file watcher + TypeScript language service caching conflict
- The `create_file` tool appends to cached content instead of replacing
- Deleting file via terminal doesn't clear VS Code's internal cache

**Confirmed Failed Attempts:**
1. ❌ `create_file` tool → File corrupted immediately
2. ❌ Delete with `rm` + `create_file` again → Still corrupted
3. ❌ `git clean -fd` + `create_file` → Still corrupted

**ONLY Solution:** 
- **MUST restart VS Code** to clear file caches
- After restart, use `create_file` tool for first attempt
- If corruption happens again, DO NOT retry - restart immediately

### Prevention Strategy (Updated)
1. ✅ **First time creating a file**: Use `create_file` tool
2. ❌ **If file gets corrupted**: STOP immediately, don't retry
3. ✅ **Recovery**: User must restart VS Code (full restart, not reload window)
4. ⚠️ **Never retry creating the same file multiple times** without a restart
5. ✅ After restart, create_file should work on first attempt

## Project Context - Phase 2 Status

### What's Been Completed (Phase 1):
- ✅ Project setup with Vite + React + TypeScript
- ✅ Core type definitions (auth.ts, provider.ts, bookmark.ts, storage.ts)
- ✅ Storage Manager implementation
- ✅ Logger utility system
- ✅ Browser API utilities

### Current Phase (Phase 2 - Authentication System):
- 🔄 **IN PROGRESS**: Auth Manager Core (`src/services/auth-manager.ts`)
- ❌ **BLOCKED**: File corruption issues preventing completion
- 📋 **NEXT**: GitHub OAuth Integration (`src/providers/github/auth.ts`)
- 📋 **NEXT**: Jira OAuth Integration (`src/providers/jira/auth.ts`)

### Phase 2 Requirements:
1. Complete AuthManager class with:
   - OAuth 2.0 flow handling
   - Token management and refresh
   - Provider registration system
   - Event system for auth state changes

2. GitHub provider implementation:
   - OAuth configuration for GitHub API
   - Scopes: `repo`, `read:user`, `read:org`
   - API endpoints for PR fetching

3. Jira provider implementation:
   - Support OAuth 2.0, API tokens, and basic auth
   - Handle Jira Cloud vs Server differences
   - API endpoints for issue fetching

## Recovery Steps After VS Code Restart

**Context:** File corruption issue with `auth-manager.ts` has been blocking Phase 2.1 completion.

**What to do immediately after restart:**

1. **Verify clean state:**
   ```bash
   git status  # Should show only .github/ as untracked
   ls src/services/auth-manager.ts  # Should NOT exist
   ```

2. **Create auth-manager.ts on FIRST attempt:**
   - Use `create_file` tool with complete implementation
   - DO NOT create placeholder first - go straight to full code
   - File should be ~550 lines (see implementation details below)

3. **If corruption occurs again:**
   - STOP immediately
   - Tell user to restart VS Code again
   - DO NOT retry without restart

4. **Success criteria:**
   - File has ~550 lines of clean TypeScript
   - No compile errors
   - Biome linting passes
   - Exports `AuthManager` class and `authManager` singleton

**After successful creation, proceed to:**
- Phase 2.2: GitHub OAuth Integration
- Phase 2.3: Jira OAuth Integration

## Key Architecture Notes

**AuthManager Implementation (Phase 2.1 - TO BE CREATED NEXT):**

```typescript
// Location: src/services/auth-manager.ts
export class AuthManager {
  // Singleton instance
  // Maps for: eventListeners, refreshCallbacks, refreshTimers, oauthConfigs
  
  // Public methods (11):
  - initialize() - Setup and schedule token refreshes
  - registerOAuthConfig() - Register provider OAuth config
  - registerRefreshCallback() - Custom refresh logic per provider
  - authenticate() - Full OAuth 2.0 flow via browser.identity
  - isAuthenticated() - Check token validity
  - getToken() - Get access token (auto-refresh if expiring)
  - refreshToken() - Manual token refresh
  - revokeAuth() - Clear authentication
  - getAuthState() - Get full auth state
  - addEventListener() / removeEventListener() - Event subscriptions
  
  // Private methods (12):
  - buildAuthUrl() - OAuth URL construction
  - parseAuthCodeResponse() - Parse redirect with CSRF check
  - exchangeCodeForTokens() - Code → tokens exchange
  - refreshOAuthToken() - Standard OAuth refresh
  - parseTokenResponse() - Token response parsing
  - isTokenExpired() / isTokenExpiringSoon() - Token checks
  - scheduleTokenRefresh() - Auto-refresh scheduling
  - scheduleAllTokenRefreshes() - Init all providers
  - clearTokenRefreshTimer() - Cleanup timers
  - emitEvent() - Event emission
  - generateState() - CSRF protection
  - createError() / isAuthError() - Error handling
}
```

**Key Patterns:**
- **Singleton pattern** for AuthManager
- **Provider registration system** for extensibility
- **Event-driven architecture** for auth state changes (4 events: auth_success, auth_failure, token_refresh, auth_revoked)
- **Automatic token refresh** with scheduling (5 min before expiry)
- **CSRF protection** using crypto.getRandomValues()
- **Secure token storage** using browser.storage.local via StorageManager
- **Cross-browser compatibility** using WebExtension polyfill

## Working File Locations

Safe files (no known issues):
- `src/types/auth.ts` ✅
- `src/types/provider.ts` ✅ 
- `src/types/bookmark.ts` ✅
- `src/types/storage.ts` ✅
- `src/services/storage.ts` ✅
- `src/utils/logger.ts` ✅
- `src/utils/browser.ts` ✅

Problematic files (corruption risk):
- `src/services/auth-manager.ts` ⚠️ (restart VS Code before attempting)

## Phase 3 Dependencies

Phase 3 (Provider System) depends on:
- AuthManager completion from Phase 2
- Provider interface implementation
- GitHub/Jira auth provider classes

Cannot proceed to Phase 3 until Phase 2 auth system is stable.
