#!/usr/bin/env node
/**
 * Firefox Manifest Patcher
 *
 * Modifies the built manifest.json to be Firefox-compatible by:
 * 1. Replacing service_worker with scripts array
 * 2. Removing unsupported permissions (sidePanel)
 * 3. Removing unsupported fields (side_panel)
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, "..", "dist");
const MANIFEST_PATH = join(DIST_DIR, "manifest.json");

console.log("🦊 Patching manifest for Firefox compatibility...");

try {
  // Read the manifest
  const manifestContent = readFileSync(MANIFEST_PATH, "utf-8");
  const manifest = JSON.parse(manifestContent);

  // 1. Fix background script (service_worker → scripts)
  if (manifest.background?.service_worker) {
    const serviceWorkerPath = manifest.background.service_worker;
    manifest.background = {
      scripts: [serviceWorkerPath],
      type: manifest.background.type || "module",
    };
    console.log("  ✓ Converted service_worker to scripts array");
  }

  // 2. Remove unsupported permissions
  if (manifest.permissions) {
    const unsupportedPerms = ["sidePanel", "contentSettings"];
    const originalLength = manifest.permissions.length;
    manifest.permissions = manifest.permissions.filter((perm) => !unsupportedPerms.includes(perm));
    if (manifest.permissions.length < originalLength) {
      console.log(
        `  ✓ Removed ${originalLength - manifest.permissions.length} unsupported permission(s)`,
      );
    }
  }

  // 3. Remove side_panel field
  if (manifest.side_panel) {
    delete manifest.side_panel;
    console.log("  ✓ Removed side_panel field");
  }

  // 4. Add Firefox-specific fields
  manifest.browser_specific_settings = {
    gecko: {
      id: "live-folders@gxclarke.github.io",
      strict_min_version: "109.0", // Firefox 109+ has better MV3 support
    },
  };
  console.log("  ✓ Added browser_specific_settings for Firefox");

  // Write back
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log("✅ Firefox manifest ready!");
  console.log(`📦 Location: ${MANIFEST_PATH}`);
} catch (error) {
  console.error("❌ Failed to patch manifest:", error.message);
  process.exit(1);
}
