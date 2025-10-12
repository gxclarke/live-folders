/**
 * Type Definitions Index
 * Central export point for all type definitions
 */

// Authentication types
export type {
  AuthError,
  AuthEvent,
  AuthState,
  AuthTokens,
  AuthUser,
  OAuthCodeResponse,
  OAuthConfig,
  OAuthTokenResponse,
} from "./auth";
export { AuthErrorType } from "./auth";
// Bookmark types
export type {
  BatchBookmarkResult,
  BookmarkFolder,
  BookmarkItem,
  BookmarkMetadata,
  BookmarkOperationResult,
  BookmarkRecord,
  BookmarkSyncDiff,
  BookmarkUpdateItem,
  ConflictResolution,
  ConflictStrategy,
} from "./bookmark";
// Provider types
export type {
  AuthResult,
  FolderTitleFormatOptions,
  Provider,
  ProviderConfig,
  ProviderFactory,
  ProviderMetadata,
  ProviderRegistryEntry,
  ProviderStatus,
  TitleFormatOptions,
  TitleFormatStyle,
  UserInfo,
} from "./provider";
export { DEFAULT_FOLDER_TITLE_FORMAT, DEFAULT_TITLE_FORMAT } from "./provider";

// Storage types
export type {
  BookmarkMetadataStorage,
  ExtensionSettings,
  Migration,
  MigrationFunction,
  ProviderStorageData,
  StorageArea,
  StorageChange,
  StorageChanges,
  StorageOperationResult,
  StorageSchema,
  StorageStats,
} from "./storage";

export { DEFAULT_SETTINGS, SCHEMA_VERSION, StorageKeys } from "./storage";
