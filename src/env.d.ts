/// <reference types="vite/client" />

/**
 * Environment Variables Type Definitions
 * Extends Vite's ImportMetaEnv interface with our custom environment variables
 */

// biome-ignore lint/correctness/noUnusedVariables: TypeScript ambient declaration
interface ImportMetaEnv {
  /**
   * GitHub OAuth Client ID
   * Get from: https://github.com/settings/developers
   */
  readonly VITE_GITHUB_OAUTH_CLIENT_ID?: string;

  /**
   * GitHub OAuth Client Secret
   * Get from: https://github.com/settings/developers
   */
  readonly VITE_GITHUB_OAUTH_CLIENT_SECRET?: string;

  /**
   * Jira OAuth Client ID
   * Get from: https://developer.atlassian.com/console/myapps/
   */
  readonly VITE_JIRA_OAUTH_CLIENT_ID?: string;

  /**
   * Jira OAuth Client Secret
   * Get from: https://developer.atlassian.com/console/myapps/
   */
  readonly VITE_JIRA_OAUTH_CLIENT_SECRET?: string;
}

// biome-ignore lint/correctness/noUnusedVariables: TypeScript ambient declaration
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Export to make this a module (required for TypeScript ambient declarations)
export {};
