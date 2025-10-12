# Collapsible Sections Strategy for Provider Settings

## Date

October 11, 2025

## Problem Statement

The provider settings UI has grown significantly with many configuration options:

1. **Basic Configuration**: Folder selection, sort order
2. **Authentication**: Token management (GitHub PAT, Jira credentials)
3. **Title Format Options**: 6-7 checkboxes with help text
4. **Folder Display Options**: 2-3 checkboxes with help text
5. **Provider-Specific Filters**: GitHub filters, Jira filters (in collapsible sections)

**Result**: The provider card can be overwhelming, especially for new users.

## Proposed Strategy

### Option 1: Accordion-Style Sections (Recommended)

Group related settings into collapsible sections with clear visual hierarchy.

**Visual Structure:**

```text
┌─────────────────────────────────────────────┐
│ [✓] GitHub                            [Sync]│
│                                              │
│ Status: ✓ Authenticated, 12 items, 2m ago   │
│                                              │
│ 📁 Folder: GitHub Pull Requests       [▼]   │
│ 🔧 Sort Order: Alphabetical            [▼]   │
│                                              │
│ ▶ Title Format (6 options)                  │  ← COLLAPSED by default
│ ▶ Folder Display (2 options)                │  ← COLLAPSED by default  
│ ▼ Filters & Advanced                        │  ← User already expanded
│   ☐ Created by me                            │
│   ☐ Review requests                          │
│                                              │
│ [Disconnect] [Configure]                     │
└─────────────────────────────────────────────┘
```

**Collapsed Sections (default):**

- ▶ **Title Format** - "Customize bookmark titles (6 options)"
- ▶ **Folder Display** - "Update folder name with stats"
- ▶ **Filters & Advanced** - "Filter items and advanced settings"

**Always Visible:**

- Provider name, toggle, sync button
- Authentication status
- Folder selector
- Sort order dropdown
- Last sync time

**Benefits:**

- ✅ Clean initial view
- ✅ Progressive disclosure (show complexity only when needed)
- ✅ Familiar pattern (accordion)
- ✅ Easy to find specific settings

### Option 2: Tabs

Use MUI Tabs to separate different configuration categories.

**Tabs:**

- **General** - Folder, sort, filters
- **Appearance** - Title format, folder display
- **Advanced** - Provider-specific settings

**Benefits:**

- ✅ Very clean organization
- ✅ Clear separation of concerns
- ❌ More clicks to access settings
- ❌ Might be overkill for current feature set

### Option 3: Two-Level Expansion

Current "Advanced Settings" pattern, but expand it to all option groups.

**Structure:**

1. Provider card shows basic info
2. Click "⚙️ Settings" to expand
3. Inside expansion, collapsible sub-sections

**Benefits:**

- ✅ Builds on existing pattern
- ✅ Progressive disclosure
- ❌ Requires two levels of expansion

## Recommended Implementation: Option 1 (Accordion)

### State Management

Add granular expansion state for each section type:

```typescript
// Current: One state for "advanced settings" per provider
const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());

// Proposed: Separate states for each collapsible section
const [expandedTitleFormat, setExpandedTitleFormat] = useState<Set<string>>(new Set());
const [expandedFolderDisplay, setExpandedFolderDisplay] = useState<Set<string>>(new Set());
const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

// Or use a single object with section keys:
type SectionType = 'titleFormat' | 'folderDisplay' | 'filters';
const [expandedSections, setExpandedSections] = useState<Record<string, Set<SectionType>>>({});
// Usage: expandedSections[providerId]?.has('titleFormat')
```

### UI Component Pattern

Create reusable `CollapsibleSection` component:

```tsx
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string; // Preview text when collapsed
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string | number; // Show count of enabled options
}

function CollapsibleSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          py: 1,
          px: 1.5,
          borderRadius: 1,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <IconButton size="small" sx={{ mr: 1 }}>
          <ExpandMore
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          />
        </IconButton>
        
        {icon && <Box sx={{ mr: 1, color: 'text.secondary' }}>{icon}</Box>}
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {title}
            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Typography>
          {!expanded && subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ pl: 6, pr: 2, py: 1 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
```

### Usage Example

```tsx
{/* Title Format Section */}
<CollapsibleSection
  title="Title Format"
  subtitle={getTitleFormatSummary(provider)} // e.g., "6 options enabled"
  icon={<FormatPaint />}
  expanded={expandedSections[provider.id]?.has('titleFormat')}
  onToggle={() => handleToggleSection(provider.id, 'titleFormat')}
  badge={countEnabledOptions(provider.titleFormat)}
>
  <Stack spacing={2}>
    {/* All the title format checkboxes */}
  </Stack>
</CollapsibleSection>

{/* Folder Display Section */}
<CollapsibleSection
  title="Folder Display"
  subtitle={
    provider.folderTitleFormat?.enabled 
      ? "Showing live counts" 
      : "Click to enable dynamic folder names"
  }
  icon={<Folder />}
  expanded={expandedSections[provider.id]?.has('folderDisplay')}
  onToggle={() => handleToggleSection(provider.id, 'folderDisplay')}
>
  <Stack spacing={2}>
    {/* Folder display checkboxes */}
  </Stack>
</CollapsibleSection>

{/* Filters Section */}
<CollapsibleSection
  title="Filters & Advanced"
  subtitle={`${countEnabledFilters(provider)} filters active`}
  icon={<FilterList />}
  expanded={expandedSections[provider.id]?.has('filters')}
  onToggle={() => handleToggleSection(provider.id, 'filters')}
>
  <Stack spacing={2}>
    {/* Filter checkboxes and provider-specific settings */}
  </Stack>
</CollapsibleSection>
```

### Smart Summaries (When Collapsed)

Show helpful preview text when sections are collapsed:

**Title Format:**

- `"Using compact format with 4 options"` (when options enabled)
- `"Click to customize bookmark titles"` (default state)

**Folder Display:**

- `"Showing 12 items • 3 to review"` (when enabled)
- `"Enable to show live statistics"` (when disabled)

**Filters:**

- `"2 filters active"` (when filters enabled)
- `"No filters applied"` (when none enabled)

### Default Collapsed State

**All sections collapsed by default** for clean initial view.

**Exception**: Auto-expand if user just enabled the provider (to guide setup)

```typescript
// When provider is first authenticated
if (justAuthenticated) {
  setExpandedSections({
    ...expandedSections,
    [providerId]: new Set(['titleFormat']), // Show title options first
  });
}
```

### Visual Hierarchy

```text
Provider Card (Always visible)
├─ Header: Name, Toggle, Sync button
├─ Status: Auth status, item count, last sync
├─ Folder Selector (dropdown)
├─ Sort Order (dropdown)
│
└─ Collapsible Sections (All collapsed by default)
   ├─ ▶ Title Format (6 options)
   ├─ ▶ Folder Display (2-3 options)  
   └─ ▶ Filters & Advanced (N filters + settings)
```

## Implementation Steps

### Phase 1: Create Reusable Component

1. Create `src/components/CollapsibleSection.tsx`
2. Add TypeScript interface
3. Implement component with MUI components
4. Add hover effects, transitions

### Phase 2: Update State Management

1. Add section expansion state
2. Create toggle handlers
3. Add summary text generators
4. Handle auto-expand on auth

### Phase 3: Refactor Provider Card

1. Wrap "Title Format" in CollapsibleSection
2. Wrap "Folder Display" in CollapsibleSection
3. Wrap existing "Filters" in CollapsibleSection
4. Remove old expansion state for filters

### Phase 4: Polish

1. Add icons to each section
2. Add badges for enabled option counts
3. Test keyboard navigation
4. Add smooth transitions
5. Ensure mobile responsiveness

## Alternative: Quick Toggle Buttons

For power users who want quick access:

```tsx
<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
  <Button
    size="small"
    startIcon={<FormatPaint />}
    onClick={() => toggleSection('titleFormat')}
  >
    Title Format
  </Button>
  <Button
    size="small"
    startIcon={<Folder />}
    onClick={() => toggleSection('folderDisplay')}
  >
    Folder Display
  </Button>
  <Button
    size="small"
    startIcon={<FilterList />}
    onClick={() => toggleSection('filters')}
  >
    Filters
  </Button>
</Box>
```

## Recommended Icons

- **Title Format**: `FormatPaint` or `Title`
- **Folder Display**: `Folder` or `Analytics`
- **Filters**: `FilterList` or `Tune`

## Mobile Considerations

- Ensure touch targets are at least 44px
- Test expansion animations on mobile
- Consider stacking buttons vertically on small screens
- Ensure help text is readable

## Accessibility

- Add ARIA attributes (`aria-expanded`, `aria-controls`)
- Ensure keyboard navigation works (Tab, Enter, Space)
- Screen reader announces section state
- Focus management when expanding/collapsing

## Summary

**Recommended approach**: Implement **Option 1 (Accordion-Style Sections)** with:

✅ All sections collapsed by default
✅ Smart preview text when collapsed
✅ Badges showing enabled option counts
✅ Smooth transitions and hover effects
✅ Keyboard accessible
✅ Mobile-friendly

**Expected outcome:**

- Cleaner initial view (60-70% less vertical space)
- Progressive disclosure (show complexity only when needed)
- Better information scent (preview text guides users)
- Familiar interaction pattern (accordion is universal)

**Implementation effort**: 4-6 hours

- 1-2 hours: CollapsibleSection component
- 2-3 hours: Refactor ProvidersView
- 1 hour: Polish and testing

Would you like me to implement this strategy?
