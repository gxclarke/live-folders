/**
 * Authentication Types
 * Types for OAuth and authentication management
 */

/**
 * OAuth 2.0 configuration
 */
export interface OAuthConfig {
  /** Authorization endpoint URL */
  authUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** Client ID */
  clientId: string;
  /** Client secret (if using confidential client) */
  clientSecret?: string;
  /** Redirect URI */
  redirectUri: string;
  /** Required scopes */
  scopes: string[];
  /** Additional parameters for auth request */
  additionalParams?: Record<string, string>;
}

/**
 * Stored authentication tokens
 */
export interface AuthTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token (if available) */
  refreshToken?: string;
  /** Token type (usually 'Bearer') */
  tokenType: string;
  /** Expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
  /** Scopes granted */
  scopes?: string[];
}

/**
 * Authentication state for a provider
 */
export interface AuthState {
  /** Provider ID */
  providerId: string;
  /** Whether authenticated */
  authenticated: boolean;
  /** Stored tokens */
  tokens?: AuthTokens;
  /** User information */
  user?: AuthUser;
  /** Last authentication timestamp */
  lastAuth?: number;
  /** Last token refresh timestamp */
  lastRefresh?: number;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  /** User ID */
  id: string;
  /** Username */
  username: string;
  /** Display name */
  displayName?: string;
  /** Email address */
  email?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Additional user properties */
  metadata?: Record<string, unknown>;
}

/**
 * OAuth authorization code response
 */
export interface OAuthCodeResponse {
  /** Authorization code */
  code: string;
  /** State parameter (for CSRF protection) */
  state: string;
  /** Optional error */
  error?: string;
  /** Error description */
  errorDescription?: string;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  /** Access token */
  access_token: string;
  /** Refresh token */
  refresh_token?: string;
  /** Token type */
  token_type: string;
  /** Expires in seconds */
  expires_in?: number;
  /** Granted scopes */
  scope?: string;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  /** User cancelled the authentication flow */
  USER_CANCELLED = "user_cancelled",
  /** Network error during authentication */
  NETWORK_ERROR = "network_error",
  /** Invalid credentials */
  INVALID_CREDENTIALS = "invalid_credentials",
  /** Token expired */
  TOKEN_EXPIRED = "token_expired",
  /** Token refresh failed */
  REFRESH_FAILED = "refresh_failed",
  /** Invalid OAuth configuration */
  INVALID_CONFIG = "invalid_config",
  /** Unknown error */
  UNKNOWN = "unknown",
}

/**
 * Authentication error
 */
export interface AuthError {
  /** Error type */
  type: AuthErrorType;
  /** Error message */
  message: string;
  /** Provider ID */
  providerId: string;
  /** Underlying error details */
  details?: unknown;
}

/**
 * Authentication event
 */
export interface AuthEvent {
  /** Event type */
  type: "auth_success" | "auth_failure" | "token_refresh" | "auth_revoked";
  /** Provider ID */
  providerId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event data */
  data?: unknown;
}
