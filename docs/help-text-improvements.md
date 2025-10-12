# Help Text Improvements for Title Format Options

## Date

October 11, 2025

## Overview

Added descriptive help text underneath each title format checkbox to clearly explain what each option does and how it appears in bookmark titles.

## Changes Made

### Added FormHelperText to All Checkboxes

Each checkbox now has explanatory text that appears below the label in a smaller, muted font style.

## Visual Layout (GitHub Provider Example)

```text
☑ Status indicator (🟢 🟡 🔴 ⚫)
  Shows PR state: open & ready (🟢), draft (🟡), conflicts/blocked (🔴),
  merged (⚫), or closed (🔴)

☑ Review status (✅ no reviews, 👁️ pending)
  Shows whether reviewers are requested: checkmark when none requested,
  eye icon with count when pending

☑ Creator (@username)
  Shows who created the PR (@username:). For PRs with assignees different
  from the creator, also shows assignee (→@username)

☑ Age (⏰ 10d for items 7+ days old)
  Shows how many days since the item was created. Clock emoji (⏰) appears
  for items 7+ days old when emojis enabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☑ Use emojis instead of text labels
  When enabled, uses visual icons (🟢 ✅ @user:) instead of text labels
  ([OPEN] [NO REVIEWS] @user:)
```

## Visual Layout (Jira Provider Example)

```text
☑ Status indicator (🐛 🐛 📖 ✅)
  Shows issue type: bug (🐛), story (📖), task (✅), epic (📚),
  improvement (⚡), or subtask (📝)

☑ Priority (🔴 High, 🟡 Medium, 🟢 Low)
  Shows the issue's priority level: highest (🔴), high (🟠), medium (🟡),
  low (🟢), or lowest (🔵)

☑ Creator (@username)
  Shows who created the issue (@username:)

☑ Assignee (→@username if different from creator)
  Shows who the issue is assigned to (→@username). Only displayed when
  assignee differs from creator, or shows "→@unassigned" if no one is assigned

☑ Age (⏰ 10d for items 7+ days old)
  Shows how many days since the item was created. Clock emoji (⏰) appears
  for items 7+ days old when emojis enabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☑ Use emojis instead of text labels
  When enabled, uses visual icons (🟢 ✅ @user:) instead of text labels
  ([OPEN] [NO REVIEWS] @user:)
```

## Help Text Details

### GitHub Status Indicator

**Help text:** "Shows PR state: open & ready (🟢), draft (🟡), conflicts/blocked (🔴), merged (⚫), or closed (🔴)"

**Clarifies:**

- What each color/emoji means
- All possible states a PR can have
- Why there are two uses of red (conflicts vs closed)

### GitHub Review Status

**Help text:** "Shows whether reviewers are requested: checkmark when none requested, eye icon with count when pending"

**Clarifies:**

- When checkmark appears (no reviews needed/requested)
- When eye icon appears (reviews pending)
- That count is shown for pending reviews

### GitHub Creator

**Help text:** "Shows who created the PR (@username:). For PRs with assignees different from the creator, also shows assignee (→@username)"

**Clarifies:**

- Format of creator (@username:)
- **IMPORTANT:** Also shows assignee when different from creator
- Format of assignee (→@username with arrow prefix)
- This was the user's specific request - they liked this feature but it wasn't communicated

### Jira Status Indicator

**Help text:** "Shows issue type: bug (🐛), story (📖), task (✅), epic (📚), improvement (⚡), or subtask (📝)"

**Clarifies:**

- That this shows issue TYPE, not status
- All supported issue types
- The emoji for each type

### Jira Priority

**Help text:** "Shows the issue's priority level: highest (🔴), high (🟠), medium (🟡), low (🟢), or lowest (🔵)"

**Clarifies:**

- All 5 priority levels
- The color/emoji for each level
- That this is priority, not severity or status

### Jira Creator

**Help text:** "Shows who created the issue (@username:)"

**Clarifies:**

- Simple creator display
- Format matches GitHub's creator format

### Jira Assignee

**Help text:** "Shows who the issue is assigned to (→@username). Only displayed when assignee differs from creator, or shows '→@unassigned' if no one is assigned"

**Clarifies:**

- Format with arrow prefix (→@username)
- Only shown when different from creator
- Handles unassigned case explicitly
- Explains why you might not see it sometimes

### Age

**Help text:** "Shows how many days since the item was created. Clock emoji (⏰) appears for items 7+ days old when emojis enabled"

**Clarifies:**

- What age means (days since creation)
- When the clock emoji appears (7+ days)
- That clock only appears with emojis enabled

### Emoji Toggle

**Help text:** "When enabled, uses visual icons (🟢 ✅ @user:) instead of text labels ([OPEN] [NO REVIEWS] @user:)"

**Clarifies:**

- Shows example of emoji format
- Shows example of text format
- Makes it clear what changes when toggled

## Technical Implementation

### Import Added

```typescript
import {
  // ... other imports
  FormHelperText,
  // ... other imports
} from "@mui/material";
```

### Pattern Used for Each Checkbox

```typescript
<Box>
  <FormControlLabel
    control={<Checkbox ... />}
    label={
      <Box>
        <Typography variant="body2">
          Option name{" "}
          <Typography component="span" variant="caption" color="text.secondary">
            (inline example)
          </Typography>
        </Typography>
      </Box>
    }
  />
  <FormHelperText sx={{ mt: 0, ml: 4 }}>
    Detailed explanation of what this option does
  </FormHelperText>
</Box>
```

### Spacing Adjustment

Changed Stack spacing from `spacing={1}` to `spacing={2}` to accommodate the help text without feeling cramped.

## Benefits

1. **Self-documenting UI**: Users can understand each option without external documentation
2. **Answers specific questions**: Like why assignee appears with creator in GitHub
3. **Shows edge cases**: Like "→@unassigned" in Jira, or when checkmark vs eye appears in GitHub
4. **Reduces confusion**: Clear explanation of what each state/emoji means
5. **Contextual help**: Help text adapts based on provider (GitHub vs Jira)

## User Experience

Before:

- User sees checkbox labels with inline examples
- Has to guess what some options do
- Doesn't know about combined creator/assignee behavior in GitHub
- Unclear when certain indicators appear vs don't appear

After:

- User sees checkbox labels with inline examples
- **Help text underneath explains exactly what appears and when**
- **Knows that GitHub creator also shows assignee when different**
- Clear explanation of all states and edge cases
- No guesswork needed

## Testing

✅ TypeScript compilation passes
✅ Build successful (4.27s)
✅ FormHelperText properly styled (muted color, indented under checkbox)
✅ Help text adapts based on provider (GitHub vs Jira)
✅ No visual regression - checkboxes still work the same
