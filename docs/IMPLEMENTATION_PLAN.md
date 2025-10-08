# Live Folders - Implementation Plan

## Project Overview

**Goal:** Build a Firefox/Zen Browser extension that creates dynamic bookmark folders synchronized with external APIs (GitHub, Jira, and extensible to other services).

**Timeline:** 6-8 weeks for MVP
**Tech Stack:** TypeScript, React, Vite, WebExtension APIs

---

## Phase 1: Foundation & Core Infrastructure (Week 1-2)

### 1.1 Project Setup & Configuration ✓

- [x] Initialize project with Vite + React + TypeScript
- [x] Configure CRXJS for extension development
- [x] Set up basic manifest.json structure
- [x] Add WebExtension polyfill for cross-browser compatibility
- [x] Configure TypeScript strict mode
- [x] Set up Biome
- [x] Configure build for Firefox (.xpi) and Chrome (.crx)

### 1.2 Core Type Definitions

**Files to create:**

- `src/types/provider.ts` - Provider interface and types
- `src/types/bookmark.ts` - Bookmark item types
- `src/types/storage.ts` - Storage schema types
- `src/types/auth.ts` - Authentication types

**Tasks:**

```typescript
// Define core interfaces
- Provider interface
- BookmarkItem interface
- StorageSchema interface
- AuthResult interface
- ProviderConfig interface
```

### 1.3 Storage Manager

**File:** `src/services/storage.ts`

**Implementation:**

```typescript
class StorageManager {
  // CRUD operations for all storage areas
  - getProviders()
  - saveProvider(providerId, config)
  - getAuth(providerId)
  - saveAuth(providerId, tokens)
  - getSettings()
  - saveSettings(settings)
  - getBookmarkMetadata(providerId)
  - saveBookmarkMetadata(providerId, metadata)
}
```

**Tasks:**

- Implement storage wrapper around browser.storage.local
- Add encryption helpers for sensitive data
- Create migration system for schema updates
- Add storage quota monitoring

### 1.4 Logger/Debug Utility

**File:** `src/utils/logger.ts`

**Features:**

- Different log levels (debug, info, warn, error)
- Structured logging
- Toggle debug mode via settings
- Never log sensitive data (tokens, passwords)

---

## Phase 2: Authentication System (Week 2-3)

### 2.1 Auth Manager Core

**File:** `src/services/auth-manager.ts`

**Implementation:**

```typescript
class AuthManager {
  - authenticate(providerId)
  - isAuthenticated(providerId)
  - getToken(providerId)
  - refreshToken(providerId)
  - revokeAuth(providerId)
  - clearAuth(providerId)
}
```

**Tasks:**

- Implement OAuth 2.0 flow using browser.identity
- Create redirect URI handler
- Implement token storage with encryption
- Add token expiration checking
- Implement automatic token refresh

### 2.2 GitHub OAuth Integration

**File:** `src/providers/github/auth.ts`

**Setup:**

- Create GitHub OAuth App
- Configure redirect URI
- Store client ID/secret securely

**Scopes needed:**

- `repo` - Access repositories
- `read:user` - Read user profile

**Tasks:**

- Implement GitHub-specific OAuth flow
- Handle callback and code exchange
- Store access token
- Test authentication flow

### 2.3 Jira OAuth Integration

**File:** `src/providers/jira/auth.ts`

**Setup:**

- Configure Jira OAuth (OAuth 2.0 or API tokens)
- Handle Jira Cloud vs Server differences

**Tasks:**

- Implement Jira-specific OAuth flow
- Support API token authentication (fallback)
- Store credentials securely
- Test authentication flow

---

## Phase 3: Provider System (Week 3-4)

### 3.1 Provider Registry

**File:** `src/services/provider-registry.ts`

**Implementation:**

```typescript
class ProviderRegistry {
  - registerProvider(provider)
  - getProvider(providerId)
  - getAllProviders()
  - isProviderEnabled(providerId)
  - enableProvider(providerId)
  - disableProvider(providerId)
}
```

### 3.2 GitHub Provider

**File:** `src/providers/github/github-provider.ts`

**API Endpoints:**

- GET `/search/issues?q=is:pr+author:{user}+is:open`
- GET `/search/issues?q=is:pr+review-requested:{user}+is:open`

**Implementation:**

```typescript
class GitHubProvider implements Provider {
  - authenticate()
  - isAuthenticated()
  - fetchItems() -> Promise<BookmarkItem[]>
  - getConfig()
  - setConfig()
}
```

**Tasks:**

- Implement GitHub API client
- Fetch PRs created by user
- Fetch PRs assigned for review
- Transform PR data to BookmarkItem format
- Handle pagination
- Implement rate limiting
- Add error handling

**BookmarkItem mapping:**

```typescript
{
  id: pr.node_id,
  title: `#${pr.number}: ${pr.title}`,
  url: pr.html_url,
  metadata: {
    repository: pr.repository_url,
    state: pr.state,
    created_at: pr.created_at
  }
}
```

### 3.3 Jira Provider

**File:** `src/providers/jira/jira-provider.ts`

**API Endpoints:**

- GET `/rest/api/3/search?jql=assignee=currentUser()+AND+status!=Done`

**Implementation:**

```typescript
class JiraProvider implements Provider {
  - authenticate()
  - isAuthenticated()
  - fetchItems() -> Promise<BookmarkItem[]>
  - getConfig()
  - setConfig()
}
```

**Tasks:**

- Implement Jira API client
- Fetch issues assigned to user
- Transform issue data to BookmarkItem format
- Handle pagination
- Support custom JQL queries
- Add error handling

**Configuration:**

- Jira instance URL (for Jira Server)
- Custom JQL filter (optional)

---

## Phase 4: Sync Engine (Week 4-5)

### 4.1 Bookmark Manager

**File:** `src/services/bookmark-manager.ts`

**Implementation:**

```typescript
class BookmarkManager {
  - createFolder(title, parentId?)
  - getFolder(folderId)
  - getFolderContents(folderId)
  - createBookmark(folderId, item)
  - updateBookmark(bookmarkId, item)
  - deleteBookmark(bookmarkId)
  - clearFolder(folderId)
  - batchCreate(folderId, items)
  - batchDelete(bookmarkIds)
}
```

**Tasks:**

- Wrap browser.bookmarks API
- Implement batch operations
- Add error handling and retries
- Handle bookmark conflicts

### 4.2 Sync Engine Core

**File:** `src/services/sync-engine.ts`

**Implementation:**

```typescript
class SyncEngine {
  - syncAll()
  - syncProvider(providerId)
  - calculateDiff(currentItems, newItems)
  - applyChanges(folderId, diff)
  - getLastSyncTime(providerId)
  - setLastSyncTime(providerId, timestamp)
}
```

**Diff Algorithm:**

```typescript
interface SyncDiff {
  toAdd: BookmarkItem[];
  toUpdate: { item: BookmarkItem; bookmarkId: string }[];
  toDelete: string[]; // bookmark IDs
}

calculateDiff(current, fetched):
  - Compare item IDs
  - Identify new items (in fetched, not in current)
  - Identify removed items (in current, not in fetched)
  - Identify updated items (in both, but changed)
  - Return diff object
```

**Tasks:**

- Implement sync orchestration
- Create diff calculation logic
- Apply changes efficiently
- Handle errors gracefully
- Update metadata storage
- Log sync operations

### 4.3 Background Scheduler

**File:** `src/background/scheduler.ts`

**Implementation:**

```typescript
class SyncScheduler {
  - start()
  - stop()
  - scheduleNextSync()
  - handleAlarm(alarm)
  - setSyncInterval(interval)
}
```

**Tasks:**

- Set up browser.alarms
- Create alarm handler
- Schedule periodic syncs (60s default)
- Handle browser wake/sleep
- Implement manual sync trigger

---

## Phase 5: Background Service Worker (Week 5)

### 5.1 Background Script

**File:** `src/background/index.ts`

**Implementation:**

```typescript
// Initialization
browser.runtime.onInstalled.addListener(async (details) => {
  // First install: create default folders
  // Update: run migrations
})

// Alarm handler
browser.alarms.onAlarm.addListener(async (alarm) => {
  // Trigger sync for all enabled providers
})

// Message handler
browser.runtime.onMessage.addListener(async (message) => {
  // Handle commands from UI:
  // - manual sync
  // - enable/disable provider
  // - authenticate
})
```

**Tasks:**

- Initialize extension on install
- Set up alarm listeners
- Implement message handlers
- Create folder structure on first run
- Handle provider lifecycle
- Implement error recovery

### 5.2 Update manifest.json

**File:** `manifest.config.ts`

**Required permissions:**

```json
{
  "permissions": [
    "bookmarks",
    "alarms",
    "storage",
    "identity"
  ],
  "host_permissions": [
    "https://github.com/*",
    "https://api.github.com/*",
    "https://*.atlassian.net/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts"
  }
}
```

---

## Phase 6: User Interface (Week 6)

### 6.1 Popup UI Redesign

**File:** `src/popup/App.tsx`

**Components:**

```text
PopupApp
├── Header (logo, title)
├── ProviderList
│   ├── ProviderCard (GitHub)
│   │   ├── Status indicator
│   │   ├── Enable/Disable toggle
│   │   └── Last sync time
│   ├── ProviderCard (Jira)
│   └── AddProviderButton
├── SyncButton (manual sync all)
└── Footer
    ├── Settings link (opens side panel)
    └── Help link
```

**Tasks:**

- Design UI mockups
- Implement component structure
- Add provider status display
- Implement enable/disable toggles
- Add manual sync button
- Show sync status and errors
- Style with CSS

### 6.2 Side Panel UI

**File:** `src/sidepanel/App.tsx`

**Components:**

```text
SidePanelApp
├── Navigation
│   ├── Providers tab
│   ├── Settings tab
│   └── Logs tab
├── ProvidersView
│   ├── ProviderDetailCard
│   │   ├── Authentication status
│   │   ├── Connect/Disconnect button
│   │   ├── Configuration form
│   │   └── Folder selection
│   └── AddProviderFlow
├── SettingsView
│   ├── Sync interval slider
│   ├── Notification preferences
│   └── Advanced options
└── LogsView
    └── Sync history table
```

**Tasks:**

- Implement tabbed navigation
- Create provider detail views
- Build OAuth flow UI
- Add configuration forms
- Implement settings panel
- Create sync logs viewer
- Add error displays

### 6.3 Shared Components

**Files:** `src/components/`

**Components to create:**

- `Button.tsx` - Reusable button
- `Toggle.tsx` - Enable/disable switch
- `Card.tsx` - Container component
- `LoadingSpinner.tsx` - Loading state
- `ErrorBanner.tsx` - Error display
- `ProviderIcon.tsx` - Provider logos
- `StatusBadge.tsx` - Connection status

---

## Phase 7: Testing & Polish (Week 7)

### 7.1 Unit Tests

**Framework:** Vitest

**Test coverage:**

- `storage.test.ts` - Storage operations
- `auth-manager.test.ts` - Authentication flows
- `sync-engine.test.ts` - Diff calculation and sync logic
- `github-provider.test.ts` - GitHub API integration
- `jira-provider.test.ts` - Jira API integration
- `bookmark-manager.test.ts` - Bookmark operations

**Tasks:**

- Set up Vitest
- Create test utilities and mocks
- Write unit tests for core services
- Mock browser APIs
- Achieve >80% code coverage

### 7.2 Integration Tests

**Test scenarios:**

- Complete OAuth flow (GitHub and Jira)
- End-to-end sync process
- Bookmark creation/update/deletion
- Error handling and recovery
- Token refresh flows

### 7.3 Manual Testing

**Test matrix:**

- Firefox (latest)
- Zen Browser (latest)
- Different provider states (authenticated, not authenticated)
- Network error scenarios
- Rate limiting scenarios
- Large dataset handling

### 7.4 Error Handling Polish

**Tasks:**

- Add user-friendly error messages
- Implement retry logic
- Add network error detection
- Create fallback behaviors
- Log errors for debugging

---

## Phase 8: Documentation & Release (Week 8)

### 8.1 Documentation

**Files to create:**

- `docs/USER_GUIDE.md` - End-user documentation
- `docs/DEVELOPER_GUIDE.md` - Contributing guide
- `docs/API.md` - Provider API reference
- `docs/TROUBLESHOOTING.md` - Common issues
- Update `README.md` with features and screenshots

### 8.2 Extension Store Assets

**Create:**

- Extension screenshots (5-6 images)
- Promotional images
- Extension description (short and long)
- Privacy policy
- Support contact information

### 8.3 Firefox Add-on Submission

**Tasks:**

- Create developer account
- Package extension (.xpi)
- Submit for review
- Respond to reviewer feedback
- Publish to Firefox Add-ons

### 8.4 GitHub Repository Setup

**Tasks:**

- Add comprehensive README
- Create CONTRIBUTING.md
- Set up issue templates
- Add license (MIT or Apache 2.0)
- Create release workflow (GitHub Actions)
- Tag v1.0.0 release

---

## Post-MVP Enhancements (Future)

### Priority 1 (Next 2-4 weeks)

- [ ] Notification system for new items
- [ ] Custom filters per provider
- [ ] Sorting options for bookmarks
- [ ] Search across all live folders
- [ ] Export/import configuration

### Priority 2 (1-2 months)

- [ ] More providers (Linear, Trello, Asana)
- [ ] Plugin system for custom providers
- [ ] Sync conflict resolution UI
- [ ] Analytics dashboard
- [ ] Keyboard shortcuts

### Priority 3 (Long-term)

- [ ] Mobile browser support
- [ ] Cross-device sync via cloud
- [ ] AI-powered bookmark categorization
- [ ] Integration with browser history
- [ ] Collaborative folders

---

## Development Workflow

### Daily Development Cycle

1. Update from `main` branch
2. Create feature branch
3. Implement feature with tests
4. Run linter and tests locally
5. Create pull request
6. Review and merge
7. Deploy to test environment

### Testing Checklist

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing in Firefox
- [ ] Manual testing in Zen Browser
- [ ] No console errors
- [ ] No memory leaks
- [ ] Meets accessibility standards

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Build successful
- [ ] Signed extension package
- [ ] Release notes written
- [ ] Store listing updated

---

## Risk Mitigation

### Technical Risks

1. **OAuth complexity** → Use tested libraries, extensive testing
2. **Browser API limitations** → Research upfront, build POCs
3. **Rate limiting** → Implement caching, backoff strategies
4. **Performance issues** → Profile early, optimize incremental sync

### Product Risks

1. **User adoption** → Clear value proposition, good UX
2. **Provider API changes** → Version providers, graceful degradation
3. **Security concerns** → Follow best practices, security audit

---

## Success Metrics (Post-Launch)

### Week 1

- 50+ installs
- <5% error rate
- No critical bugs

### Month 1

- 500+ installs
- 4+ star rating
- <2% error rate
- 2+ provider integrations

### Month 3

- 2,000+ installs
- 4.5+ star rating
- 5+ provider integrations
- Community contributions

---

## Resources & References

### Documentation

- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Tools

- [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) - CLI tool
- [Extension Test Runner](https://firefox-source-docs.mozilla.org/testing/extensions/)
- [React DevTools](https://react.dev/learn/react-developer-tools)

### Similar Projects

- Arc Browser Live Folders
- Toby bookmark manager
- OneTab extension
