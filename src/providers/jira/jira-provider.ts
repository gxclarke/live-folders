/**
 * Jira Provider
 * Implements multiple auth methods and issue fetching from Jira API
 * Supports both Jira Cloud and Jira Server/Data Center
 */

import { authManager } from "@/services/auth-manager";
import { storageManager } from "@/services/storage";
import type { AuthResult, BookmarkItem, Provider, ProviderConfig, ProviderMetadata } from "@/types";
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
		description: "Sync assigned issues and tasks from Jira",
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
		clientId: "", // Will be set from settings/environment
		redirectUri: browser.identity.getRedirectURL("jira"),
		scopes: ["read:jira-user", "read:jira-work", "offline_access"],
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

		// Register OAuth config with AuthManager (for OAuth flow)
		if (this.authType === "oauth") {
			authManager.registerOAuthConfig(this.PROVIDER_ID, this.OAUTH_CONFIG);
		}

		this.logger.info("Jira provider initialized", {
			baseUrl: this.baseUrl,
			authType: this.authType,
			instanceType: this.instanceType,
		});
	}

	/**
	 * Authenticate with Jira
	 */
	public async authenticate(): Promise<AuthResult> {
		this.logger.info("Authenticating with Jira", { authType: this.authType });

		try {
			if (this.authType === "oauth") {
				return await this.authenticateOAuth();
			}
			if (this.authType === "api-token") {
				return await this.authenticateApiToken();
			}
			if (this.authType === "basic") {
				return await this.authenticateBasic();
			}

			throw new Error(`Unsupported auth type: ${this.authType}`);
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

		// Verify credentials by fetching user info
		const token = btoa(`${config.username}:${config.apiToken}`);
		const user = await this.fetchUserInfo(token, "basic");

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
			const items = assignedIssues.map((issue) => this.convertToBookmarkItem(issue));

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

		return (
			providerData?.config || {
				enabled: false,
			}
		);
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

		const response = await fetch(endpoint, { headers });

		if (!response.ok) {
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

		// JQL query for assigned issues that are not done
		const jql =
			this.instanceType === "cloud"
				? `assignee = "${userIdentifier}" AND statusCategory != Done ORDER BY updated DESC`
				: `assignee = ${userIdentifier} AND statusCategory != Done ORDER BY updated DESC`;

		const searchParams = new URLSearchParams({
			jql,
			maxResults: "100",
			fields:
				"summary,status,priority,issuetype,project,assignee,reporter,created,updated,description",
		});

		// Different API versions for Cloud vs Server
		const endpoint =
			this.instanceType === "cloud"
				? `${this.baseUrl}/rest/api/3/search?${searchParams}`
				: `${this.baseUrl}/rest/api/2/search?${searchParams}`;

		const response = await fetch(endpoint, { headers });

		if (!response.ok) {
			throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
		}

		const data = (await response.json()) as JiraSearchResponse;
		return data.issues;
	}

	/**
	 * Convert Jira issue to BookmarkItem
	 */
	private convertToBookmarkItem(issue: JiraIssue): BookmarkItem {
		// Build issue URL
		const issueUrl = `${this.baseUrl}/browse/${issue.key}`;

		return {
			id: issue.id,
			providerId: this.metadata.id,
			title: `${issue.key}: ${issue.fields.summary}`,
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
