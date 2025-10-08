/**
 * Browser API abstraction using webextension-polyfill
 * This provides a consistent Promise-based API across Firefox and Chrome
 */
import browser from "webextension-polyfill";

export { browser };

/**
 * Type-safe browser namespace
 * Use this instead of the global chrome or browser objects
 */
export default browser;
