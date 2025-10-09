/**
 * GitHub Provider
 * Implements OAuth authentication and PR fetching from GitHub API
 */

import { authManager } from "@/services/auth-manager";
import { storageManager } from "@/services/storage";
import type {
	AuthResult,
	AuthState,
	BookmarkItem,
	Provider,
	ProviderConfig,
	ProviderMetadata,
} from "@/types";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";

/**
 * GitHub user response
 */
interface GitHubUser {
	id: number;
	login: string;
	name: string | null;
	email: string | null;
	avatar_url: string;
	company: string | null;
	location: string | null;
	bio: string | null;
}

/**
 * GitHub API PR response
 */
interface GitHubPR {
	id: number;
	node_id: string;
	number: number;
	title: string;
	html_url: string;
	state: string;
	created_at: string;
	updated_at: string;
	user: {
		login: string;
		avatar_url: string;
	};
	repository_url: string;
}

/**
 * GitHub API search response
 */
interface GitHubSearchResponse {
	total_count: number;
	incomplete_results: boolean;
	items: GitHubPR[];
}

/**
 * GitHub Provider Implementation
 */
export class GitHubProvider implements Provider {
	public readonly metadata: ProviderMetadata = {
		id: "github",
		name: "GitHub",
		description: "Sync pull requests from GitHub repositories",
		icon: "https://github.com/favicon.ico",
		version: "1.0.0",
	};

	private logger: Logger;
	private readonly PROVIDER_ID = "github";

	// OAuth Configuration
	private readonly OAUTH_CONFIG = {
		authUrl: "https://github.com/login/oauth/authorize",
		tokenUrl: "https://github.com/login/oauth/access_token",
		clientId: "", // Will be set from settings/environment
		redirectUri: browser.identity.getRedirectURL("github"),
		scopes: ["repo", "read:user", "read:org"],
	};

	constructor() {
		this.logger = new Logger("GitHubProvider");
	}

	/**
	 * Initialize the provider
	 */
	public async initialize(): Promise<void> {
		this.logger.info("Initializing GitHub provider");

		// Ensure provider storage exists with default config
		const existingData = await storageManager.getProvider(this.PROVIDER_ID);

		if (!existingData) {
			await storageManager.saveProvider(this.PROVIDER_ID, {
				config: {
					enabled: false,
				},
			});
		}

		// TODO: Get client ID from settings/environment
		// For now, this needs to be configured separately

		// Register OAuth config with AuthManager
		authManager.registerOAuthConfig(this.PROVIDER_ID, this.OAUTH_CONFIG);

		this.logger.info("GitHub provider initialized");
	}

	/**
	 * Authenticate with GitHub
	 */
	public async authenticate(): Promise<AuthResult> {
		this.logger.info("Starting GitHub authentication");

		try {
			// Check if we have a Personal Access Token configured
			const config = await this.getConfig();
			// Access personalAccessToken from config (stored as custom field)
			const pat = (config as unknown as { personalAccessToken?: string }).personalAccessToken;

			if (pat) {
				this.logger.info("Using Personal Access Token authentication");
				return await this.authenticateWithPAT(pat);
			}

			// Fall back to OAuth flow
			this.logger.info("Using OAuth flow");

			// Delegate to AuthManager
			const authState = await authManager.authenticate(this.PROVIDER_ID);

			if (!authState.tokens) {
				throw new Error("No tokens received from authentication");
			}

			// Fetch user information
			const user = await this.fetchUserInfo(authState.tokens.accessToken);

			// Update auth state with user info
			const updatedAuthState = {
				...authState,
				user: {
					id: user.id.toString(),
					username: user.login,
					displayName: user.name || user.login,
					email: user.email || undefined,
					avatarUrl: user.avatar_url,
					metadata: {
						company: user.company || undefined,
						location: user.location || undefined,
						bio: user.bio || undefined,
					},
				},
			};

			await storageManager.saveAuth(this.PROVIDER_ID, updatedAuthState);

			return {
				success: true,
				accessToken: authState.tokens.accessToken,
				refreshToken: authState.tokens.refreshToken,
				expiresAt: authState.tokens.expiresAt,
				user: updatedAuthState.user,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Authentication failed";
			this.logger.error("GitHub authentication failed", {
				errorMessage,
				errorType: error instanceof Error ? error.constructor.name : typeof error,
			});
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Authenticate using Personal Access Token
	 */
	private async authenticateWithPAT(token: string): Promise<AuthResult> {
		try {
			// Fetch user information to validate token
			const user = await this.fetchUserInfo(token);

			// Create auth state
			const authState: AuthState = {
				providerId: this.PROVIDER_ID,
				authenticated: true,
				tokens: {
					accessToken: token,
					tokenType: "Bearer",
					// PATs don't expire, but set a far future date
					expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
				},
				user: {
					id: user.id.toString(),
					username: user.login,
					displayName: user.name || user.login,
					email: user.email || undefined,
					avatarUrl: user.avatar_url,
					metadata: {
						company: user.company || undefined,
						location: user.location || undefined,
						bio: user.bio || undefined,
					},
				},
				lastAuth: Date.now(),
			};

			// Save auth state
			await storageManager.saveAuth(this.PROVIDER_ID, authState);

			this.logger.info("PAT authentication successful");

			return {
				success: true,
				accessToken: token,
				user: authState.user,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "PAT authentication failed";
			this.logger.error("PAT authentication failed", { errorMessage });
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Check if authenticated
	 */
	public async isAuthenticated(): Promise<boolean> {
		return authManager.isAuthenticated(this.PROVIDER_ID);
	}

	/**
	 * Get access token
	 */
	public async getToken(): Promise<string | null> {
		return authManager.getToken(this.PROVIDER_ID);
	}

	/**
	 * Refresh access token
	 */
	public async refreshToken(): Promise<void> {
		await authManager.refreshToken(this.PROVIDER_ID);
	}

	/**
	 * Revoke authentication
	 */
	public async revokeAuth(): Promise<void> {
		await authManager.revokeAuth(this.PROVIDER_ID);
	}

	/**
	 * Fetch pull requests from GitHub
	 */
	public async fetchItems(): Promise<BookmarkItem[]> {
		this.logger.info("Fetching GitHub pull requests");

		const token = await this.getToken();
		if (!token) {
			throw new Error("Not authenticated");
		}

		try {
			const [authoredPRs, reviewPRs] = await Promise.all([
				this.fetchAuthoredPRs(token),
				this.fetchReviewRequestedPRs(token),
			]);

			// Combine and deduplicate
			const allPRs = [...authoredPRs, ...reviewPRs];
			const uniquePRs = this.deduplicatePRs(allPRs);

			// Convert to BookmarkItems
			const items = uniquePRs.map((pr) => this.prToBookmarkItem(pr));

			this.logger.info("Fetched pull requests", { count: items.length });
			return items;
		} catch (error) {
			this.logger.error("Failed to fetch pull requests", { error }, error as Error);
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
	public async setConfig(config: Partial<ProviderConfig>): Promise<void> {
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
		this.logger.info("Disposing GitHub provider");
		// No specific cleanup needed for GitHub provider
	}

	/**
	 * Fetch user information from GitHub
	 */
	private async fetchUserInfo(token: string): Promise<GitHubUser> {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch user info: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Fetch PRs authored by the user
	 */
	private async fetchAuthoredPRs(token: string): Promise<GitHubPR[]> {
		const authState = await storageManager.getAuth(this.PROVIDER_ID);
		const username = authState?.user?.username;

		if (!username) {
			throw new Error("Username not available");
		}

		const query = `is:pr author:${username} is:open`;
		return this.searchPRs(token, query);
	}

	/**
	 * Fetch PRs where user is requested for review
	 */
	private async fetchReviewRequestedPRs(token: string): Promise<GitHubPR[]> {
		const authState = await storageManager.getAuth(this.PROVIDER_ID);
		const username = authState?.user?.username;

		if (!username) {
			throw new Error("Username not available");
		}

		const query = `is:pr review-requested:${username} is:open`;
		return this.searchPRs(token, query);
	}

	/**
	 * Search for PRs using GitHub API
	 */
	private async searchPRs(token: string, query: string): Promise<GitHubPR[]> {
		const url = new URL("https://api.github.com/search/issues");
		url.searchParams.set("q", query);
		url.searchParams.set("sort", "updated");
		url.searchParams.set("order", "desc");
		url.searchParams.set("per_page", "100");

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.statusText}`);
		}

		const data: GitHubSearchResponse = await response.json();
		return data.items;
	}

	/**
	 * Deduplicate PRs by node_id
	 */
	private deduplicatePRs(prs: GitHubPR[]): GitHubPR[] {
		const seen = new Set<string>();
		const unique: GitHubPR[] = [];

		for (const pr of prs) {
			if (!seen.has(pr.node_id)) {
				seen.add(pr.node_id);
				unique.push(pr);
			}
		}

		return unique;
	}

	/**
	 * Convert GitHub PR to BookmarkItem
	 */
	private prToBookmarkItem(pr: GitHubPR): BookmarkItem {
		// Extract repo name from repository_url
		const repoMatch = pr.repository_url.match(/repos\/(.+)$/);
		const repoName = repoMatch ? repoMatch[1] : "unknown";

		return {
			id: pr.node_id,
			providerId: this.metadata.id,
			title: `#${pr.number}: ${pr.title}`,
			url: pr.html_url,
			createdAt: new Date(pr.created_at).getTime(),
			updatedAt: new Date(pr.updated_at).getTime(),
			lastModified: pr.updated_at,
			metadata: {
				number: pr.number,
				state: pr.state,
				author: pr.user.login,
				authorAvatar: pr.user.avatar_url,
				repository: repoName,
			},
		};
	}
}

/**
 * Export singleton instance
 */
export const githubProvider = new GitHubProvider();
