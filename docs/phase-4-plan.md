# Phase 4: UI Components - Implementation Plan

## Overview

Phase 4 implements the user interface layer that exposes the backend infrastructure (AuthManager, ProviderRegistry, GitHub/Jira providers) through browser action popup and sidepanel interfaces.

**Goal:** Create intuitive UI for provider management, authentication, and item browsing

**UI Framework:** Material-UI (MUI) v6 with Emotion CSS-in-JS

**Dependencies:**

- ✅ Phase 1: Types, Storage, Logger, Browser utils
- ✅ Phase 2: AuthManager, GitHub Provider, Jira Provider
- ✅ Phase 3: Provider Registry
- ✅ MUI: @mui/material, @emotion/react, @emotion/styled, @mui/icons-material

---

## Architecture Strategy

### Component Hierarchy

```text
Shared Setup (src/)
├── theme.ts - MUI theme configuration (light/dark mode)
└── components/
    ├── ProviderIcon.tsx - GitHub/Jira SVG icons
    └── StatusBadge.tsx - Custom status indicator

Popup (src/popup/)
├── App.tsx - Main popup with MUI ThemeProvider
├── components/
│   ├── Header.tsx - Box + Typography + IconButton
│   ├── ProviderList.tsx - Stack of ProviderCards
│   ├── ProviderCard.tsx - Card + CardContent + Button
│   └── QuickActions.tsx - Button + Divider
└── hooks/
    └── useProviders.tsx - Provider state management

Sidepanel (src/sidepanel/)
├── App.tsx - Main sidepanel with MUI ThemeProvider + Tabs
├── components/
│   ├── Navigation.tsx - Tabs + Tab components
│   ├── ProvidersView.tsx - List + ListItem components
│   ├── ProviderDetail.tsx - Card + TextField + Switch
│   ├── ItemsView.tsx - List + ListItem + Chip
│   └── SettingsView.tsx - Card + TextField + Switch
└── hooks/
    └── useProviderRegistry.tsx - Registry integration
```

### MUI Components Usage Map

**Popup (Lightweight):**

- `ThemeProvider` - Theme consistency
- `Box`, `Stack` - Layout
- `Typography` - Text
- `Button`, `IconButton` - Actions
- `Card`, `CardContent`, `CardActions` - Provider cards
- `Badge` - Status indicators
- `Divider` - Visual separation

**Sidepanel (Full Feature Set):**

- `Tabs`, `Tab` - Navigation
- `List`, `ListItem`, `ListItemText`, `ListItemIcon` - Item lists
- `Card`, `CardHeader`, `CardContent`, `CardActions` - Sections
- `TextField` - Form inputs (API tokens, URLs)
- `Switch` - Enable/disable toggles
- `Select`, `MenuItem` - Dropdowns
- `Chip` - Tags, status labels
- `Alert`, `Snackbar` - Notifications
- `CircularProgress`, `LinearProgress` - Loading states
- `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` - Modals

### Design Principles

1. **Material Design 3**: Leverage MUI's modern design system
2. **Theme Consistency**: Single theme file, supports light/dark mode
3. **Accessibility**: MUI components have built-in ARIA support
4. **Error Resilience**: Use MUI Alert and Snackbar for error states
5. **Performance**: Tree-shaking imports, lazy load heavy components

---

## Phase 4.1: Shared Components (Foundation)

**Goal:** Create reusable UI components used across popup and sidepanel

### Components to Implement

#### 1. Button Component (`src/components/Button.tsx`)

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  onClick?: () => void
  children: React.ReactNode
}
```

**Features:**

- Multiple variants (primary, secondary, danger, ghost)
- Loading state with spinner
- Disabled state
- Optional icon support
- Full keyboard accessibility

#### 2. Card Component (`src/components/Card.tsx`)

```typescript
interface CardProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}
```

**Features:**

- Header with title/subtitle
- Optional actions area (top-right)
- Optional footer
- Consistent padding and borders

#### 3. StatusBadge Component (`src/components/StatusBadge.tsx`)

```typescript
interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'error' | 'loading'
  label?: string
}
```

**Features:**

- Color-coded status indicators
- Optional text label
- Pulsing animation for loading state

#### 4. ProviderIcon Component (`src/components/ProviderIcon.tsx`)

```typescript
interface ProviderIconProps {
  providerId: 'github' | 'jira'
  size: 'small' | 'medium' | 'large'
}
```

**Features:**

- SVG icons for GitHub and Jira
- Consistent sizing
- Fallback for unknown providers

#### 5. LoadingSpinner Component (`src/components/LoadingSpinner.tsx`)

```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
}
```

**Features:**

- CSS-based spinner animation
- Optional loading message
- Multiple sizes

#### 6. ErrorBanner Component (`src/components/ErrorBanner.tsx`)

```typescript
interface ErrorBannerProps {
  error: Error | string
  onDismiss?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}
```

**Features:**

- Error message display
- Optional dismiss button
- Optional action button (retry, etc.)
- Auto-dismiss after timeout (optional)

---

## Phase 4.2: Browser Action Popup

**Goal:** Quick access to provider status and recent items

### File: `src/popup/App.tsx`

**Layout:**

```text
┌─────────────────────────────┐
│ Live Folders        [⚙️]    │ Header
├─────────────────────────────┤
│ GitHub              ✅      │ ProviderCard
│ Connected • 5 PRs           │
│ [View All]                  │
├─────────────────────────────┤
│ Jira                ⚠️      │ ProviderCard
│ Not Connected               │
│ [Connect]                   │
├─────────────────────────────┤
│ [↻ Sync All Providers]      │ QuickActions
└─────────────────────────────┘
```

### Components

#### 1. Header (`src/popup/components/Header.tsx`)

- Extension logo and title
- Settings gear icon → opens sidepanel

#### 2. ProviderList (`src/popup/components/ProviderList.tsx`)

- Maps over all registered providers
- Shows ProviderCard for each

#### 3. ProviderCard (`src/popup/components/ProviderCard.tsx`)

```typescript
interface ProviderCardProps {
  providerId: string
  name: string
  status: ProviderStatus
  itemCount?: number
}
```

**Features:**

- Provider icon and name
- Status badge (connected/disconnected/error)
- Item count (if connected)
- Primary action button (Connect/View All/Reconnect)

#### 4. QuickActions (`src/popup/components/QuickActions.tsx`)

- Manual sync all button
- Link to full sidepanel

### State Management

#### `src/popup/hooks/useProviders.tsx`

```typescript
export function useProviders() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch provider status from ProviderRegistry
  // Subscribe to status updates
  // Handle sync operations
  
  return { providers, loading, error, syncAll, openProvider }
}
```

**Responsibilities:**

- Fetch provider status from ProviderRegistry
- Handle sync operations
- Open sidepanel with specific provider
- Error handling

---

## Phase 4.3: Sidepanel - Provider Management

**Goal:** Full provider configuration and item browsing

### File: `src/sidepanel/App.tsx`

**Layout:**

```text
┌─────────────────────────────────────┐
│ [Providers] [Items] [Settings]      │ Navigation
├─────────────────────────────────────┤
│                                     │
│   Provider Management View          │ Main Content
│                                     │
│   (or Items View, or Settings)      │
│                                     │
└─────────────────────────────────────┘
```

### Sidepanel Components

#### 1. Navigation (`src/sidepanel/components/Navigation.tsx`)

```typescript
type Tab = 'providers' | 'items' | 'settings'
```

**Features:**

- Tab-based navigation
- Active tab highlighting
- Keyboard navigation (arrow keys)

#### 2. ProvidersView (`src/sidepanel/components/ProvidersView.tsx`)

**Layout:**

```text
┌─────────────────────────────────────┐
│ Your Providers                      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ GitHub                    ✅    │ │
│ │ Connected as @username          │ │
│ │ [Disconnect] [Configure]        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Jira                      ⚠️    │ │
│ │ Not Connected                   │ │
│ │ [Connect with OAuth]            │ │
│ │ [Use API Token]                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Features:**

- List of all registered providers
- Expandable provider cards
- Authentication actions
- Configuration forms (when expanded)

#### 3. ProviderDetail (`src/sidepanel/components/ProviderDetail.tsx`)

```typescript
interface ProviderDetailProps {
  providerId: string
  onClose: () => void
}
```

**Features:**

- Provider configuration form
- OAuth flow initiation
- API token input (for Jira)
- Disconnect/revoke buttons
- Test connection button

#### 4. ItemsView (`src/sidepanel/components/ItemsView.tsx`)

**Layout:**

```text
┌─────────────────────────────────────┐
│ All Items                 [Filter] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔵 [GitHub] PR #123             │ │
│ │ Fix authentication bug          │ │
│ │ 2 hours ago                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 [Jira] PROJ-456              │ │
│ │ Update documentation            │ │
│ │ 1 day ago                       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Features:**

- List all items from all providers
- Filter by provider
- Click to open item in new tab
- Show item metadata (title, date, provider)

#### 5. SettingsView (`src/sidepanel/components/SettingsView.tsx`)

**Features:**

- Sync interval configuration
- Debug mode toggle
- Clear all data button (with confirmation)
- Export/import settings

### Sidepanel State Management

#### `src/sidepanel/hooks/useProviderRegistry.tsx`

```typescript
export function useProviderRegistry() {
  const [providers, setProviders] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Initialize ProviderRegistry
  // Fetch all providers
  // Fetch all items
  // Handle authentication
  // Handle configuration updates
  
  return {
    providers,
    items,
    loading,
    authenticateProvider,
    updateConfig,
    fetchItems,
    revokeProvider,
  }
}
```

---

## Implementation Order

### Phase 4.1: Shared Components (Days 1-2)

1. ✅ Create `src/components/` directory structure
2. ✅ Implement Button component
3. ✅ Implement Card component
4. ✅ Implement StatusBadge component
5. ✅ Implement ProviderIcon component
6. ✅ Implement LoadingSpinner component
7. ✅ Implement ErrorBanner component
8. ✅ Create component barrel export `src/components/index.ts`
9. ✅ Add basic component CSS

### Phase 4.2: Browser Action Popup (Days 3-4)

1. ✅ Create `src/popup/hooks/useProviders.tsx`
2. ✅ Implement Header component
3. ✅ Implement ProviderCard component
4. ✅ Implement ProviderList component
5. ✅ Implement QuickActions component
6. ✅ Update `src/popup/App.tsx` with new layout
7. ✅ Add popup CSS styling
8. ✅ Test popup interactions

### Phase 4.3: Sidepanel UI (Days 5-7)

1. ✅ Create `src/sidepanel/hooks/useProviderRegistry.tsx`
2. ✅ Implement Navigation component
3. ✅ Implement ProvidersView component
4. ✅ Implement ProviderDetail component
5. ✅ Implement ItemsView component
6. ✅ Implement SettingsView component
7. ✅ Update `src/sidepanel/App.tsx` with tabbed layout
8. ✅ Add sidepanel CSS styling
9. ✅ Test sidepanel interactions

### Phase 4.4: Integration & Polish (Day 8)

1. ✅ Connect popup to sidepanel (deep linking)
2. ✅ Test OAuth flows end-to-end
3. ✅ Test item fetching and display
4. ✅ Error handling and edge cases
5. ✅ Accessibility improvements
6. ✅ Performance optimization
7. ✅ Create Phase 4 completion documentation

---

## Technical Considerations

### Browser Extension Context

**Popup Limitations:**

- Popup closes when user clicks outside
- State is lost when popup closes
- Use chrome.storage for persistence
- Keep popup lightweight and fast

**Sidepanel Advantages:**

- Persistent across tab changes
- More screen real estate
- Better for complex interactions
- Can maintain state longer

### Communication Patterns

**Popup ↔ Background:**

```typescript
// Popup sends message to background service worker
chrome.runtime.sendMessage({ type: 'SYNC_PROVIDERS' })

// Background responds
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SYNC_PROVIDERS') {
    // Trigger sync
    sendResponse({ success: true })
  }
})
```

**Popup ↔ Sidepanel:**

```typescript
// Open sidepanel programmatically
chrome.sidePanel.open({ windowId })

// Pass data via chrome.storage or URL params
chrome.storage.session.set({ selectedProvider: 'github' })
```

### State Management Strategy

#### Option 1: React Context (Simple)

- Use React Context for app-wide state
- Suitable for small state trees
- No external dependencies

#### Option 2: Zustand (Recommended)

- Lightweight state management (~1KB)
- Built-in persistence
- DevTools support
- Better for complex state

**Decision:** Start with React Context, migrate to Zustand if needed

---

## Testing Strategy

### Manual Testing Checklist

**Popup:**

- [ ] Popup opens correctly
- [ ] Provider status displays accurately
- [ ] Sync button triggers sync
- [ ] Settings icon opens sidepanel
- [ ] Error states display properly

**Sidepanel:**

- [ ] Tabs navigate correctly
- [ ] Provider authentication works (OAuth)
- [ ] API token authentication works (Jira)
- [ ] Items display from both providers
- [ ] Settings persist correctly
- [ ] Disconnect/revoke works

### Automated Testing (Future)

- Component unit tests with Vitest + Testing Library
- Integration tests for provider flows
- E2E tests with Playwright

---

## Success Criteria

Phase 4 is complete when:

1. ✅ All shared components implemented and styled
2. ✅ Popup displays provider status correctly
3. ✅ Popup can trigger sync operations
4. ✅ Sidepanel shows all providers with status
5. ✅ OAuth authentication works for GitHub
6. ✅ Multi-auth works for Jira (OAuth + API token)
7. ✅ Items view displays PRs and issues
8. ✅ Settings view allows configuration
9. ✅ All TypeScript compilation passes
10. ✅ All linting passes (Biome + Markdown)
11. ✅ Phase 4 completion documentation created

---

## Next Steps (Phase 5+)

After Phase 4 completion:

- **Phase 5**: Sync Engine - Background sync scheduling, rate limiting
- **Phase 6**: Bookmark Integration - Create/update browser bookmarks
- **Phase 7**: Testing & Polish - Unit tests, E2E tests, performance optimization
- **Phase 8**: Distribution - Firefox Add-ons, Chrome Web Store

---

## Notes

- **Design System**: Keep CSS minimal initially, use CSS custom properties for theming
- **Icons**: Use SVG icons inline for GitHub/Jira, consider icon library later
- **Responsiveness**: Popup is fixed width (recommended 400px), sidepanel can be wider
- **Dark Mode**: Consider dark mode support in CSS (prefers-color-scheme)
