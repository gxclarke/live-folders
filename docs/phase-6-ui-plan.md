# Phase 6: UI Components Implementation Plan

## Overview

Phase 6 implements the user interface components for Live Folders, providing popup and sidepanel views for managing providers, viewing synced items, and configuring settings.

## Phase 6.1: Popup UI ✅ (In Progress)

### Status: 🔄 Partial Complete

**Commit:** `53a6f16`

### Components Implemented

1. **`src/popup/App.tsx`** - Main popup entry point
   - MUI ThemeProvider with dark/light mode support
   - Loading and error states
   - Integration with Header, ProviderList, QuickActions

2. **`src/popup/hooks/useProviders.tsx`** - Provider state management
   - Fetches provider status from ProviderRegistry
   - Integrates with BackgroundScheduler via chrome.runtime.sendMessage
   - Message types: SYNC_ALL, SYNC_PROVIDER
   - Refreshes provider status after sync

3. **`src/popup/components/Header.tsx`** - App header
   - Extension title
   - Settings button (opens sidepanel)

4. **`src/popup/components/ProviderList.tsx`** - Provider list
   - Maps over providers array
   - Renders ProviderCard for each

5. **`src/popup/components/ProviderCard.tsx`** - Individual provider
   - Provider icon and name
   - Status badge (connected/disconnected/error/loading)
   - Item count display
   - Connect/Sync action button

6. **`src/popup/components/QuickActions.tsx`** - Footer actions
   - Sync All button
   - Settings button

### Supporting Components (Already Created)

1. **`src/components/ProviderIcon.tsx`** - GitHub/Jira icons
2. **`src/components/StatusBadge.tsx`** - Status indicators
3. **`src/theme.ts`** - MUI theme configuration

### Remaining Work

- [ ] Implement authentication flow trigger
- [ ] Add last sync timestamp display
- [ ] Add sync progress indicators
- [ ] Handle edge cases (no providers, all disabled)
- [ ] Add keyboard navigation
- [ ] Testing with live extension

## Phase 6.2: Sidepanel UI (Next)

### Purpose

Full-featured provider management and item viewing interface.

### Components to Create

1. **`src/sidepanel/App.tsx`** - Main sidepanel entry
   - Navigation tabs (Providers, Items, Settings)
   - Layout with persistent navigation

2. **`src/sidepanel/views/ProvidersView.tsx`** - Provider management
   - Provider configuration forms
   - Enable/disable toggles
   - Authentication management
   - Folder selection

3. **`src/sidepanel/views/ItemsView.tsx`** - Synced items display
   - Filterable list of all synced items
   - Group by provider
   - Search functionality
   - Item actions (open, remove)

4. **`src/sidepanel/views/SettingsView.tsx`** - Extension settings
   - Sync interval configuration
   - Notification preferences
   - Theme selection
   - Debug mode toggle

5. **`src/sidepanel/hooks/useSettings.tsx`** - Settings management
   - Load from StorageManager
   - Save with validation
   - Apply changes

### Data Requirements

- ProviderRegistry for provider management
- StorageManager for settings
- BookmarkManager for viewing synced items
- BackgroundScheduler status queries

## Phase 6.3: Authentication Flow

### Components to Create

1. **`src/popup/components/AuthDialog.tsx`** - OAuth flow
   - Trigger AuthManager.authenticate()
   - Show progress during OAuth
   - Handle success/failure
   - Display required scopes

2. **`src/sidepanel/components/ProviderConfigForm.tsx`** - Provider setup
   - OAuth configuration (GitHub)
   - API token input (Jira)
   - Jira instance URL
   - Scope selection

### Integration Points

- AuthManager for OAuth flows
- ProviderRegistry for provider-specific configuration
- StorageManager for persisting auth state

## Phase 6.4: Polish & Refinement

### Enhancements

1. **Loading States**
   - Skeleton loaders for provider cards
   - Progress bars for sync operations
   - Optimistic UI updates

2. **Error Handling**
   - Retry buttons for failed syncs
   - Clear error messages
   - Error boundaries

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

4. **Responsive Design**
   - Different layouts for popup vs sidepanel
   - Adaptive spacing
   - Mobile-friendly (if applicable)

5. **Animations**
   - Smooth transitions
   - Loading spinners
   - Success feedback

## Architecture

### Data Flow

```text
Popup/Sidepanel UI
  ↓
React Hooks (useProviders, useSettings)
  ↓
Message Passing (chrome.runtime.sendMessage)
  ↓
Background Service Worker
  ↓
BackgroundScheduler / ProviderRegistry / StorageManager
  ↓
Browser APIs (bookmarks, storage, alarms)
```

### State Management

- **Local State**: React useState for UI-only state
- **Shared State**: chrome.runtime.sendMessage for cross-context
- **Persistent State**: StorageManager (chrome.storage.local)
- **Real-time Updates**: Could add chrome.storage.onChanged listeners

### Message API

**From UI to Background:**

```typescript
// Sync operations
{ type: "SYNC_ALL" }
{ type: "SYNC_PROVIDER", providerId: string }
{ type: "GET_SYNC_STATUS" }

// Provider operations (to be added)
{ type: "AUTHENTICATE_PROVIDER", providerId: string }
{ type: "CONFIGURE_PROVIDER", providerId: string, config: ProviderConfig }
{ type: "ENABLE_PROVIDER", providerId: string, enabled: boolean }
```

**Response Format:**

```typescript
{ success: true, data?: any }
{ success: false, error: string }
```

## Testing Strategy

### Manual Testing

1. **Popup Flow**
   - Open extension popup
   - Verify provider status displays
   - Click "Sync All" - verify background sync
   - Click individual "Sync" - verify provider sync
   - Click "Settings" - verify sidepanel opens

2. **Sidepanel Flow**
   - Navigate between tabs
   - Configure provider settings
   - Trigger authentication
   - View synced items
   - Update settings

3. **Error Cases**
   - Network failures
   - Authentication errors
   - Empty states
   - Rate limiting

### Integration Testing

- Provider sync end-to-end
- Settings persistence
- OAuth flow completion
- Bookmark creation verification

## Dependencies

### Already Installed

- @mui/material (5.x)
- @emotion/react
- @emotion/styled
- @mui/icons-material

### May Need

- None - all dependencies present

## Performance Considerations

### Popup

- Fast initial load (< 100ms)
- Lazy load provider items
- Cache provider status
- Debounce sync operations

### Sidepanel

- Virtual scrolling for large item lists
- Pagination for item views
- Memoize expensive computations
- Optimize re-renders with React.memo

## Security Considerations

1. **Input Validation**
   - Sanitize provider URLs
   - Validate API tokens
   - Check OAuth redirects

2. **Sensitive Data**
   - Never log tokens
   - Use secure storage
   - Clear on logout

3. **XSS Prevention**
   - Escape user-generated content
   - Use MUI components (already escaped)
   - Validate URLs before opening

## Implementation Order

### Week 1: Popup (Phase 6.1)

- ✅ Basic popup structure
- ✅ Provider list with status
- ✅ Sync integration
- ⏳ Authentication trigger
- ⏳ Polish and testing

### Week 2: Sidepanel (Phase 6.2)

- ⏳ Sidepanel structure with tabs
- ⏳ Providers view with configuration
- ⏳ Items view with filtering
- ⏳ Settings view with form

### Week 3: Auth & Polish (Phase 6.3-6.4)

- ⏳ OAuth flow components
- ⏳ Error handling
- ⏳ Loading states
- ⏳ Accessibility
- ⏳ Integration testing

## Success Criteria

### Phase 6.1 Complete When

- ✅ Popup displays provider status
- ✅ Sync All triggers background sync
- ✅ Individual sync works per provider
- ⏳ Authentication can be initiated
- ⏳ Settings sidepanel opens

### Phase 6.2 Complete When

- ⏳ All sidepanel views functional
- ⏳ Provider configuration works
- ⏳ Settings persist correctly
- ⏳ Items display correctly

### Phase 6.3 Complete When

- ⏳ OAuth flows complete successfully
- ⏳ Tokens stored securely
- ⏳ Authentication state updates UI

### Phase 6 Complete When

- ⏳ All UI flows tested end-to-end
- ⏳ No blocking bugs
- ⏳ Accessibility passes
- ⏳ Ready for user testing

## Notes

- MUI components provide excellent base styling
- Dark/light mode already working
- Message passing pattern established
- Focus on user experience and polish
