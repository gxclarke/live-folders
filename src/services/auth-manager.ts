/**
 * Authentication Manager
 * Handles OAuth 2.0 flows, token management, and authentication state
 */

import type {
	AuthError,
	AuthEvent,
	AuthState,
	AuthTokens,
	AuthUser,
	OAuthCodeResponse,
	OAuthConfig,
	OAuthTokenResponse,
} from "@/types";
import { AuthErrorType } from "@/types";
import browser from "@/utils/browser";
import { Logger } from "@/utils/logger";
import { storageManager } from "./storage";

/**
 * Authentication event listener
 */
type AuthEventListener = (event: AuthEvent) => void;

/**
 * Token refresh callback
 */
type TokenRefreshCallback = (providerId: string, tokens: AuthTokens) => Promise<void>;

/**
 * Authentication Manager
 * Centralized authentication handling for all providers
 */
export class AuthManager {
	private static instance: AuthManager;
	private logger: Logger;
	private eventListeners: Map<string, Set<AuthEventListener>>;
	private refreshCallbacks: Map<string, TokenRefreshCallback>;
	private refreshTimers: Map<string, number>;
	private oauthConfigs: Map<string, OAuthConfig>;

	private constructor() {
		this.logger = new Logger("AuthManager");
		this.eventListeners = new Map();
		this.refreshCallbacks = new Map();
		this.refreshTimers = new Map();
		this.oauthConfigs = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): AuthManager {
		if (!AuthManager.instance) {
			AuthManager.instance = new AuthManager();
		}
		return AuthManager.instance;
	}

	/**
	 * Initialize the auth manager
	 */
	public async initialize(): Promise<void> {
		this.logger.info("Initializing AuthManager");

		// Schedule token refreshes for all authenticated providers
		await this.scheduleAllTokenRefreshes();

		this.logger.info("AuthManager initialized");
	}

	/**
	 * Register OAuth configuration for a provider
	 */
	public registerOAuthConfig(providerId: string, config: OAuthConfig): void {
		this.logger.debug("Registering OAuth config", { providerId });
		this.oauthConfigs.set(providerId, config);
	}

	/**
	 * Register a token refresh callback for a provider
	 */
	public registerRefreshCallback(providerId: string, callback: TokenRefreshCallback): void {
		this.logger.debug("Registering refresh callback", { providerId });
		this.refreshCallbacks.set(providerId, callback);
	}

	/**
	 * Authenticate a provider using OAuth 2.0
	 */
	public async authenticate(providerId: string, user?: AuthUser): Promise<AuthState> {
		this.logger.info("Starting authentication", { providerId });

		const config = this.oauthConfigs.get(providerId);
		if (!config) {
			throw this.createError(
				AuthErrorType.INVALID_CONFIG,
				`No OAuth config for provider: ${providerId}`,
				providerId,
			);
		}

		try {
			// Generate CSRF state
			const state = this.generateState();

			// Build authorization URL
			const authUrl = this.buildAuthUrl(config, state);

			// Launch OAuth flow
			this.logger.debug("Launching OAuth flow", { providerId, authUrl });
			const redirectUrl = await browser.identity.launchWebAuthFlow({
				url: authUrl,
				interactive: true,
			});

			// Parse authorization code from redirect
			const codeResponse = this.parseAuthCodeResponse(redirectUrl, state);

			if (codeResponse.error) {
				throw this.createError(
					AuthErrorType.INVALID_CREDENTIALS,
					codeResponse.errorDescription || codeResponse.error,
					providerId,
				);
			}

			// Exchange code for tokens
			const tokens = await this.exchangeCodeForTokens(config, codeResponse.code);

			// Create auth state
			const authState: AuthState = {
				providerId,
				authenticated: true,
				tokens,
				user,
				lastAuth: Date.now(),
			};

			// Save auth state
			const result = await storageManager.saveAuth(providerId, authState);
			if (!result.success) {
				throw this.createError(
					AuthErrorType.UNKNOWN,
					result.error || "Failed to save auth state",
					providerId,
				);
			}

			// Schedule token refresh
			this.scheduleTokenRefresh(providerId, tokens);

			// Emit success event
			this.emitEvent({
				type: "auth_success",
				providerId,
				timestamp: Date.now(),
				data: { user },
			});

			this.logger.info("Authentication successful", { providerId });
			return authState;
		} catch (error) {
			this.logger.error("Authentication failed", { providerId, error }, error as Error);

			// Emit failure event
			this.emitEvent({
				type: "auth_failure",
				providerId,
				timestamp: Date.now(),
				data: { error },
			});

			if (this.isAuthError(error)) {
				throw error;
			}

			// Check if user cancelled
			if (error instanceof Error && error.message.includes("cancelled")) {
				throw this.createError(
					AuthErrorType.USER_CANCELLED,
					"User cancelled authentication",
					providerId,
				);
			}

			throw this.createError(AuthErrorType.UNKNOWN, "Authentication failed", providerId, error);
		}
	}

	/**
	 * Check if a provider is authenticated
	 */
	public async isAuthenticated(providerId: string): Promise<boolean> {
		const authState = await storageManager.getAuth(providerId);
		if (!authState || !authState.authenticated || !authState.tokens) {
			return false;
		}

		// Check if token is expired
		if (this.isTokenExpired(authState.tokens)) {
			this.logger.debug("Token expired", { providerId });
			return false;
		}

		return true;
	}

	/**
	 * Get access token for a provider
	 */
	public async getToken(providerId: string): Promise<string | null> {
		const authState = await storageManager.getAuth(providerId);
		if (!authState || !authState.tokens) {
			return null;
		}

		// Check if token needs refresh
		if (this.isTokenExpiringSoon(authState.tokens)) {
			this.logger.debug("Token expiring soon, refreshing", { providerId });
			await this.refreshToken(providerId);
			const updatedState = await storageManager.getAuth(providerId);
			return updatedState?.tokens?.accessToken || null;
		}

		return authState.tokens.accessToken;
	}

	/**
	 * Refresh access token
	 */
	public async refreshToken(providerId: string): Promise<AuthTokens> {
		this.logger.info("Refreshing token", { providerId });

		const authState = await storageManager.getAuth(providerId);
		if (!authState || !authState.tokens || !authState.tokens.refreshToken) {
			throw this.createError(
				AuthErrorType.REFRESH_FAILED,
				"No refresh token available",
				providerId,
			);
		}

		const config = this.oauthConfigs.get(providerId);
		if (!config) {
			throw this.createError(
				AuthErrorType.INVALID_CONFIG,
				`No OAuth config for provider: ${providerId}`,
				providerId,
			);
		}

		try {
			// Check if provider has custom refresh callback
			const refreshCallback = this.refreshCallbacks.get(providerId);
			let newTokens: AuthTokens;

			if (refreshCallback) {
				// Use provider's custom refresh logic
				this.logger.debug("Using custom refresh callback", { providerId });
				await refreshCallback(providerId, authState.tokens);
				const updatedState = await storageManager.getAuth(providerId);
				if (!updatedState?.tokens) {
					throw this.createError(
						AuthErrorType.REFRESH_FAILED,
						"Refresh callback failed",
						providerId,
					);
				}
				newTokens = updatedState.tokens;
			} else {
				// Use standard OAuth token refresh
				newTokens = await this.refreshOAuthToken(config, authState.tokens.refreshToken);

				// Update auth state with new tokens
				const updatedState: AuthState = {
					...authState,
					tokens: newTokens,
					lastRefresh: Date.now(),
				};

				const result = await storageManager.saveAuth(providerId, updatedState);
				if (!result.success) {
					throw this.createError(
						AuthErrorType.REFRESH_FAILED,
						result.error || "Failed to save tokens",
						providerId,
					);
				}
			}

			// Reschedule token refresh
			this.scheduleTokenRefresh(providerId, newTokens);

			// Emit refresh event
			this.emitEvent({
				type: "token_refresh",
				providerId,
				timestamp: Date.now(),
			});

			this.logger.info("Token refreshed successfully", { providerId });
			return newTokens;
		} catch (error) {
			this.logger.error("Token refresh failed", { providerId, error }, error as Error);

			if (this.isAuthError(error)) {
				throw error;
			}

			throw this.createError(
				AuthErrorType.REFRESH_FAILED,
				"Failed to refresh token",
				providerId,
				error,
			);
		}
	}

	/**
	 * Revoke authentication for a provider
	 */
	public async revokeAuth(providerId: string): Promise<void> {
		this.logger.info("Revoking authentication", { providerId });

		// Clear refresh timer
		this.clearTokenRefreshTimer(providerId);

		// Delete auth state
		const result = await storageManager.deleteAuth(providerId);
		if (!result.success) {
			throw this.createError(
				AuthErrorType.UNKNOWN,
				result.error || "Failed to delete auth",
				providerId,
			);
		}

		// Emit revoked event
		this.emitEvent({
			type: "auth_revoked",
			providerId,
			timestamp: Date.now(),
		});

		this.logger.info("Authentication revoked", { providerId });
	}

	/**
	 * Get authentication state for a provider
	 */
	public async getAuthState(providerId: string): Promise<AuthState | null> {
		return storageManager.getAuth(providerId);
	}

	/**
	 * Add event listener
	 */
	public addEventListener(providerId: string, listener: AuthEventListener): void {
		if (!this.eventListeners.has(providerId)) {
			this.eventListeners.set(providerId, new Set());
		}
		this.eventListeners.get(providerId)?.add(listener);
	}

	/**
	 * Remove event listener
	 */
	public removeEventListener(providerId: string, listener: AuthEventListener): void {
		this.eventListeners.get(providerId)?.delete(listener);
	}

	/**
	 * Build OAuth authorization URL
	 */
	private buildAuthUrl(config: OAuthConfig, state: string): string {
		const params = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: "code",
			scope: config.scopes.join(" "),
			state,
			...config.additionalParams,
		});

		return `${config.authUrl}?${params.toString()}`;
	}

	/**
	 * Parse authorization code from redirect URL
	 */
	private parseAuthCodeResponse(redirectUrl: string, expectedState: string): OAuthCodeResponse {
		const url = new URL(redirectUrl);
		const params = new URLSearchParams(url.search);

		const code = params.get("code") || "";
		const state = params.get("state") || "";
		const error = params.get("error") || undefined;
		const errorDescription = params.get("error_description") || undefined;

		// Verify state to prevent CSRF
		if (state !== expectedState) {
			throw new Error("Invalid state parameter - possible CSRF attack");
		}

		return {
			code,
			state,
			error,
			errorDescription,
		};
	}

	/**
	 * Exchange authorization code for tokens
	 */
	private async exchangeCodeForTokens(config: OAuthConfig, code: string): Promise<AuthTokens> {
		const params = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: config.redirectUri,
			client_id: config.clientId,
		});

		if (config.clientSecret) {
			params.append("client_secret", config.clientSecret);
		}

		const response = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Token exchange failed: ${response.statusText}`);
		}

		const data: OAuthTokenResponse = await response.json();

		return this.parseTokenResponse(data);
	}

	/**
	 * Refresh OAuth token
	 */
	private async refreshOAuthToken(config: OAuthConfig, refreshToken: string): Promise<AuthTokens> {
		const params = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: config.clientId,
		});

		if (config.clientSecret) {
			params.append("client_secret", config.clientSecret);
		}

		const response = await fetch(config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Token refresh failed: ${response.statusText}`);
		}

		const data: OAuthTokenResponse = await response.json();

		return this.parseTokenResponse(data, refreshToken);
	}

	/**
	 * Parse token response
	 */
	private parseTokenResponse(data: OAuthTokenResponse, existingRefreshToken?: string): AuthTokens {
		const expiresIn = data.expires_in || 3600; // Default to 1 hour
		const expiresAt = Date.now() + expiresIn * 1000;

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || existingRefreshToken,
			tokenType: data.token_type,
			expiresAt,
			scopes: data.scope ? data.scope.split(" ") : undefined,
		};
	}

	/**
	 * Check if token is expired
	 */
	private isTokenExpired(tokens: AuthTokens): boolean {
		return Date.now() >= tokens.expiresAt;
	}

	/**
	 * Check if token is expiring soon (within 5 minutes)
	 */
	private isTokenExpiringSoon(tokens: AuthTokens): boolean {
		const fiveMinutes = 5 * 60 * 1000;
		return Date.now() >= tokens.expiresAt - fiveMinutes;
	}

	/**
	 * Schedule token refresh
	 */
	private scheduleTokenRefresh(providerId: string, tokens: AuthTokens): void {
		// Clear existing timer
		this.clearTokenRefreshTimer(providerId);

		// Calculate when to refresh (5 minutes before expiry)
		const fiveMinutes = 5 * 60 * 1000;
		const refreshAt = tokens.expiresAt - fiveMinutes;
		const delay = Math.max(0, refreshAt - Date.now());

		this.logger.debug("Scheduling token refresh", {
			providerId,
			refreshAt: new Date(refreshAt).toISOString(),
			delay,
		});

		const timerId = window.setTimeout(() => {
			this.refreshToken(providerId).catch((error) => {
				this.logger.error("Scheduled token refresh failed", { providerId, error }, error);
			});
		}, delay);

		this.refreshTimers.set(providerId, timerId);
	}

	/**
	 * Schedule token refreshes for all authenticated providers
	 */
	private async scheduleAllTokenRefreshes(): Promise<void> {
		const providers = await storageManager.getProviders();

		for (const [providerId, providerData] of Object.entries(providers)) {
			if (!providerData.config?.enabled) {
				continue;
			}

			const authState = await storageManager.getAuth(providerId);
			if (authState?.authenticated && authState.tokens) {
				this.scheduleTokenRefresh(providerId, authState.tokens);
			}
		}
	}

	/**
	 * Clear token refresh timer
	 */
	private clearTokenRefreshTimer(providerId: string): void {
		const timerId = this.refreshTimers.get(providerId);
		if (timerId !== undefined) {
			window.clearTimeout(timerId);
			this.refreshTimers.delete(providerId);
		}
	}

	/**
	 * Emit authentication event
	 */
	private emitEvent(event: AuthEvent): void {
		const listeners = this.eventListeners.get(event.providerId);
		if (listeners) {
			for (const listener of listeners) {
				try {
					listener(event);
				} catch (error) {
					this.logger.error("Event listener error", { event, error }, error as Error);
				}
			}
		}
	}

	/**
	 * Generate random state for CSRF protection
	 */
	private generateState(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
	}

	/**
	 * Create authentication error
	 */
	private createError(
		type: AuthErrorType,
		message: string,
		providerId: string,
		details?: unknown,
	): AuthError {
		return {
			type,
			message,
			providerId,
			details,
		};
	}

	/**
	 * Check if error is an AuthError
	 */
	private isAuthError(error: unknown): error is AuthError {
		return (
			typeof error === "object" &&
			error !== null &&
			"type" in error &&
			"message" in error &&
			"providerId" in error
		);
	}
}

/**
 * Export singleton instance
 */
export const authManager = AuthManager.getInstance();
