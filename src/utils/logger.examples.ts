/**
 * Logger Usage Examples
 * Demonstrates how to use the logger utility
 */

import { createLogger, Logger, logger } from "./logger";

/**
 * Example 1: Basic logging
 */
export async function basicLoggingExample(): Promise<void> {
	// Use global logger
	logger.info("Application started");
	logger.debug("Debug information", { version: "1.0.0" });
	logger.warn("This is a warning");
	logger.error("An error occurred", new Error("Something went wrong"));
}

/**
 * Example 2: Category-specific loggers
 */
export async function categoryLoggersExample(): Promise<void> {
	// Create loggers for different parts of the application
	const authLogger = createLogger("Auth");
	const syncLogger = createLogger("Sync");
	const storageLogger = createLogger("Storage");

	authLogger.info("User logged in", { userId: "user123" });
	syncLogger.debug("Starting sync", { folderId: "folder456" });
	storageLogger.warn("Storage quota at 80%", { used: 8192, total: 10240 });
}

/**
 * Example 3: Child loggers
 */
export async function childLoggersExample(): Promise<void> {
	const providerLogger = createLogger("Provider");

	// Create child loggers for specific providers
	const githubLogger = providerLogger.child("GitHub");
	const jiraLogger = providerLogger.child("Jira");

	githubLogger.info("Fetching PRs", { repo: "owner/repo" });
	jiraLogger.debug("Query JQL", { jql: "project = PROJ" });
}

/**
 * Example 4: Sensitive data protection
 */
export async function sensitiveDataExample(): Promise<void> {
	const authLogger = createLogger("Auth");

	// These will be automatically redacted (unless debug mode is on)
	authLogger.info("Authentication successful", {
		userId: "user123",
		accessToken: "secret-token-123",
		refreshToken: "secret-refresh-456",
		apiKey: "api-key-789",
	});

	// Output: { userId: "user123", accessToken: "[REDACTED]", refreshToken: "[REDACTED]", apiKey: "[REDACTED]" }
}

/**
 * Example 5: Debug mode
 */
export async function debugModeExample(): Promise<void> {
	const testLogger = createLogger("Test");

	// Initially debug logs won't show (unless debugMode is enabled in settings)
	testLogger.debug("This might not be visible");

	// Enable debug mode
	Logger.setDebugMode(true);
	testLogger.debug("Now this is visible");

	// Disable debug mode
	Logger.setDebugMode(false);
	testLogger.debug("This is hidden again");
}

/**
 * Example 6: Grouped logging
 */
export async function groupedLoggingExample(): Promise<void> {
	const syncLogger = createLogger("Sync");

	syncLogger.group("Syncing GitHub folder", () => {
		syncLogger.info("Fetching remote items");
		syncLogger.debug("API request sent", { url: "/api/prs" });
		syncLogger.info("Comparing with local bookmarks");
		syncLogger.info("Sync completed", { added: 3, updated: 1, deleted: 0 });
	});
}

/**
 * Example 7: Timing operations
 */
export async function timingExample(): Promise<void> {
	const perfLogger = createLogger("Performance");

	// Time a synchronous operation
	const result1 = await perfLogger.time("Load bookmarks", () => {
		// Simulate work
		const data = Array.from({ length: 1000 }, (_, i) => i);
		return data.length;
	});

	console.log("Loaded", result1, "bookmarks");

	// Time an async operation
	const result2 = await perfLogger.time("Fetch from API", async () => {
		// Simulate async work
		await new Promise((resolve) => setTimeout(resolve, 100));
		return { items: 42 };
	});

	console.log("Fetched", result2.items, "items");
}

/**
 * Example 8: Error logging with context
 */
export async function errorLoggingExample(): Promise<void> {
	const apiLogger = createLogger("API");

	try {
		// Simulate an API call that fails
		throw new Error("Network timeout");
	} catch (error) {
		apiLogger.error("Failed to fetch data from API", error, {
			endpoint: "/api/items",
			retries: 3,
			timeout: 5000,
		});
	}
}

/**
 * Example 9: Real-world scenario - Provider sync
 */
export async function providerSyncExample(): Promise<void> {
	const syncLogger = createLogger("Sync:GitHub");

	await syncLogger.time("Full sync operation", async () => {
		syncLogger.info("Starting GitHub sync", { folderId: "github-prs" });

		syncLogger.group("Authentication", () => {
			syncLogger.debug("Checking auth status");
			syncLogger.info("Token is valid", { expiresIn: 3600 });
		});

		syncLogger.group("Fetching data", () => {
			syncLogger.debug("Building GraphQL query");
			syncLogger.info("Querying GitHub API", {
				query: "is:pr is:open author:@me",
			});
		});

		syncLogger.group("Processing results", () => {
			syncLogger.info("Received 15 pull requests");
			syncLogger.debug("Converting to bookmark format");
			syncLogger.info("Created 15 bookmarks");
		});

		syncLogger.group("Updating browser", () => {
			syncLogger.debug("Calculating diff");
			syncLogger.info("Applying changes", { added: 3, updated: 2, deleted: 1 });
		});

		syncLogger.info("Sync completed successfully");
	});
}

/**
 * Example 10: Initialize logger from settings
 */
export async function initializeExample(): Promise<void> {
	// Initialize logger with settings from storage
	await Logger.initialize();

	// Now logger will use debug mode setting from storage
	const appLogger = createLogger("App");
	appLogger.debug("This respects the debugMode setting");
}
