Task 1: Type Definitions ✅
Created TitleFormatStyle type (compact | detailed | minimal)
Created TitleFormatOptions interface with 8 configuration fields
Added DEFAULT_TITLE_FORMAT constant (status + emojis + reviewStatus enabled by default)
Exported types from index.ts
Task 2: GitHub Formatter ✅
Implementation in github-provider.ts:

formatGitHubTitle() function with smart PR status detection:
Status emojis: 🟢 open ready, 🟡 draft, 🔴 conflicts/closed, ⚫ merged, 🟠 unstable
Review status: ✅ approved or 👁️ reviews requested
Age indicator: ⏰ for PRs >7 days old
Creator: @username: when enabled
Assignee: →@username when different from creator
Updated prToBookmarkItem() to async, fetches titleFormat from config
Uses Promise.all() for efficient batch conversion
Example outputs:

Compact: 🟢 ✅ Add user authentication #123
With creator: 🟢 ✅ @alice: Add user authentication #123
Detailed: 🟢 ✅ @alice: Add user authentication (#123)
Task 3: Jira Formatter ✅
Implementation in jira-provider.ts:

formatJiraTitle() function with smart issue formatting:
Priority emojis: 🔴 highest, 🟠 high, 🟡 medium, 🟢 low, 🔵 lowest
Type emojis: 🐛 bug, 📚 epic, 📖 story, ✅ task, 📝 sub-task, ⚡ improvement, 🔬 spike
Status: Text indicators for TODO/IN PROGRESS/DONE
Assignee: @name: or @unassigned: when enabled
Creator: by @name when different from assignee
Age indicator: ⏰ for issues >7 days old
Updated convertToBookmarkItem() to async, fetches titleFormat from config
Uses Promise.all() for efficient batch conversion


