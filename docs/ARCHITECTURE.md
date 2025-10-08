# Live Folders - Architecture

## Overview

Live Folders is a Firefox/Zen Browser extension that creates dynamic bookmark folders which automatically sync with external APIs (GitHub, Jira, etc.) to provide real-time access to relevant items like pull requests and work items.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Popup     │  │  Side Panel  │  │  Background  │       │
│  │     UI      │  │      UI      │  │   Service    │       │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                  ┌────────▼────────┐                         │
│                  │  Core Services  │                         │
│                  ├─────────────────┤                         │
│                  │ • Auth Manager  │                         │
│                  │ • Sync Engine   │                         │
│                  │ • Provider Mgr  │                         │
│                  │ • Storage Mgr   │                         │
│                  └────────┬────────┘                         │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   GitHub    │  │    Jira     │  │   Custom    │         │
│  │  Provider   │  │  Provider   │  │  Providers  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
     ┌─────────┐       ┌─────────┐      ┌─────────┐
     │ GitHub  │       │  Jira   │      │ Custom  │
     │   API   │       │   API   │      │  APIs   │
     └─────────┘       └─────────┘      └─────────┘
```

## Core Components

### 1. Background Service Worker

**Purpose:** Orchestrates all extension functionality, manages periodic syncs, and handles long-running operations.

**Responsibilities:**

- Initialize extension on install/update
- Schedule and execute periodic bookmark syncs (every 60 seconds)
- Manage alarms for provider updates
- Handle cross-component messaging
- Maintain provider lifecycle

**Key APIs:**

- `chrome.alarms` - For scheduling periodic syncs
- `chrome.bookmarks` - For creating/updating bookmark folders
- `chrome.storage` - For persisting configuration and OAuth tokens

### 2. Provider System

**Purpose:** Abstraction layer for integrating different external services.

**Interface Definition:**

```typescript
interface Provider {
  id: string;
  name: string;
  icon: string;
  
  // Auth methods
  authenticate(): Promise<AuthResult>;
  isAuthenticated(): Promise<boolean>;
  refreshToken(): Promise<void>;
  
  // Data fetching
  fetchItems(): Promise<BookmarkItem[]>;
  
  // Configuration
  getConfig(): ProviderConfig;
  setConfig(config: ProviderConfig): void;
}

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  metadata?: Record<string, any>;
}
```

**Built-in Providers:**

- **GitHubProvider:** Fetches PRs created by user or assigned for review
- **JiraProvider:** Fetches issues assigned to user

**Provider Registry:**

- Central registry for all providers
- Dynamic provider loading
- Validation of provider implementations

### 3. Authentication Manager

**Purpose:** Handle OAuth flows and token management for all providers.

**Features:**

- OAuth 2.0 flow handling using `chrome.identity.launchWebAuthFlow()`
- Secure token storage using `chrome.storage.local`
- Token refresh logic
- Per-provider authentication state

**Storage Schema:**

```typescript
{
  auth: {
    [providerId: string]: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
      user?: UserInfo;
    }
  }
}
```

### 4. Sync Engine

**Purpose:** Coordinate bookmark synchronization across all active providers.

**Features:**

- Fetch items from all authenticated providers
- Diff current bookmarks vs new items
- Create/update/delete bookmarks as needed
- Handle rate limiting and errors gracefully
- Batch operations for efficiency

**Sync Algorithm:**

```text
1. For each enabled provider:
   a. Check if authenticated
   b. Fetch latest items
   c. Compare with stored bookmark IDs
   d. Calculate diff (add/update/remove)
   e. Apply changes to bookmark folder
   f. Update metadata storage
2. Update last sync timestamp
3. Schedule next sync
```

### 5. Storage Manager

**Purpose:** Centralized data persistence layer.

**Storage Structure:**

```typescript
{
  // Provider configurations
  providers: {
    [providerId: string]: {
      enabled: boolean;
      folderId?: string;  // Bookmark folder ID
      lastSync?: number;
      config: ProviderConfig;
    }
  },
  
  // Auth tokens (encrypted)
  auth: { ... },
  
  // Bookmark metadata for diffing
  bookmarks: {
    [providerId: string]: {
      [itemId: string]: {
        bookmarkId: string;
        lastUpdated: number;
      }
    }
  },
  
  // Global settings
  settings: {
    syncInterval: number;  // default: 60000 (1 minute)
    enableNotifications: boolean;
  }
}
```

### 6. UI Components

#### Popup UI

- Quick status overview
- Enable/disable providers
- Trigger manual sync
- Access settings

#### Side Panel UI

- Detailed provider management
- OAuth authentication flows
- View sync history and logs
- Configure sync intervals
- Manage bookmark folders

## Data Flow

### Initial Setup Flow

```text
1. User opens extension popup
2. User clicks "Add GitHub Provider"
3. Extension opens OAuth flow
4. User authorizes on GitHub
5. Extension receives OAuth token
6. Extension creates bookmark folder
7. Extension performs initial sync
8. Extension schedules periodic syncs
```

### Periodic Sync Flow

```text
1. Alarm triggers (every 60s)
2. Background service worker wakes up
3. Sync engine iterates providers
4. Provider fetches latest items
5. Sync engine calculates diff
6. Bookmark API updates folders
7. Storage updated with metadata
8. Next alarm scheduled
```

### Manual Sync Flow

```text
1. User clicks "Sync Now" in popup
2. Message sent to background worker
3. Background worker triggers sync
4. UI receives completion message
5. UI shows success/error notification
```

## Security Considerations

1. **Token Storage:** OAuth tokens stored in `chrome.storage.local` (encrypted by browser)
2. **HTTPS Only:** All API calls over HTTPS
3. **Minimal Permissions:** Request only necessary browser permissions
4. **No Token Logging:** Never log sensitive credentials
5. **Token Rotation:** Support token refresh flows
6. **CSP:** Content Security Policy in manifest

## Browser Compatibility

**Primary Target:** Firefox/Zen Browser
**Manifest:** V3 (using WebExtension APIs)

**Key Firefox APIs:**

- `browser.bookmarks` - Bookmark management
- `browser.alarms` - Background scheduling
- `browser.storage.local` - Data persistence
- `browser.identity` - OAuth flows
- `browser.runtime` - Messaging

**Cross-browser Notes:**

- Use WebExtension Polyfill for Chrome compatibility
- Test on both Firefox and Zen Browser
- Use `browser.*` namespace (auto-polyfilled)

## Performance Considerations

1. **Batch Operations:** Group bookmark create/update/delete operations
2. **Rate Limiting:** Respect API rate limits (cache responses)
3. **Incremental Sync:** Only update changed items
4. **Background Efficiency:** Use alarms instead of persistent background page
5. **Lazy Loading:** Load providers only when needed

## Extensibility

### Adding New Providers

Developers can add new providers by:

1. Implementing the `Provider` interface
2. Registering in provider registry
3. Adding provider-specific UI components
4. Documenting OAuth setup requirements

### Plugin System (Future)

```typescript
// External developers can create provider plugins
export class CustomProvider implements Provider {
  // Implementation
}

// Register via extension API
browser.liveFolders.registerProvider(new CustomProvider());
```

## Error Handling

1. **Authentication Failures:** Prompt re-authentication
2. **API Errors:** Retry with exponential backoff
3. **Network Errors:** Queue operations for retry
4. **Quota Errors:** Warn user, reduce sync frequency
5. **Bookmark Conflicts:** Last-write-wins strategy

## Testing Strategy

1. **Unit Tests:** Core services, providers, sync engine
2. **Integration Tests:** OAuth flows, bookmark operations
3. **E2E Tests:** Complete user workflows
4. **Manual Testing:** Firefox and Zen Browser
5. **Mock APIs:** For provider testing

## Future Enhancements

1. **Notification System:** Alert on new items
2. **Filters:** User-defined item filtering
3. **Sorting:** Custom bookmark ordering
4. **Search:** Quick search across all folders
5. **Analytics:** Sync statistics and insights
6. **Conflict Resolution:** User-driven merge strategies
7. **Export/Import:** Backup configurations
8. **Themes:** UI customization
