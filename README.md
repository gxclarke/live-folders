# Live Folders 📁

> Automatically sync your GitHub PRs, Jira issues, and more directly to your browser bookmarks!

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)

**Live Folders** is a browser extension that keeps your work items synchronized as bookmarks. Never lose track of your pull requests, issues, and tasks across different platforms.

## ✨ Features

- 🔄 **Automatic Syncing** - Configurable intervals (1-60 minutes)
- 🔐 **Secure OAuth** - Safe authentication with GitHub and Jira
- 📂 **Smart Organization** - Choose your bookmark folders
- 🔍 **Instant Search** - Find items across all providers
- 🎨 **Beautiful UI** - Modern Material-UI interface
- 🌙 **Dark Mode** - Auto, light, or dark themes
- ⚡ **Fast & Lightweight** - Minimal performance impact

## 🚀 Quick Start

### Installation

#### From Chrome Web Store *(Coming Soon)*

1. Visit the [Live Folders page](https://chrome.google.com/webstore)
2. Click "Add to Chrome"
3. Follow the setup wizard

#### From Source (Developers)

```bash
# Clone the repository
git clone https://github.com/gxclarke/live-folders.git
cd live-folders

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

### First-Time Setup

1. **Click the extension icon** in your toolbar
2. **Click Settings** (gear icon) to open the sidepanel
3. **Connect a provider** (GitHub or Jira)
4. **Select a bookmark folder** for synced items
5. **Enable the provider** and click "Sync Now"

📖 **Full Guide**: See [Quick Start Guide](docs/QUICK_START.md)

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete user documentation
- **[Quick Start](docs/QUICK_START.md)** - 5-minute getting started guide
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Architecture](docs/ARCHITECTURE.md)** - Technical architecture overview
- **[Implementation Plan](docs/IMPLEMENTATION_PLAN.md)** - Development roadmap

## 🎯 Supported Providers

### GitHub

- ✅ Pull requests you authored
- ✅ Pull requests you're reviewing
- ✅ OAuth 2.0 authentication
- ✅ Automatic updates

### Jira

- ✅ Issues assigned to you
- ✅ Cloud and Server/Data Center support
- ✅ OAuth 2.0 and API token auth
- ✅ Custom JQL queries

### Coming Soon

- 🔜 GitLab
- 🔜 Bitbucket
- 🔜 Linear
- 🔜 Trello
- 🔜 Asana

*Want another provider? [Request it!](https://github.com/gxclarke/live-folders/issues)*

## 🖼️ Screenshots

### Popup Interface

Quick access to provider status and sync operations.

*Screenshots coming soon*

### Sidepanel Views

- **Providers**: Configure authentication and folders
- **Items**: Browse and search all synced items
- **Settings**: Customize sync behavior and preferences

*Screenshots coming soon*

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or pnpm
- Chrome or Chromium-based browser

### Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
npm run lint:fix

# Run markdown linting
npm run lint:md
npm run lint:md:fix
```

### Project Structure

```text
live-folders/
├── src/
│   ├── background/       # Background service worker
│   ├── components/       # Shared React components
│   ├── popup/           # Popup UI (browser action)
│   ├── sidepanel/       # Sidepanel UI (settings, items)
│   ├── providers/       # Provider implementations
│   ├── services/        # Core services (auth, storage, sync)
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── docs/                # Documentation
├── public/              # Static assets
└── dist/                # Build output (git-ignored)
```

### Tech Stack

- **Framework**: React 19 + TypeScript 5.6
- **Build Tool**: Vite 6 + CRXJS
- **UI Library**: Material-UI 5
- **Code Quality**: Biome (linting + formatting)
- **Extension APIs**: Chrome Extension Manifest V3

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines *(coming soon)*.

## 🧪 Testing

### Manual Testing

```bash
# Build and load extension
npm run build

# Enable debug mode in extension settings
# Open browser console (F12)
# Look for [Live Folders] logs
```

### End-to-End Testing

*Automated testing framework coming soon*

## 📦 Building & Release

### Production Build

```bash
# Clean build
rm -rf dist/
npm run build

# Output in dist/ folder
# Ready for Chrome Web Store submission
```

### Release Process

1. Update version in `manifest.config.ts`
2. Update `CHANGELOG.md`
3. Build production release
4. Create git tag
5. Submit to Chrome Web Store

## 🔒 Privacy & Security

- **No Data Collection**: Your data never leaves your browser
- **Secure Storage**: Tokens encrypted in browser storage
- **OAuth 2.0**: Industry-standard authentication
- **Open Source**: Full transparency, audit the code

Read our [Privacy Policy](PRIVACY.md) *(coming soon)*.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Powered by [CRXJS](https://crxjs.dev/vite-plugin)
- UI components from [Material-UI](https://mui.com/)
- Icons from [Material Icons](https://fonts.google.com/icons)

## 📞 Support

- **Bug Reports**: [GitHub Issues](https://github.com/gxclarke/live-folders/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/gxclarke/live-folders/discussions)
- **Documentation**: [User Guide](docs/USER_GUIDE.md)
- **Troubleshooting**: [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 🗺️ Roadmap

### v1.0.0 (Current)

- ✅ GitHub PR syncing
- ✅ Jira issue syncing
- ✅ OAuth authentication
- ✅ Automatic background sync
- ✅ Material-UI interface

### v1.1.0 (Planned)

- 🔜 GitLab support
- 🔜 Bitbucket support
- 🔜 Export/import settings
- 🔜 Custom sync schedules per provider
- 🔜 Analytics dashboard

### v2.0.0 (Future)

- 🔜 Conflict resolution UI
- 🔜 Smart notifications
- 🔜 Multi-account support
- 🔜 Custom provider API
- 🔜 Browser sync across devices

See [CHANGELOG.md](CHANGELOG.md) for version history *(coming soon)*.

## 📊 Project Status

- **Status**: 🚧 Proof of Concept
- **Version**: 1.0.0
- **Last Updated**: October 2025
- **Maintenance**: Active

## ⭐ Show Your Support

If you find Live Folders helpful:

- ⭐ Star this repository
- 📝 Write a review on Chrome Web Store
- 🐦 Share on social media
- 🐛 Report bugs and suggest features
- 💻 Contribute code or documentation

---

**Made with ❤️ by the Live Folders team**

[Report Bug](https://github.com/gxclarke/live-folders/issues) · [Request Feature](https://github.com/gxclarke/live-folders/discussions) · [Documentation](docs/)
