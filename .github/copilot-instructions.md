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

## Project Context - Current Status (Oct 7, 2025)

### What's Been Completed:

**Phase 1 (Complete):**
- ✅ Project setup with Vite + React + TypeScript
- ✅ Core type definitions (auth.ts, provider.ts, bookmark.ts, storage.ts)
- ✅ Storage Manager implementation
- ✅ Logger utility system
- ✅ Browser API utilities

**Phase 2.1 (Complete - Committed):**
- ✅ Auth Manager Core (`src/services/auth-manager.ts`) - 600 lines
- ✅ OAuth 2.0 flow handling via `browser.identity.launchWebAuthFlow()`
- ✅ Token management with automatic refresh (5 min before expiry)
- ✅ Provider registration system with custom refresh callbacks
- ✅ Event system for auth state changes (4 events)
- ✅ CSRF protection using crypto.getRandomValues()
- ✅ 11 public methods, 14 private methods
- ✅ Commit: b39ee9e

**Phase 2.2 (Complete - Committed):**
- ✅ GitHub Provider (`src/providers/github/github-provider.ts`) - 365 lines
- ✅ OAuth 2.0 integration via AuthManager delegation
- ✅ GitHub API user info fetching
- ✅ PR search (authored + review-requested) with deduplication
- ✅ Scopes: `repo`, `read:user`, `read:org`
- ✅ 7 public methods implementing Provider interface
- ✅ 5 private helper methods for GitHub API
- ✅ 3 TypeScript interfaces for API responses
- ✅ Commit: 3850c97

**Phase 2.3 (Complete - Committed):**
- ✅ Jira Provider (`src/providers/jira/jira-provider.ts`) - 545 lines
- ✅ Multi-auth support: OAuth 2.0, API tokens, basic auth
- ✅ Jira Cloud and Server/Data Center support
- ✅ Automatic instance type detection
- ✅ JQL-based issue fetching (assigned, non-done)
- ✅ Conditional AuthManager delegation (OAuth only)
- ✅ 10 public methods implementing Provider interface
- ✅ 7 private helper methods for Jira API
- ✅ 4 TypeScript interfaces + 2 type aliases
- ✅ Commit: efcc55d

**Phase 3 (Complete - Committed):**
- ✅ Provider Registry (`src/services/provider-registry.ts`) - 380 lines
- ✅ Centralized provider registration and discovery
- ✅ Provider lifecycle management (initialize, dispose)
- ✅ Configuration management for all providers
- ✅ Status tracking (initialized, authenticated, enabled)
- ✅ Batch operations across multiple providers
- ✅ Graceful error handling and degradation
- ✅ 15 public methods, 2 private helper methods
- ✅ Auto-registers GitHub and Jira providers on init
- ✅ Registry pattern with Map-based storage for O(1) lookups
- ✅ Commit: 3c32362

**Phase 4 (Complete - Committed):**
- ✅ **Phase 4.1**: Bookmark Manager (`src/services/bookmark-manager.ts`) - 370 lines
  - Type-safe browser.bookmarks API wrapper
  - 15 public methods for folder and bookmark operations
  - Batch operations with error collection
  - Folder ID caching for performance
  - Duplicate detection
  - Commit: af04e4b
- ✅ **Phase 4.2**: Sync Engine (`src/services/sync-engine.ts`) - 275 lines
  - Diff-based synchronization orchestrator
  - 3-way merge algorithm (toAdd/toUpdate/toDelete)
  - URL-based deduplication
  - Last sync timestamp tracking via ProviderStorageData
  - Integration with BookmarkManager and ProviderRegistry
  - Commit: 4558aa7
- ✅ **Phase 4.3**: Background Scheduler - 400+ lines
  - `src/background/scheduler.ts` (280 lines) - Periodic sync scheduling
  - `src/background/main.ts` (125 lines) - Service worker entry point
  - `browser.alarms` API for reliable scheduling
  - Configurable interval via extension settings
  - Retry logic with MAX_RETRIES (3) and 5-minute delays
  - Manual sync triggers via chrome.runtime.onMessage
  - Message handlers: SYNC_ALL, SYNC_PROVIDER, GET_SYNC_STATUS
  - Manifest updated: background service worker + permissions (bookmarks, storage, alarms)
  - Commit: 7ad748c

### Current Phase (Phase 6 - NEXT):
- 📋 **TODO**: UI Components (Browser Action, Sidepanel, Settings)
- 📋 Browser action popup UI
- 📋 Provider configuration panels
- 📋 Authentication flow UI
- 📋 Item display and management
- 📋 Settings and preferences
- 📋 Manual sync triggers integrated with BackgroundScheduler

### Phase 6 Requirements:
1. Browser Action Popup:
   - Quick access to recent items
   - Provider status indicators
   - Authentication triggers
   - Settings access

2. Sidepanel UI:
   - Full item list with filtering
   - Provider management
   - Item actions (open, archive)

3. Settings Panel:
   - Provider configuration
   - Sync preferences
   - Authentication management

### Phase 5 (Optional - Skipped for Now):
- Conflict resolution strategies
- Enhanced error handling and user notifications
- Rate limiting for provider APIs
- Sync progress indicators

---

## Key Architecture Notes

### Sync System Architecture (Phase 4)

**Data Flow:**
```text
Extension Install/Startup
  ↓
Background Service Worker → BackgroundScheduler.initialize()
  ↓
Schedule Periodic Alarm (from settings.syncInterval)
  ↓
Alarm Triggers → syncAll() → For each enabled provider:
  ↓
SyncEngine.syncProvider(providerId)
  ├─ 1. Fetch current bookmarks (BookmarkManager)
  ├─ 2. Fetch provider items (ProviderRegistry)
  ├─ 3. Calculate diff (toAdd/toUpdate/toDelete)
  ├─ 4. Apply changes (BookmarkManager batch ops)
  └─ 5. Update lastSync timestamp (StorageManager)
```

**Message Passing API:**
```typescript
// From popup/sidepanel to background service worker:
chrome.runtime.sendMessage({ type: "SYNC_ALL" })
chrome.runtime.sendMessage({ type: "SYNC_PROVIDER", providerId: "github" })
chrome.runtime.sendMessage({ type: "GET_SYNC_STATUS" })
```

### AuthManager Implementation (Phase 2.1):

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
- **Singleton pattern** for AuthManager and all services
- **Provider registration system** for extensibility
- **Event-driven architecture** for auth state changes (4 events: auth_success, auth_failure, token_refresh, auth_revoked)
- **Automatic token refresh** with scheduling (5 min before expiry)
- **CSRF protection** using crypto.getRandomValues()
- **Secure token storage** using browser.storage.local via StorageManager
- **Cross-browser compatibility** using WebExtension polyfill
- **Delegation pattern** for provider authentication (delegates to AuthManager)

---

## Working File Locations

**Completed and Safe:**
- `src/types/auth.ts` ✅
- `src/types/provider.ts` ✅
- `src/types/bookmark.ts` ✅
- `src/types/storage.ts` ✅
- `src/services/storage.ts` ✅
- `src/services/auth-manager.ts` ✅ (Phase 2.1 complete)
- `src/providers/github/github-provider.ts` ✅ (Phase 2.2 complete)
- `src/providers/jira/jira-provider.ts` ✅ (Phase 2.3 complete)
- `src/services/provider-registry.ts` ✅ (Phase 3 complete)
- `src/services/bookmark-manager.ts` ✅ (Phase 4.1 complete)
- `src/services/sync-engine.ts` ✅ (Phase 4.2 complete)
- `src/background/scheduler.ts` ✅ (Phase 4.3 complete)
- `src/background/main.ts` ✅ (Phase 4.3 complete)
- `src/utils/logger.ts` ✅
- `src/utils/browser.ts` ✅

**Next to Create:**
- Browser action popup components 📋 (Phase 6)
- Sidepanel components 📋 (Phase 6)
- Settings/configuration UI 📋 (Phase 6)

---

## Phase Status Summary

**Phase 1:** ✅ Complete (Types, Storage, Logger, Browser utils)
**Phase 2.1:** ✅ Complete (AuthManager - Commit b39ee9e)
**Phase 2.2:** ✅ Complete (GitHub Provider - Commit 3850c97)
**Phase 2.3:** ✅ Complete (Jira Provider - Commit efcc55d)
**Phase 3:** ✅ Complete (Provider Registry - Commit 3c32362)
**Phase 4.1:** ✅ Complete (Bookmark Manager - Commit af04e4b)
**Phase 4.2:** ✅ Complete (Sync Engine - Commit 4558aa7)
**Phase 4.3:** ✅ Complete (Background Scheduler - Commit 7ad748c)
**Phase 5:** 📋 Optional (Conflict Resolution, Enhanced Error Handling)
**Phase 6:** 📋 Next (UI Components, Browser Action, Sidepanel, Settings)

---

## Development Workflow

**Standard workflow for each phase:**
1. Implement feature/component
2. Fix TypeScript errors (`npm run typecheck`)
3. Fix linting issues (`npm run lint:fix` and `npm run lint:md:fix`)
4. Create completion documentation in `docs/phase-X.X-completion.md`
5. Commit with descriptive message following conventional commits format

**Quality checks before commit:**
- ✅ `npm run typecheck` - No TypeScript errors
- ✅ `npm run lint` - No Biome linting errors
- ✅ `npm run lint:md` - No markdown linting errors

**Linting Commands:**
- `npm run lint` - Check TypeScript/JavaScript code with Biome
- `npm run lint:fix` - Auto-fix Biome linting issues
- `npm run lint:md` - Check markdown files (docs/**/*.md)
- `npm run lint:md:fix` - **Auto-fix markdown issues** (use this instead of manual fixes!)

**Important:** When creating markdown documentation (especially in `docs/`), use `npm run lint:md:fix` to automatically fix formatting issues like:
- Tabs vs spaces in code blocks
- Missing blank lines around headings/lists/code blocks
- Emphasis used instead of headings
This is much faster than manually fixing markdown linting errors.

---

## File Corruption Recovery (Historical Context)

**Status:** ✅ RESOLVED - Issue occurred during Phase 2.1 development

**Historical issue:** VS Code file watcher + TypeScript language service caching conflict caused `create_file` tool to merge new content with cached content.

**Resolution:** Manual paste approach was used successfully. Issue has not recurred in Phase 2.2.

**If it happens again:**
1. STOP immediately, don't retry
2. User must restart VS Code (full restart)
3. Use `create_file` tool on first attempt after restart
4. If corruption persists, switch to manual paste approach
