/**
 * Jira Provider
 * Implements multiple auth methods and issue fetching from Jira API
 * Supports both Jira Cloud and Jira Server/Data Center
 */

import { authManager } from "@/services/auth-manager";
import { storageManager } from "@/services/storage";
import type {
  AuthResult,
  BookmarkItem,
  Provider,
  ProviderConfig,
  ProviderMetadata,
  TitleFormatOptions,
} from "@/types";
import { DEFAULT_FOLDER_TITLE_FORMAT, DEFAULT_TITLE_FORMAT } from "@/types";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";

/**
 * Jira authentication types
 */
type JiraAuthType = "oauth" | "api-token" | "basic";

/**
 * Jira instance type
 */
type JiraInstanceType = "cloud" | "server";

/**
 * Jira user response
 */
interface JiraUser {
  accountId: string; // Cloud
  key?: string; // Server
  name?: string; // Server
  emailAddress: string;
  displayName: string;
  avatarUrls: {
    "48x48": string;
  };
  active: boolean;
}

/**
 * Jira issue response
 */
interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    priority: {
      name: string;
      iconUrl: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    project: {
      key: string;
      name: string;
    };
    assignee: {
      displayName: string;
      avatarUrls: {
        "48x48": string;
      };
    } | null;
    reporter: {
      displayName: string;
    };
    created: string;
    updated: string;
    description?: string;
  };
}

/**
 * Jira search response
 */
interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

/**
 * Jira provider configuration
 */
interface JiraProviderConfig extends ProviderConfig {
  baseUrl?: string;
  authType?: JiraAuthType;
  instanceType?: JiraInstanceType;
  apiToken?: string;
  username?: string;
  password?: string;
}

/**
 * Jira Provider Implementation
 */
export class JiraProvider implements Provider {
  public readonly metadata: ProviderMetadata = {
    id: "jira",
    name: "Jira",
    description: "Sync work items from Jira",
    icon: "https://www.atlassian.com/favicon.ico",
    version: "1.0.0",
  };

  private logger: Logger;
  private readonly PROVIDER_ID = "jira";
  private baseUrl = "";
  private authType: JiraAuthType = "oauth";
  private instanceType: JiraInstanceType = "cloud";

  // OAuth Configuration for Jira Cloud
  private readonly OAUTH_CONFIG = {
    authUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    clientId: import.meta.env.VITE_JIRA_OAUTH_CLIENT_ID || "",
    clientSecret: import.meta.env.VITE_JIRA_OAUTH_CLIENT_SECRET || "",
    redirectUri: browser.identity.getRedirectURL("jira"),
    scopes: ["read:jira-user", "read:jira-work", "offline_access"],
    additionalParams: {
      audience: "api.atlassian.com",
      prompt: "consent",
    },
  };

  constructor() {
    this.logger = new Logger("JiraProvider");
  }

  /**
   * Initialize the provider
   */
  public async initialize(): Promise<void> {
    this.logger.info("Initializing Jira provider");

    // Ensure provider storage exists with default config
    const existingData = await storageManager.getProvider(this.PROVIDER_ID);
    if (!existingData) {
      this.logger.info("Creating initial provider storage");
      await storageManager.saveProvider(this.PROVIDER_ID, {
        config: {
          enabled: false,
        },
      });
    }

    // Load provider configuration
    const config = await this.getConfig();
    const jiraConfig = config as JiraProviderConfig;

    if (jiraConfig.baseUrl) {
      this.baseUrl = jiraConfig.baseUrl;
      this.instanceType = this.detectInstanceType(jiraConfig.baseUrl);
    }
    if (jiraConfig.authType) {
      this.authType = jiraConfig.authType;
    }

    // Load OAuth credentials from environment variables
    if (this.authType === "oauth" && !this.OAUTH_CONFIG.clientId) {
      this.logger.warn(
        "Jira OAuth Client ID not configured. Set VITE_JIRA_OAUTH_CLIENT_ID environment variable.",
      );
      this.logger.info(
        "OAuth authentication will not be available. Use API Token or Basic Auth instead.",
      );
    }

    // Register OAuth config with AuthManager (for OAuth flow)
    if (this.authType === "oauth") {
      authManager.registerOAuthConfig(this.PROVIDER_ID, this.OAUTH_CONFIG);
    }

    this.logger.info("Jira provider initialized", {
      baseUrl: this.baseUrl,
      authType: this.authType,
      instanceType: this.instanceType,
      oauthConfigured: !!this.OAUTH_CONFIG.clientId,
    });
  }

  /**
   * Authenticate with Jira
   */
  public async authenticate(): Promise<AuthResult> {
    // Re-read config to get the latest settings (in case they were changed after initialization)
    const config = (await this.getConfig()) as JiraProviderConfig;
    const authType = config.authType || this.authType;

    // Update instance variables with latest config
    if (config.baseUrl) {
      this.baseUrl = this.normalizeBaseUrl(config.baseUrl);
      this.instanceType = this.detectInstanceType(this.baseUrl);
    }

    this.logger.info("Authenticating with Jira", { authType, baseUrl: this.baseUrl });

    try {
      if (authType === "oauth") {
        return await this.authenticateOAuth();
      }
      if (authType === "api-token") {
        return await this.authenticateApiToken();
      }
      if (authType === "basic") {
        return await this.authenticateBasic();
      }

      throw new Error(`Unsupported auth type: ${authType}`);
    } catch (error) {
      this.logger.error("Authentication failed", { error }, error as Error);
      throw error;
    }
  }

  /**
   * Authenticate using OAuth 2.0 (Jira Cloud)
   */
  private async authenticateOAuth(): Promise<AuthResult> {
    // Delegate to AuthManager for OAuth flow
    const authState = await authManager.authenticate(this.PROVIDER_ID);

    if (!authState.tokens) {
      throw new Error("No tokens received from OAuth flow");
    }

    // Fetch user information
    const user = await this.fetchUserInfo(authState.tokens.accessToken);

    // Update auth state with user info
    const updatedAuthState = {
      ...authState,
      user: {
        id: user.accountId,
        username: user.emailAddress,
        displayName: user.displayName,
        email: user.emailAddress,
        avatarUrl: user.avatarUrls["48x48"],
      },
    };

    await storageManager.saveAuth(this.PROVIDER_ID, updatedAuthState);

    this.logger.info("OAuth authentication successful", {
      userId: user.accountId,
      displayName: user.displayName,
    });

    return {
      success: true,
      accessToken: authState.tokens.accessToken,
      refreshToken: authState.tokens.refreshToken,
      expiresAt: authState.tokens.expiresAt,
      user: updatedAuthState.user,
    };
  }

  /**
   * Authenticate using API token (Jira Cloud)
   */
  private async authenticateApiToken(): Promise<AuthResult> {
    const config = (await this.getConfig()) as JiraProviderConfig;

    if (!config.apiToken || !config.username) {
      throw new Error("API token and username are required for API token authentication");
    }

    if (!config.baseUrl) {
      throw new Error("Jira base URL is required for API token authentication");
    }

    this.logger.info("Authenticating with API token", {
      baseUrl: config.baseUrl,
      username: config.username,
      instanceType: this.instanceType,
    });

    // Verify credentials by fetching user info
    const token = btoa(`${config.username}:${config.apiToken}`);

    let user: JiraUser;
    try {
      user = await this.fetchUserInfo(token, "basic");
      this.logger.info("User info fetched successfully", { user });
    } catch (error) {
      this.logger.error("Failed to fetch user info", { error, baseUrl: this.baseUrl });
      throw error;
    }

    // Store auth state manually (no OAuth tokens)
    const authState = {
      providerId: this.PROVIDER_ID,
      authenticated: true,
      tokens: {
        accessToken: token,
        tokenType: "Basic",
        expiresAt: Number.MAX_SAFE_INTEGER, // API tokens don't expire
      },
      user: {
        id: user.accountId,
        username: config.username,
        displayName: user.displayName,
        email: user.emailAddress,
        avatarUrl: user.avatarUrls["48x48"],
      },
    };

    await storageManager.saveAuth(this.PROVIDER_ID, authState);

    this.logger.info("API token authentication successful", {
      userId: user.accountId,
      username: config.username,
    });

    return {
      success: true,
      accessToken: token,
      expiresAt: Number.MAX_SAFE_INTEGER,
      user: authState.user,
    };
  }

  /**
   * Authenticate using basic auth (Jira Server)
   */
  private async authenticateBasic(): Promise<AuthResult> {
    const config = (await this.getConfig()) as JiraProviderConfig;

    if (!config.username || !config.password) {
      throw new Error("Username and password are required for basic authentication");
    }

    // Verify credentials by fetching user info
    const token = btoa(`${config.username}:${config.password}`);
    const user = await this.fetchUserInfo(token, "basic");

    // Store auth state manually (no OAuth tokens)
    const authState = {
      providerId: this.PROVIDER_ID,
      authenticated: true,
      tokens: {
        accessToken: token,
        tokenType: "Basic",
        expiresAt: Number.MAX_SAFE_INTEGER, // Basic auth doesn't expire
      },
      user: {
        id: user.key || user.accountId,
        username: config.username,
        displayName: user.displayName,
        email: user.emailAddress,
        avatarUrl: user.avatarUrls["48x48"],
      },
    };

    await storageManager.saveAuth(this.PROVIDER_ID, authState);

    this.logger.info("Basic authentication successful", {
      userId: user.key || user.accountId,
      username: config.username,
    });

    return {
      success: true,
      accessToken: token,
      expiresAt: Number.MAX_SAFE_INTEGER,
      user: authState.user,
    };
  }

  /**
   * Check if authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    if (this.authType === "oauth") {
      return authManager.isAuthenticated(this.PROVIDER_ID);
    }

    // For API token and basic auth, check if auth state exists
    const authState = await storageManager.getAuth(this.PROVIDER_ID);
    return authState?.authenticated || false;
  }

  /**
   * Get authentication token
   */
  public async getToken(): Promise<string | null> {
    if (this.authType === "oauth") {
      return authManager.getToken(this.PROVIDER_ID);
    }

    // For API token and basic auth, retrieve from auth state
    const authState = await storageManager.getAuth(this.PROVIDER_ID);
    return authState?.tokens?.accessToken || null;
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<void> {
    if (this.authType === "oauth") {
      await authManager.refreshToken(this.PROVIDER_ID);
    }
    // API token and basic auth don't need refresh
  }

  /**
   * Revoke authentication
   */
  public async revokeAuth(): Promise<void> {
    if (this.authType === "oauth") {
      await authManager.revokeAuth(this.PROVIDER_ID);
    } else {
      // For API token and basic auth, just clear auth state
      const emptyState = {
        providerId: this.PROVIDER_ID,
        authenticated: false,
      };
      await storageManager.saveAuth(this.PROVIDER_ID, emptyState);
    }
  }

  /**
   * Fetch issues from Jira
   */
  public async fetchItems(): Promise<BookmarkItem[]> {
    this.logger.info("Fetching Jira issues");

    const token = await this.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    try {
      // Fetch assigned issues
      const assignedIssues = await this.fetchAssignedIssues(token);

      // Convert to BookmarkItems
      const items = await Promise.all(
        assignedIssues.map((issue) => this.convertToBookmarkItem(issue)),
      );

      this.logger.info("Fetched Jira issues", { count: items.length });

      return items;
    } catch (error) {
      this.logger.error("Failed to fetch issues", { error }, error as Error);
      throw error;
    }
  }

  /**
   * Get provider configuration
   */
  public async getConfig(): Promise<ProviderConfig> {
    const providers = await storageManager.getProviders();
    const providerData = providers[this.PROVIDER_ID];

    const config = providerData?.config || { enabled: false };

    // Ensure folderTitleFormat has defaults if not set
    if (!config.folderTitleFormat) {
      config.folderTitleFormat = DEFAULT_FOLDER_TITLE_FORMAT;
    }

    // Ensure titleFormat has defaults if not set
    if (!config.titleFormat) {
      config.titleFormat = DEFAULT_TITLE_FORMAT;
    }

    return config;
  }

  /**
   * Update provider configuration
   */
  public async setConfig(config: ProviderConfig): Promise<void> {
    const providers = await storageManager.getProviders();
    const existingData = providers[this.PROVIDER_ID];

    const currentConfig = await this.getConfig();
    const updatedConfig = { ...currentConfig, ...config };

    // Preserve ALL existing provider data, only update config
    await storageManager.saveProvider(this.PROVIDER_ID, {
      ...existingData,
      config: updatedConfig,
    });
  }

  /**
   * Dispose the provider and clean up resources
   */
  public async dispose(): Promise<void> {
    this.logger.info("Disposing Jira provider");
    // No specific cleanup needed
  }

  /**
   * Normalize base URL by removing trailing slashes and ensuring protocol
   */
  private normalizeBaseUrl(url: string): string {
    // Remove trailing slashes
    let normalized = url.trim().replace(/\/+$/, "");

    // Ensure protocol
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = `https://${normalized}`;
    }

    return normalized;
  }

  /**
   * Detect Jira instance type from base URL
   */
  private detectInstanceType(baseUrl: string): JiraInstanceType {
    if (baseUrl.includes("atlassian.net")) {
      return "cloud";
    }
    return "server";
  }

  /**
   * Fetch user information from Jira
   */
  private async fetchUserInfo(
    token: string,
    authType: "oauth" | "basic" = "oauth",
  ): Promise<JiraUser> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (authType === "oauth") {
      headers.Authorization = `Bearer ${token}`;
    } else {
      headers.Authorization = `Basic ${token}`;
    }

    // Different endpoints for Cloud vs Server
    const endpoint =
      this.instanceType === "cloud"
        ? `${this.baseUrl}/rest/api/3/myself`
        : `${this.baseUrl}/rest/api/2/myself`;

    this.logger.info("Fetching user info from Jira", {
      endpoint,
      instanceType: this.instanceType,
      authType,
    });

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error("Failed to fetch user info from Jira", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorBody: errorText,
      });
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as JiraUser;
  }

  /**
   * Fetch assigned issues from Jira
   */
  private async fetchAssignedIssues(token: string): Promise<JiraIssue[]> {
    const authType = this.authType === "oauth" ? "oauth" : "basic";
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (authType === "oauth") {
      headers.Authorization = `Bearer ${token}`;
    } else {
      headers.Authorization = `Basic ${token}`;
    }

    // Get current user to build JQL query
    const user = await this.fetchUserInfo(token, authType);
    const userIdentifier = this.instanceType === "cloud" ? user.accountId : user.name || user.key;

    // Get filter configuration (default both to true)
    const config = await this.getConfig();
    const filters = config.filters as { createdByMe?: boolean; assignedToMe?: boolean } | undefined;
    const includeCreatedByMe = filters?.createdByMe ?? true;
    const includeAssignedToMe = filters?.assignedToMe ?? true;

    // Build JQL query based on filters
    const conditions: string[] = [];

    if (includeCreatedByMe) {
      const creatorCondition =
        this.instanceType === "cloud"
          ? `reporter = "${userIdentifier}"`
          : `reporter = ${userIdentifier}`;
      conditions.push(creatorCondition);
    }

    if (includeAssignedToMe) {
      const assigneeCondition =
        this.instanceType === "cloud"
          ? `assignee = "${userIdentifier}"`
          : `assignee = ${userIdentifier}`;
      conditions.push(assigneeCondition);
    }

    // If no filters enabled, return empty
    if (conditions.length === 0) {
      this.logger.info("No filters enabled, returning empty list");
      return [];
    }

    // Combine conditions with OR and add status filter
    const jql = `(${conditions.join(" OR ")}) AND statusCategory != Done ORDER BY updated DESC`;

    const searchParams = new URLSearchParams({
      jql,
      maxResults: "100",
      fields:
        "summary,status,priority,issuetype,project,assignee,reporter,created,updated,description",
    });

    // Different API versions for Cloud vs Server
    // Cloud uses the new /search/jql endpoint (deprecated /search in 2024)
    const endpoint =
      this.instanceType === "cloud"
        ? `${this.baseUrl}/rest/api/3/search/jql?${searchParams}`
        : `${this.baseUrl}/rest/api/2/search?${searchParams}`;

    this.logger.info("Fetching issues from Jira", {
      endpoint,
      instanceType: this.instanceType,
      jql,
      filters: { includeCreatedByMe, includeAssignedToMe },
    });

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error("Jira API error", {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorBody: errorText,
      });
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as JiraSearchResponse;
    return data.issues;
  }

  /**
   * Format Jira issue title with smart formatting
   */
  private formatJiraTitle(issue: JiraIssue, options: TitleFormatOptions): string {
    const parts: string[] = [];
    const { fields } = issue;

    // Handle all options disabled - simple format
    const hasAnyOption =
      options.includeStatus ||
      options.includePriority ||
      options.includeCreator ||
      options.includeAge ||
      options.includeAssignee;

    if (!hasAnyOption) {
      // Format: "Summary [KEY-123]"
      return `${fields.summary} [${issue.key}]`;
    }

    // Issue key (always at start)
    parts.push(`[${issue.key}]`);

    // Priority indicator
    if (options.includePriority) {
      const priorityName = fields.priority.name.toLowerCase();

      if (options.includeEmojis) {
        // Map common Jira priorities to emojis
        if (priorityName.includes("highest") || priorityName.includes("blocker")) {
          parts.push("🔴"); // Highest/Blocker
        } else if (priorityName.includes("high")) {
          parts.push("🟠"); // High
        } else if (priorityName.includes("medium")) {
          parts.push("🟡"); // Medium
        } else if (priorityName.includes("low")) {
          parts.push("🟢"); // Low
        } else if (priorityName.includes("lowest")) {
          parts.push("🔵"); // Lowest
        }
      } else {
        // Text-only priority
        parts.push(`[${fields.priority.name.toUpperCase()}]`);
      }
    }

    // Issue type indicator (status)
    if (options.includeStatus) {
      const typeName = fields.issuetype.name.toLowerCase();

      if (options.includeEmojis) {
        // Map common Jira issue types to emojis
        if (typeName.includes("bug") || typeName.includes("defect")) {
          parts.push("🐛"); // Bug
        } else if (typeName.includes("epic")) {
          parts.push("📚"); // Epic
        } else if (typeName.includes("story") || typeName.includes("user story")) {
          parts.push("📖"); // Story
        } else if (typeName.includes("task")) {
          parts.push("✅"); // Task
        } else if (typeName.includes("sub-task") || typeName.includes("subtask")) {
          parts.push("📝"); // Sub-task
        } else if (typeName.includes("improvement") || typeName.includes("enhancement")) {
          parts.push("⚡"); // Improvement
        } else if (typeName.includes("spike")) {
          parts.push("🔬"); // Spike/Research
        }
      } else {
        // Text-only type
        parts.push(`[${fields.issuetype.name.toUpperCase()}]`);
      }
    }

    // Assignee (with arrow if different from reporter)
    if (options.includeAssignee && fields.assignee) {
      const assigneeName = fields.assignee.displayName;
      const shortName = assigneeName.split(" ")[0];
      parts.push(`→@${shortName}`);
    } else if (options.includeAssignee && !fields.assignee) {
      parts.push("→@unassigned");
    }

    // Creator/Reporter (with colon separator)
    if (options.includeCreator && fields.reporter) {
      const reporterName = fields.reporter.displayName;
      const shortName = reporterName.split(" ")[0];
      parts.push(`@${shortName}:`);
    }

    // Age indicator (>7 days old)
    if (options.includeAge) {
      const createdAt = new Date(fields.created);
      const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      if (ageInDays > 7) {
        if (options.includeEmojis) {
          parts.push("⏰");
        }
      }

      if (!options.includeEmojis) {
        parts.push(`[${ageInDays}d]`);
      } else {
        parts.push(`${ageInDays}d`);
      }
    }

    // Issue summary (always included at end)
    parts.push(fields.summary);

    // Return space-separated parts
    return parts.join(" ");
  }

  /**
   * Format folder title with dynamic statistics
   */
  public async formatFolderTitle(baseName: string, items: BookmarkItem[]): Promise<string> {
    const config = await this.getConfig();
    const folderFormat = config.folderTitleFormat;

    // If folder title formatting is disabled, return base name as-is
    if (!folderFormat?.enabled) {
      return baseName;
    }

    // Handle empty state
    if (items.length === 0) {
      return `${baseName} (empty)`;
    }

    const parts: string[] = [];

    // Add total count (Jira doesn't have review count like GitHub)
    if (folderFormat.includeTotal) {
      parts.push(`${items.length} total`);
    }

    // Format: "Jira Work Items (24 total)" or just baseName if no parts
    if (parts.length > 0) {
      return `${baseName} (${parts.join(" • ")})`;
    }

    return baseName;
  }

  /**
   * Convert Jira issue to BookmarkItem
   */
  private async convertToBookmarkItem(issue: JiraIssue): Promise<BookmarkItem> {
    // Get title format config
    const config = await this.getConfig();
    const titleFormat = config.titleFormat || DEFAULT_TITLE_FORMAT;

    // Build issue URL
    const issueUrl = `${this.baseUrl}/browse/${issue.key}`;

    return {
      id: issue.id,
      providerId: this.metadata.id,
      title: this.formatJiraTitle(issue, titleFormat),
      url: issueUrl,
      createdAt: new Date(issue.fields.created).getTime(),
      updatedAt: new Date(issue.fields.updated).getTime(),
      lastModified: issue.fields.updated,
      metadata: {
        key: issue.key,
        status: issue.fields.status.name,
        statusCategory: issue.fields.status.statusCategory.key,
        priority: issue.fields.priority.name,
        priorityIcon: issue.fields.priority.iconUrl,
        issueType: issue.fields.issuetype.name,
        issueTypeIcon: issue.fields.issuetype.iconUrl,
        project: issue.fields.project.key,
        projectName: issue.fields.project.name,
        assignee: issue.fields.assignee?.displayName,
        assigneeAvatar: issue.fields.assignee?.avatarUrls["48x48"],
        reporter: issue.fields.reporter.displayName,
      },
    };
  }
}
