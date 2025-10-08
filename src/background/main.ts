/**
 * Background Service Worker
 *
 * Main entry point for the extension's background service worker.
 * Handles extension lifecycle events and initializes background services.
 */

import { ProviderRegistry } from "../services/provider-registry";
import { Logger } from "../utils/logger";
import { BackgroundScheduler } from "./scheduler";

const logger = new Logger("Background");

/**
 * Initialize background services
 */
async function initializeBackgroundServices(): Promise<void> {
	try {
		logger.info("Initializing background services");

		// Initialize provider registry first (registers and initializes all providers)
		const registry = ProviderRegistry.getInstance();
		await registry.initialize();

		// Initialize scheduler
		const scheduler = BackgroundScheduler.getInstance();
		await scheduler.initialize();

		logger.info("Background services initialized successfully");
	} catch (error) {
		logger.error("Failed to initialize background services", error as Error);
	}
}

/**
 * Extension install handler
 */
chrome.runtime.onInstalled.addListener((details) => {
	logger.info("Extension installed", { reason: details.reason });

	if (details.reason === "install") {
		// First time installation
		logger.info("First time installation detected");
		// Could show welcome page or onboarding
	} else if (details.reason === "update") {
		// Extension updated
		logger.info("Extension updated", {
			previousVersion: details.previousVersion,
		});
		// Could show update notes or migration logic
	}

	// Initialize background services
	void initializeBackgroundServices();
});

/**
 * Extension startup handler
 */
chrome.runtime.onStartup.addListener(() => {
	logger.info("Extension started");

	// Initialize background services
	void initializeBackgroundServices();
});

/**
 * Message handler for manual sync triggers from popup/sidepanel
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	logger.debug("Message received", { message, sender });

	if (message.type === "SYNC_ALL") {
		// Trigger sync for all providers
		const scheduler = BackgroundScheduler.getInstance();
		scheduler
			.syncAll()
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				logger.error("Manual sync all failed", error as Error);
				sendResponse({ success: false, error: (error as Error).message });
			});

		// Return true to indicate async response
		return true;
	}

	if (message.type === "SYNC_PROVIDER") {
		// Trigger sync for specific provider
		const { providerId } = message;
		const scheduler = BackgroundScheduler.getInstance();
		scheduler
			.syncProvider(providerId)
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				logger.error(`Manual sync failed for ${providerId}`, error as Error);
				sendResponse({ success: false, error: (error as Error).message });
			});

		// Return true to indicate async response
		return true;
	}

	if (message.type === "GET_SYNC_STATUS") {
		// Get current sync status
		const scheduler = BackgroundScheduler.getInstance();
		scheduler
			.getStatus()
			.then((status) => {
				sendResponse({ success: true, status });
			})
			.catch((error) => {
				logger.error("Get sync status failed", error as Error);
				sendResponse({ success: false, error: (error as Error).message });
			});

		// Return true to indicate async response
		return true;
	}

	if (message.type === "UPDATE_SYNC_INTERVAL") {
		// Update sync interval
		const { interval } = message;
		const scheduler = BackgroundScheduler.getInstance();
		scheduler
			.updateSyncInterval(interval)
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				logger.error("Update sync interval failed", error as Error);
				sendResponse({ success: false, error: (error as Error).message });
			});

		// Return true to indicate async response
		return true;
	}

	// Unknown message type
	return false;
});

logger.info("Background service worker loaded");
