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

## Project Context - Current Status (Oct 8, 2025)

### What's Been Completed:

**Phase 1 (Complete):**
- ✅ Project setup with Vite + React + TypeScript
- ✅ Core type definitions (auth.ts, provider.ts, bookmark.ts, storage.ts)
- ✅ Storage Manager implementation
- ✅ Logger utility system
- ✅ Browser API utilities

**Phase 2 (Complete - All 3 sub-phases):**
- ✅ Auth Manager Core (`src/services/auth-manager.ts`) - 600 lines
- ✅ OAuth 2.0 flow handling via `browser.identity.launchWebAuthFlow()`
- ✅ GitHub Provider (`src/providers/github/github-provider.ts`) - 365 lines
- ✅ Jira Provider (`src/providers/jira/jira-provider.ts`) - 545 lines
- ✅ Multi-auth support: OAuth 2.0, API tokens, basic auth
- ✅ Token management with automatic refresh (5 min before expiry)
- ✅ CSRF protection using crypto.getRandomValues()

**Phase 3 (Complete):**
- ✅ Provider Registry (`src/services/provider-registry.ts`) - 380 lines
- ✅ Centralized provider registration and discovery
- ✅ Provider lifecycle management (initialize, dispose)
- ✅ Configuration management for all providers
- ✅ Status tracking (initialized, authenticated, enabled)

**Phase 4 (Complete - All 3 sub-phases):**
- ✅ Bookmark Manager (`src/services/bookmark-manager.ts`) - 370 lines
- ✅ Sync Engine (`src/services/sync-engine.ts`) - 275 lines
- ✅ Background Scheduler (`src/background/scheduler.ts`) - 338 lines
- ✅ Background Service Worker (`src/background/main.ts`) - 135 lines
- ✅ 3-way merge algorithm (toAdd/toUpdate/toDelete)
- ✅ Periodic sync via browser.alarms API
- ✅ Manual sync triggers via chrome.runtime.onMessage

**Phase 6 (Complete - All 4 sub-phases): 🎉**
- ✅ **Phase 6.1**: Popup UI (Header, ProviderList, ProviderCard, QuickActions) - Commit 53a6f16
- ✅ **Phase 6.2a**: Providers View (configuration, toggles, folders) - Commit b7d9c5a
- ✅ **Phase 6.2b**: Items View (bookmark display, search) - Commit 870f4b6
- ✅ **Phase 6.2c**: Settings View (sync interval, notifications, theme) - Commit 8d9dfbf
- ✅ **Phase 6.3**: Authentication Flow (OAuth, Connect buttons) - Commit 590bd34
- ✅ **Phase 6.4a**: Loading Skeletons (better UX) - Commit 1489c30
- ✅ **Phase 6.4b**: Error Boundaries (graceful recovery) - Commit 89eb777
- ✅ **Phase 6.4c**: Fade Transitions (smooth UX) - Commit 16217f6
- ✅ **Total**: 17 files, ~1,930 lines, production-ready UI
- ✅ See `docs/phase-6-completion.md` for full details

**Phase 5 (Complete - All 4 sub-phases): 🎉**

- ✅ **Phase 5.1**: Conflict Resolution System - Commit 425f1a9
- ✅ **Phase 5.2**: Enhanced Notification System - Commit 425f1a9
- ✅ **Phase 5.3**: Advanced Error Handling & Retry Logic - Commit 106f542
- ✅ **Phase 5.4**: Rate Limiting for Provider APIs - Commit 106f542
- ✅ **Total**: 4 services, ~1,895 lines, robust error handling
- ✅ See `docs/phase-5-completion.md` for full details

**Phase 7.1 (Complete): ✅**

- ✅ **Testing Infrastructure Setup** - Commit c0bc7be
- ✅ Vitest with coverage support (@vitest/coverage-v8)
- ✅ Browser API mocks (storage, runtime, bookmarks, identity, alarms, notifications)
- ✅ Test environment setup with global mocks
- ✅ StorageManager test suite (16 tests, all passing)
- ✅ Test scripts (test, test:ui, test:run, test:coverage)
- ✅ 80% coverage thresholds configured
- ✅ See `docs/phase-7.1-completion.md` for full details

### Current Phase (Testing & Quality Assurance):

- 🎯 **Extension is fully functional and production-ready**
- 🎯 All core features implemented (auth, sync, UI)
- 🎯 Advanced features complete (conflicts, notifications, retry, rate limiting)
- 🎯 Testing infrastructure operational (Vitest, browser mocks, 16 tests passing)
- 🎯 Ready to write comprehensive test suites for all services
- 🎯 TypeScript strict mode + Biome linting passing

### Next Steps (Testing Expansion & Deployment):

- 🧪 Phase 7.2: Core service tests (auth-manager, sync-engine, Phase 5 services)
- 🧪 Phase 7.3: Provider integration tests (GitHub, Jira)
- 🧪 Phase 7.4: Manual testing and error polish
- 📝 README updates with screenshots
- 📦 Extension packaging and testing
- 🚀 Prepare for Chrome Web Store submission

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
**Phase 2:** ✅ Complete (AuthManager, GitHub Provider, Jira Provider)
**Phase 3:** ✅ Complete (Provider Registry - Commit 3c32362)
**Phase 4:** ✅ Complete (Bookmark Manager, Sync Engine, Background Scheduler)
**Phase 5:** ✅ Complete (Conflict Resolution, Notifications, Retry, Rate Limiting)
**Phase 6:** ✅ Complete (Popup UI, Sidepanel Views, Authentication, Polish)
**Phase 7.1:** ✅ Complete (Testing Infrastructure - Vitest, Browser Mocks, StorageManager tests)

**Phase 6 Sub-phases:**
- ✅ Phase 6.1: Popup UI (Commit 53a6f16)
- ✅ Phase 6.2a: Providers View (Commit b7d9c5a)
- ✅ Phase 6.2b: Items View (Commit 870f4b6)
- ✅ Phase 6.2c: Settings View (Commit 8d9dfbf)
- ✅ Phase 6.3: Authentication Flow (Commit 590bd34)
- ✅ Phase 6.4: Polish & Testing (Commits 1489c30, 89eb777, 16217f6)

**🎉 Extension is production-ready with testing infrastructure!**

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
