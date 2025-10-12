import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

/**
 * Firefox-compatible manifest configuration
 *
 * Key differences from Chrome:
 * 1. Uses background.scripts instead of service_worker (Firefox MV3 limitation)
 * 2. Removes sidePanel permission (not supported)
 * 3. Keeps all other functionality identical
 */
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
    // Firefox MV3 doesn't support service_worker yet
    scripts: ["src/background/main.ts"],
    type: "module",
  },
  permissions: [
    // Note: sidePanel removed - not supported in Firefox
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
  // Note: side_panel removed - not supported in Firefox
  // Workaround: Open sidepanel content in a new tab instead
});
