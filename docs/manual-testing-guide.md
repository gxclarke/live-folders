# Smart Title Formatting - Manual Testing Guide

**Testing Date:** October 10, 2025
**Status:** Ready for Manual Testing

## Automated Test Results ✅

### GitHub Title Formatter

- **Tests:** 21 passed
- **Coverage:**
  - ✅ Status indicators (open/draft/conflicts/merged/closed)
  - ✅ Review status (approved/requested)
  - ✅ Age indicators (>7 days)
  - ✅ Creator and assignee display
  - ✅ Format styles (compact/detailed/minimal)
  - ✅ Edge cases (no user, all options on/off)

### Jira Title Formatter

- **Tests:** 22 passed
- **Coverage:**
  - ✅ Priority indicators (highest to lowest)
  - ✅ Issue type indicators (bug/epic/story/task)
  - ✅ Status displays (todo/in progress/done)
  - ✅ Assignee and creator display
  - ✅ Age indicators (>7 days)
  - ✅ Format styles (compact/detailed/minimal)
  - ✅ Edge cases (unassigned, all options on/off)

## Manual Testing Checklist

### Prerequisites

1. **Extension Setup:**
   - [ ] Build and load extension in Chrome/Firefox
   - [ ] Open sidepanel and navigate to Providers view
   - [ ] Have GitHub Personal Access Token ready
   - [ ] Have Jira credentials ready (optional)

2. **Test Data:**
   - [ ] Access to GitHub repository with PRs
   - [ ] Access to Jira project with issues (optional)

### GitHub PR Testing

#### Test Case 1: Default Configuration

**Setup:**

1. Enable GitHub provider
2. Connect with PAT
3. Select/create bookmark folder
4. Leave default title format settings (Status ✅, Emojis ✅, Review Status ✅)

**Expected Behavior:**

- [ ] Open PRs show 🟢 emoji
- [ ] Draft PRs show 🟡 emoji
- [ ] PRs with conflicts show 🔴 emoji
- [ ] Merged PRs show ⚫ emoji
- [ ] PRs with reviews requested show 👁️
- [ ] PRs without pending reviews show ✅
- [ ] Title format: `🟢 ✅ Title #123`

**Example:**

```text
🟢 ✅ Add user authentication #456
🟡 ✅ Draft: New feature implementation #789
🔴 👁️ Fix critical bug #123
⚫ ✅ Completed feature #321
```

#### Test Case 2: Enable Creator Display

**Setup:**

1. In Title Format section, enable "Show creator"
2. Trigger sync

**Expected Behavior:**

- [ ] Titles include `@username:` before PR title
- [ ] Creator username is extracted from PR author
- [ ] Format: `🟢 ✅ @alice: Title #123`

#### Test Case 3: Enable Age Indicator

**Setup:**

1. Enable "Show age (>7 days)"
2. Trigger sync

**Expected Behavior:**

- [ ] PRs older than 7 days show ⏰ emoji
- [ ] Recent PRs don't show age indicator
- [ ] Format: `🟢 ✅ ⏰ Old PR title #123`

#### Test Case 4: Disable Emojis

**Setup:**

1. Disable "Use emoji icons"
2. Trigger sync

**Expected Behavior:**

- [ ] Status shown as text: `[OPEN]`, `[DRAFT]`, `[CONFLICTS]`, `[MERGED]`, `[CLOSED]`
- [ ] Review status shown as count: `[2 REVIEWS]`
- [ ] Age shown as days: `[10d]`
- [ ] Format: `[OPEN] Title #123`

#### Test Case 5: Format Style Variations

**Setup:**

1. Test each format style: Compact, Detailed, Minimal
2. Trigger sync after each change

**Expected Behavior:**

- [ ] **Compact:** `🟢 ✅ Title #123`
- [ ] **Detailed:** `🟢 ✅ Title (#123)`
- [ ] **Minimal:** `🟢 Title #123`

#### Test Case 6: All Options Enabled

**Setup:**

1. Enable ALL checkboxes:
   - Include status ✅
   - Use emoji icons ✅
   - Include review status ✅
   - Show age (>7 days) ✅
   - Show creator ✅
2. Trigger sync

**Expected Behavior:**

- [ ] Complex title with all elements
- [ ] Format: `🟢 ✅ ⏰ @alice: Title #123`
- [ ] No duplicate information
- [ ] Readable and not too cluttered

#### Test Case 7: Edge Cases

**Setup:**

1. Test with various PR states
2. Trigger sync

**Test Scenarios:**

- [ ] PR with no reviews requested
- [ ] PR with multiple reviewers
- [ ] PR created today (should not show age)
- [ ] PR created 8 days ago (should show age)
- [ ] Closed but not merged PR
- [ ] PR with failing checks (unstable state)
- [ ] PR with merge conflicts (dirty state)

### Jira Issue Testing (Optional)

#### Test Case 8: Default Configuration

**Setup:**

1. Enable Jira provider
2. Configure API token
3. Select/create bookmark folder
4. Leave default settings

**Expected Behavior:**

- [ ] Issues show correct type emoji (🐛 🗂️ 📖 ✅)
- [ ] Title format: `🐛 Issue summary [PROJ-123]`

**Example:**

```text
🐛 Fix critical login crash [PROJ-456]
📖 Add user profile page [PROJ-789]
✅ Update documentation [PROJ-123]
```

#### Test Case 9: Enable Priority Display

**Setup:**

1. Enable "Include priority"
2. Trigger sync

**Expected Behavior:**

- [ ] Highest priority shows 🔴
- [ ] High priority shows 🟠
- [ ] Medium priority shows 🟡
- [ ] Low priority shows 🟢
- [ ] Lowest priority shows 🔵
- [ ] Format: `🔴 🐛 Issue summary [PROJ-123]`

#### Test Case 10: Enable Assignee Display

**Setup:**

1. Enable "Include assignee"
2. Trigger sync

**Expected Behavior:**

- [ ] Assigned issues show `@Name:`
- [ ] Unassigned issues show `@unassigned:`
- [ ] First name extracted from display name
- [ ] Format: `🐛 @Alice: Issue summary [PROJ-123]`

#### Test Case 11: Enable Creator Display

**Setup:**

1. Enable "Show creator"
2. Enable "Include assignee"
3. Trigger sync

**Expected Behavior:**

- [ ] Issues show creator with `by @Name`
- [ ] Creator only shown if different from assignee
- [ ] No duplication when creator = assignee
- [ ] Format: `🐛 @Alice: by @Bob Issue summary [PROJ-123]`

#### Test Case 12: All Jira Options Enabled

**Setup:**

1. Enable all options:
   - Include status ✅
   - Use emoji icons ✅
   - Include priority ✅
   - Include assignee ✅
   - Show age (>7 days) ✅
   - Show creator ✅
2. Trigger sync

**Expected Behavior:**

- [ ] Complex title with all elements
- [ ] Format: `🔴 🐛 @Alice: by @Bob ⏰ Issue summary [PROJ-123]`
- [ ] Readable despite complexity

### UI/UX Testing

#### Test Case 13: Settings Persistence

**Setup:**

1. Configure title format options
2. Close sidepanel
3. Reopen sidepanel

**Expected Behavior:**

- [ ] All title format settings preserved
- [ ] Checkboxes show correct state
- [ ] Dropdown shows correct format style

#### Test Case 14: Settings Update Without Sync

**Setup:**

1. Change title format options
2. Don't trigger manual sync
3. Wait for next automatic sync (or trigger it)

**Expected Behavior:**

- [ ] Settings saved immediately on change
- [ ] New titles use updated format on next sync
- [ ] No need to manually save

#### Test Case 15: Multiple Providers

**Setup:**

1. Configure GitHub with one format
2. Configure Jira with different format
3. Trigger sync for both

**Expected Behavior:**

- [ ] Each provider maintains separate settings
- [ ] GitHub titles use GitHub format
- [ ] Jira titles use Jira format
- [ ] No cross-contamination

#### Test Case 16: Disabled Provider

**Setup:**

1. Configure title format
2. Disable provider toggle
3. Re-enable provider

**Expected Behavior:**

- [ ] Title format settings preserved when disabled
- [ ] Controls grayed out when disabled
- [ ] Settings restored when re-enabled

### Performance Testing

#### Test Case 17: Large PR/Issue Count

**Setup:**

1. Sync provider with 50+ items
2. Monitor sync duration

**Expected Behavior:**

- [ ] Sync completes without timeout
- [ ] All titles formatted correctly
- [ ] No performance degradation
- [ ] Reasonable memory usage

#### Test Case 18: Repeated Syncs

**Setup:**

1. Trigger sync
2. Wait 1 minute
3. Trigger sync again
4. Repeat 5 times

**Expected Behavior:**

- [ ] Consistent formatting across syncs
- [ ] No title drift or changes
- [ ] Stable performance
- [ ] No memory leaks

### Error Handling

#### Test Case 19: Invalid Configuration

**Setup:**

1. Manually corrupt storage (optional)
2. Or disconnect network during sync

**Expected Behavior:**

- [ ] Graceful fallback to default format
- [ ] Error message displayed
- [ ] No extension crash
- [ ] Can recover by reconfiguring

#### Test Case 20: Missing PR/Issue Data

**Setup:**

1. Test with PRs/issues missing optional fields
2. E.g., no assignee, no reviews, etc.

**Expected Behavior:**

- [ ] Formatter handles missing data gracefully
- [ ] No errors or crashes
- [ ] Reasonable fallback values
- [ ] Title still readable

## Test Results Template

Use this template to record your test results:

```markdown
### Test Session: [Date]

**Environment:**
- Browser: Chrome/Firefox [version]
- Extension Version: 1.0.0
- GitHub Account: [username]
- Jira Account: [username or N/A]

**Test Case Results:**

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| TC-1 | Default GitHub Config | ✅/❌ | |
| TC-2 | GitHub Creator Display | ✅/❌ | |
| TC-3 | GitHub Age Indicator | ✅/❌ | |
| TC-4 | GitHub No Emojis | ✅/❌ | |
| TC-5 | Format Styles | ✅/❌ | |
| TC-6 | All GitHub Options | ✅/❌ | |
| TC-7 | GitHub Edge Cases | ✅/❌ | |
| TC-8 | Default Jira Config | ✅/❌/N/A | |
| TC-9 | Jira Priority Display | ✅/❌/N/A | |
| TC-10 | Jira Assignee Display | ✅/❌/N/A | |
| TC-11 | Jira Creator Display | ✅/❌/N/A | |
| TC-12 | All Jira Options | ✅/❌/N/A | |
| TC-13 | Settings Persistence | ✅/❌ | |
| TC-14 | Settings Update | ✅/❌ | |
| TC-15 | Multiple Providers | ✅/❌ | |
| TC-16 | Disabled Provider | ✅/❌ | |
| TC-17 | Large Count | ✅/❌ | |
| TC-18 | Repeated Syncs | ✅/❌ | |
| TC-19 | Invalid Config | ✅/❌ | |
| TC-20 | Missing Data | ✅/❌ | |

**Issues Found:**
1. [Description] - [Severity: Critical/Major/Minor]
2. ...

**Overall Assessment:**
- [ ] Ready for release
- [ ] Needs fixes
- [ ] Blocked (reason: ___)
```

## Quick Start Testing

If time is limited, focus on these essential tests:

1. **TC-1:** Default GitHub configuration (core functionality)
2. **TC-6:** All GitHub options enabled (comprehensive test)
3. **TC-7:** GitHub edge cases (robustness)
4. **TC-13:** Settings persistence (data integrity)
5. **TC-17:** Large PR count (performance)

This covers the most critical paths and should reveal any major issues.

## Tips for Effective Testing

1. **Take Screenshots:** Capture examples of formatted titles
2. **Test Real Data:** Use your actual repositories/projects
3. **Compare Before/After:** Note differences from default titles
4. **Check Bookmarks:** Verify titles in browser bookmarks UI
5. **Test Browser Compatibility:** Try both Chrome and Firefox
6. **Monitor Console:** Check for errors or warnings
7. **Test Edge Cases:** Look for unusual PR/issue states

## Known Limitations to Verify

During testing, confirm these expected limitations:

1. Age threshold is fixed at 7 days
2. Provider-specific options only show for correct provider
3. Emoji mappings are not customizable
4. Format calculation happens on sync, not live

## Success Criteria

The feature is ready for release when:

- [ ] All critical test cases (TC-1, TC-6, TC-7, TC-13, TC-17) pass
- [ ] No critical or major bugs found
- [ ] Settings persist correctly across browser restarts
- [ ] Performance acceptable with 50+ items
- [ ] Both GitHub and Jira formatters work correctly
- [ ] Edge cases handled gracefully
- [ ] User experience is intuitive and responsive

## Next Steps After Testing

1. Document any bugs found in GitHub issues
2. Update README with title formatting feature
3. Add screenshots to documentation
4. Consider user feedback on default settings
5. Plan any enhancements for future releases
