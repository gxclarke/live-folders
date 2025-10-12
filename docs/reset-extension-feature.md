# Reset Extension Feature

**Date:** October 10, 2025
**Feature:** Reset extension to initial state
**Status:** ✅ Implemented

## Overview

Added a "Reset Extension" button to the Settings tab that allows users to completely clear all extension data and return to the initial state.

## User Interface

### Location

Settings tab in the side panel, at the bottom of the page.

### Layout

```text
┌─────────────────────────────────────────────────────┐
│                    Settings                          │
│                                                      │
│  [Settings cards...]                                 │
│                                                      │
│  ──────────────────────────────────────────────     │
│                                                      │
│  [Reset Extension]  [Reset to Defaults] [Save]      │
│   (red border)      (right aligned)                 │
└─────────────────────────────────────────────────────┘
```

### Button Styling

- **Position:** Left-aligned at bottom
- **Color:** Red border (`color="error"`)
- **Text:** "Reset Extension"
- **States:**
  - Disabled while saving or resetting
  - Shows "Resetting..." during operation

## Functionality

### What Gets Deleted

When user confirms reset, the following data is permanently cleared:

1. **Provider Configurations**
   - GitHub PAT
   - Jira credentials and base URL
   - All provider-specific settings

2. **Authentication**
   - All stored tokens
   - OAuth credentials
   - Refresh tokens

3. **Settings**
   - Sync interval
   - Notification preferences
   - Theme preferences
   - Debug mode setting

4. **Sync History**
   - Last sync timestamps
   - Sync statistics

### What's NOT Affected

- ✅ **Browser bookmarks** - Bookmarks created by the extension remain intact
- ✅ **Browser settings** - Chrome/Firefox settings unchanged
- ✅ **Extension installation** - Extension remains installed

## User Flow

### Step 1: Click "Reset Extension"

User clicks the red "Reset Extension" button.

### Step 2: Confirmation Dialog

A warning dialog appears with:

**Title:** "Reset Extension?" (in red)

**Content:**

```text
Warning: This will permanently delete all extension data including:

• All provider configurations and credentials
• Authentication tokens
• All settings and preferences
• Sync history

Your browser bookmarks will not be affected.

This action cannot be undone. Are you sure you want to continue?
```

**Actions:**

- **Cancel** - Close dialog, no changes
- **Reset Extension** (red button) - Proceed with reset

### Step 3: Reset Process

1. Clear all extension storage: `browser.storage.local.clear()`
2. Reset UI state to defaults
