# Title Format UX Improvement

## Date

October 11, 2025

## Problem

The title format options in the Providers view were confusing with too many controls:

- 5-7 checkboxes with unclear labels (e.g., "Include status", "Use emoji icons")
- 1 dropdown for "Format Style" with unclear options (compact/detailed/minimal)
- Difficult to understand what each option does
- Examples not shown for reference

## Solution

Simplified the UI by:

1. **Removed Format Style Dropdown**
   - Eliminated the confusing "compact/detailed/minimal" dropdown
   - Now uses only space-separated compact format
   - Cleaner, more consistent output

2. **Improved Checkbox Labels with Examples**
   - Each checkbox now shows what it does with visual examples
   - Examples change based on emoji toggle state
   - Clear, descriptive labels

3. **Reorganized Controls**
   - Grouped related options together
   - Added visual separator before emoji toggle
   - Better visual hierarchy

### New Checkbox Labels

#### Status indicator

Shows inline example: `(🟢 🟡 🔴 ⚫)` or `([OPEN] [DRAFT] [CLOSED])`

#### Review status (GitHub only)

Shows inline example: `(✅ no reviews, 👁️ pending)` or `([2 REVIEWS])`

#### Priority (Jira only)

Shows inline example: `(🔴 High, 🟡 Medium, 🟢 Low)` or `([P1] [P2] [P3])`

#### Creator

Shows inline example: `(@username)`

#### Assignee (Jira only)

Shows inline example: `(→@username if different from creator)`

#### Age

Shows inline example: `(⏰ 10d for items 7+ days old)` or `([10d] days since created)`

#### Use emojis instead of text labels

Clear description of what this toggle does

## Technical Changes

### Files Modified

1. **src/sidepanel/views/ProvidersView.tsx**
   - Replaced simple checkbox labels with rich labels containing examples
   - Added `Divider` component import
   - Updated section title to "Customize Bookmark Titles"
   - Reorganized checkbox order for better UX
   - Added spacing between options

2. **src/providers/github/github-provider.ts**
   - Simplified `formatGitHubTitle()` method
   - Removed format style logic (detailed/minimal)
   - Always uses space-separated compact format
   - Cleaner, more maintainable code

3. **src/providers/github/**tests**/github-title-formatter.test.ts**
   - Updated test: "should use detailed format with parentheses" → "should always use space-separated compact format"
   - Updated test expectation to match new behavior

### Type Definitions

- **No changes needed** to `TitleFormatOptions` interface
- `format` field still exists but always uses "compact" value
- Maintains backward compatibility with existing configs

## Examples

### Before

```text
Checkboxes:
☐ Include status
☐ Use emoji icons
☐ Include review status
☐ Show age (>7 days)
☐ Show creator

Dropdown: Format Style [Compact ▼]
```

### After

```text
Checkboxes:
☐ Status indicator (🟢 🟡 🔴 ⚫)
☐ Review status (✅ no reviews, 👁️ pending)
☐ Creator (@username)
☐ Age (⏰ 10d for items 7+ days old)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ Use emojis instead of text labels
```

## Sample Output

With all options enabled and emojis on:

```text
#123 🟢 ✅ @alice: 10d Add user authentication
```

With all options enabled and emojis off:

```text
#123 [OPEN] [NO REVIEWS] @alice: [10d] Add user authentication
```

With no options enabled:

```text
Add user authentication #123
```

## Testing

✅ All 171 tests pass
✅ All 21 GitHub title formatter tests pass
✅ All 22 Jira title formatter tests pass
✅ Build successful

## Benefits

1. **Clearer Labels**: Users immediately see what each option does
2. **Visual Examples**: Examples update based on emoji toggle state
3. **Simpler UI**: Removed confusing dropdown, 1 less control to manage
4. **Consistent Format**: All titles use the same clean, space-separated format
5. **Better Organization**: Related options grouped, visual separators added
6. **Maintains Flexibility**: Users still have full control over what information is shown

## Backward Compatibility

✅ Existing user configs continue to work
✅ Old `format: "detailed"` or `format: "minimal"` values are ignored, compact format used
✅ All checkbox options function the same
✅ No migration needed
