# Live Folders - Project Summary

## Overview

Live Folders is a Firefox/Zen Browser extension that creates dynamic bookmark folders which automatically sync with external APIs to provide real-time access to relevant items.

## Quick Links

- **Goals:** [GOALS.md](GOALS.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation Plan:** [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)

## Key Features

### Core Functionality

1. **Dynamic Bookmark Folders** - Special folders that auto-update from external APIs
2. **Multiple Provider Support** - GitHub (PRs), Jira (issues), and extensible architecture
3. **Automatic Sync** - Updates every 60 seconds in the background
4. **OAuth Authentication** - Secure login flows for each provider

### Initial Providers

- **GitHub:** Pull requests (created by you or assigned for review)
- **Jira:** Work items assigned to you

### Extensibility

- Plugin architecture for adding custom providers
- Well-documented Provider interface
- Easy integration with any REST API

## Architecture Highlights

### Core Components

1. **Background Service Worker** - Orchestrates syncs and manages lifecycle
2. **Provider System** - Abstraction layer for external APIs
3. **Authentication Manager** - OAuth 2.0 flows and token management
4. **Sync Engine** - Intelligent diff-based bookmark updates
5. **Storage Manager** - Centralized data persistence
6. **UI Components** - Popup and side panel interfaces

### Technology Stack

- **Runtime:** WebExtension APIs (Firefox/Zen Browser)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite + CRXJS
- **Testing:** Vitest
- **Browser APIs:** bookmarks, alarms, storage, identity

## Implementation Timeline

### MVP Timeline: 6-8 weeks

**Phase 1:** Foundation (Weeks 1-2)

- Project setup, type definitions, core services

**Phase 2:** Authentication (Weeks 2-3)

- OAuth flows for GitHub and Jira

**Phase 3:** Providers (Weeks 3-4)

- GitHub and Jira provider implementations

**Phase 4:** Sync Engine (Weeks 4-5)

- Bookmark management and sync logic

**Phase 5:** Background Worker (Week 5)

- Scheduling and orchestration

**Phase 6:** User Interface (Week 6)

- Popup and side panel UIs

**Phase 7:** Testing (Week 7)

- Unit, integration, and manual testing

**Phase 8:** Documentation & Release (Week 8)

- Docs, store assets, submission

## Development Status

### Completed ✓

- [x] Project initialization
- [x] Vite + React + TypeScript setup
- [x] Basic manifest configuration
- [x] GitHub repository created

### Next Steps 🚀

1. Add WebExtension polyfill
2. Create type definitions
3. Implement Storage Manager
4. Set up development environment

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Firefox Developer Edition (recommended)
- Zen Browser (for testing)

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests (once implemented)
npm test
```

### Testing the Extension

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the build directory

## Key Design Decisions

### Why Firefox First?

- Zen Browser is Firefox-based
- WebExtension APIs are more permissive
- Better developer tools for extensions
- Chrome compatibility via polyfill

### Why Manifest V3?

- Future-proof (V2 being deprecated)
- Service worker model (better performance)
- Modern security features

### Why React?

- Component reusability
- Rich ecosystem
- Familiar to most developers
- Good TypeScript support

### Sync Strategy

- **Polling:** Every 60 seconds (configurable)
- **Diff-based:** Only update changed bookmarks
- **Batch operations:** Efficient bookmark API usage
- **Background:** Runs even when browser idle

## Security Considerations

- OAuth tokens stored in encrypted browser.storage.local
- HTTPS-only API calls
- Minimal permission requests
- No token logging
- CSP headers in manifest

## Extensibility Model

### Adding a New Provider

```typescript
// 1. Implement the Provider interface
export class CustomProvider implements Provider {
  id = 'custom';
  name = 'Custom Service';
  icon = 'custom-icon.svg';
  
  async authenticate(): Promise<AuthResult> { /* ... */ }
  async fetchItems(): Promise<BookmarkItem[]> { /* ... */ }
  // ... other methods
}

// 2. Register in provider registry
providerRegistry.register(new CustomProvider());

// 3. Add OAuth configuration
// 4. Create provider UI components
```

## Future Enhancements

### Near-term (Next 2-4 weeks)

- Notifications for new items
- Custom filters per provider
- Sorting and search capabilities
- Configuration export/import

### Medium-term (1-2 months)

- Additional providers (Linear, Trello, Asana)
- Plugin system for community providers
- Analytics dashboard
- Keyboard shortcuts

### Long-term (3+ months)

- Mobile browser support
- Cross-device sync
- AI-powered categorization
- Collaborative folders

## Success Metrics

### Week 1 Post-Launch

- 50+ installations
- <5% error rate
- No critical bugs

### Month 1

- 500+ installations
- 4+ star rating
- 2+ provider integrations

### Month 3

- 2,000+ installations
- 4.5+ star rating
- 5+ provider integrations
- Community contributions

## Resources

### Documentation

- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions API Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Jira REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)

### Community

- GitHub Issues (for bug reports)
- GitHub Discussions (for questions)
- Firefox Add-ons Community

## Contributing

We welcome contributions! See `CONTRIBUTING.md` (coming soon) for:

- Code style guidelines
- Pull request process
- Testing requirements
- Documentation standards

## License

TBD (Recommended: MIT or Apache 2.0)

---

**Last Updated:** October 7, 2025
**Status:** Planning Phase
**Next Milestone:** Phase 1 Complete (Week 2)
