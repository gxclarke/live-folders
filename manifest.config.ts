import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Live Folders",
  description: "Sync your GitHub PRs and Jira issues as browser bookmarks for quick access",
  version: pkg.version,
  icons: {
    16: "public/icon-16.png",
    48: "public/icon-48.png",
    128: "public/icon-128.png",
  },
  action: {
    default_icon: {
      16: "public/icon-16.png",
      32: "public/icon-32.png",
      48: "public/icon-48.png",
    },
    default_popup: "src/popup/index.html",
  },
  background: {
    service_worker: "src/background/main.ts",
    type: "module",
  },
  permissions: [
    "sidePanel",
    "contentSettings",
    "bookmarks",
    "storage",
    "alarms",
    "identity",
    "notifications",
  ],
  host_permissions: [
    "https://api.github.com/*",
    "https://*.atlassian.net/*", // Jira Cloud instances
    "https://*.jira.com/*", // Alternative Jira domains
  ],
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
});
