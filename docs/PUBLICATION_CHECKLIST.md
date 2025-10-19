# Chrome Web Store Publication Checklist

**Date:** October 19, 2025  
**Extension:** Live Folders  
**Status:** Pre-Publication

## Immediate Action Items

### ⚠️ Before You Start

- [ ] **Complete OAuth Setup** (Prerequisites)
  - [ ] Create GitHub OAuth app with production settings
  - [ ] Create Jira OAuth app with production settings
  - [ ] Copy `.env.local.sample` to `.env.local` with real credentials
  - [ ] Test OAuth flows work end-to-end

- [ ] **Create Production Build**
  - [ ] `npm run build`
  - [ ] Test `dist/` folder as unpacked extension
  - [ ] Verify all features work in production build

### 📸 Store Assets (Est. 2-3 hours)

- [ ] **Screenshots** (Required - 1280x800px)
  - [ ] Main sidepanel UI with providers configured
  - [ ] Authentication flow (OAuth connection)
  - [ ] Bookmark folders showing synced PRs/issues
  - [ ] Settings/provider configuration
  - [ ] Collapsible sections in action

- [ ] **Privacy Policy** (Required)
  - [ ] Create `PRIVACY.md` in repository
  - [ ] Publish on GitHub Pages or other accessible URL
  - [ ] Include URL ready for store listing

### 💳 Chrome Web Store Setup (Est. 30 minutes + wait time)

- [ ] **Developer Account**
  - [ ] Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
  - [ ] Pay $5 registration fee
  - [ ] Complete developer profile

### 📦 Package & Submit (Est. 30 minutes)

- [ ] **Create Extension Package**
  - [ ] Create ZIP from `dist/` folder contents
  - [ ] Verify ZIP contains only built assets (no source code)

- [ ] **Store Listing**
  - [ ] Upload ZIP package
  - [ ] Fill store description (copy from guide)
  - [ ] Upload screenshots
  - [ ] Add privacy policy URL
  - [ ] Submit for review

### ⏳ After Submission (Est. 1-7 days)

- [ ] **Wait for Review** (automated + manual)
- [ ] **Address Review Issues** (if any)
- [ ] **Go Live** 🎉

### 🔧 Post-Approval (Required)

- [ ] **Update OAuth Apps with Production Extension ID**
  - [ ] GitHub OAuth app: Add `https://[EXTENSION_ID].chromiumapp.org/github`
  - [ ] Jira OAuth app: Add `https://[EXTENSION_ID].chromiumapp.org/jira`
- [ ] **Test Published Extension**
- [ ] **Update Documentation** with store link

## Quick Copy-Paste Content

### Store Title

```text
Live Folders - GitHub & Jira Sync
```

### Store Summary

```text
Sync GitHub PRs and Jira issues as bookmarks. Quick access to your work items with real-time updates.
```

### Category

```text
Productivity
```

### Support URL

```text
https://github.com/gxclarke/live-folders
```

## Estimated Timeline

- **Asset Creation**: 2-3 hours
- **Account Setup**: 30 minutes
- **Submission**: 30 minutes
- **Review Wait**: 1-7 days
- **Post-Approval Setup**: 1 hour

**Total**: 3-5 days from start to published

## Need Help?

1. **Technical Issues**: Check `docs/CHROME_STORE_PUBLISHING.md` for detailed troubleshooting
2. **OAuth Setup**: Refer to `docs/oauth2-implementation-guide.md`
3. **Chrome Web Store**: [Chrome Web Store Help Center](https://support.google.com/chrome_webstore/)

## Success Tips

1. **Test Thoroughly**: Ensure OAuth flows work before submission
2. **Quality Screenshots**: Show the extension solving real problems
3. **Clear Descriptions**: Explain benefits, not just features
4. **Privacy First**: Be transparent about data handling

---

**Ready to publish? Start with the OAuth setup if not already complete, then work through this checklist systematically.**

🚀 **You've got this! Your extension is well-built and ready for the Chrome Web Store.**
