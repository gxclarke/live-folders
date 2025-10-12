/**
 * Background Scheduler
 *
 * Manages periodic synchronization of provider items using browser.alarms API.
 * Runs in the background service worker and triggers sync operations at
 * configurable intervals.
 *
 * Features:
 * - Periodic sync scheduling with browser.alarms
 * - Manual sync triggers from popup/sidepanel
 * - Per-provider sync control
 * - Configurable sync intervals via extension settings
 * - Extension lifecycle hooks (install, startup)
 * - Error handling and retry logic
 */

import { StorageManager } from "../services/storage";
import { SyncEngine } from "../services/sync-engine";
import { Logger } from "../utils/logger";

const logger = new Logger("BackgroundScheduler");

/**
 * Alarm names for different sync types
 */
const ALARM_NAMES = {
  PERIODIC_SYNC: "periodic-sync",
  RETRY_SYNC: "retry-sync",
} as const;

/**
 * Retry configuration constants
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MINUTES = 5;

/**
 * Background Scheduler
 *
 * Singleton service that manages periodic synchronization of provider items.
 * Uses browser.alarms API for reliable background task scheduling.
 */
export class BackgroundScheduler {
  private static instance: BackgroundScheduler | null = null;

  private syncEngine: SyncEngine;
  private storage: StorageManager;
  private isInitialized = false;
  private syncInProgress = false;
  private retryCount = new Map<string, number>();

  private constructor() {
    this.syncEngine = SyncEngine.getInstance();
    this.storage = StorageManager.getInstance();
    logger.debug("Instance created");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BackgroundScheduler {
    if (!BackgroundScheduler.instance) {
      BackgroundScheduler.instance = new BackgroundScheduler();
    }
    return BackgroundScheduler.instance;
  }

  /**
   * Initialize the scheduler
   *
   * Sets up alarm listeners and schedules initial sync if configured.
   * Should be called when the background service worker starts.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn("Already initialized");
      return;
    }

    try {
      logger.info("Initializing scheduler");

      // Set up alarm listener
      this.setupAlarmListener();

      // Schedule periodic sync
      await this.schedulePeriodicSync();

      // Sync on startup
      logger.info("Triggering startup sync");
      // Don't await - let it run in background
      void this.syncAll().catch((error) => {
        logger.error("Startup sync failed", error as Error);
      });

      this.isInitialized = true;
      logger.info("Scheduler initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize", error as Error);
      throw error;
    }
  }

  /**
   * Get sync interval from settings (convert milliseconds to minutes)
   */
  private async getSyncIntervalMinutes(): Promise<number> {
    const settings = await this.storage.getSettings();
    return Math.max(1, Math.floor(settings.syncInterval / 60000)); // Convert ms to minutes, minimum 1
  }

  /**
   * Set up alarm listener
   */
  private setupAlarmListener(): void {
    chrome.alarms.onAlarm.addListener((alarm) => {
      logger.debug("Alarm triggered", {
        name: alarm.name,
      });

      if (alarm.name === ALARM_NAMES.PERIODIC_SYNC) {
        void this.syncAll().catch((error) => {
          logger.error("Periodic sync failed", error as Error);
        });
      } else if (alarm.name.startsWith(ALARM_NAMES.RETRY_SYNC)) {
        const providerId = alarm.name.replace(`${ALARM_NAMES.RETRY_SYNC}-`, "");
        void this.syncProvider(providerId).catch((error) => {
          logger.error(
            "BackgroundScheduler",
            `Retry sync failed for ${providerId}`,
            error as Error,
          );
        });
      }
    });

    logger.debug("Alarm listener registered");
  }

  /**
   * Schedule periodic sync alarm
   */
  private async schedulePeriodicSync(): Promise<void> {
    // Clear existing alarm
    await chrome.alarms.clear(ALARM_NAMES.PERIODIC_SYNC);

    // Get sync interval from settings
    const intervalMinutes = await this.getSyncIntervalMinutes();

    // Create new alarm
    await chrome.alarms.create(ALARM_NAMES.PERIODIC_SYNC, {
      periodInMinutes: intervalMinutes,
    });

    logger.info("Periodic sync scheduled", {
      intervalMinutes,
    });
  }

  /**
   * Schedule a retry sync for a specific provider
   */
  private async scheduleRetrySyncProvider(providerId: string): Promise<void> {
    const alarmName = `${ALARM_NAMES.RETRY_SYNC}-${providerId}`;

    await chrome.alarms.create(alarmName, {
      delayInMinutes: RETRY_DELAY_MINUTES,
    });

    logger.info("Retry sync scheduled", {
      providerId,
      delayMinutes: RETRY_DELAY_MINUTES,
    });
  }

  /**
   * Sync all providers
   *
   * Triggers sync for all registered providers (only enabled ones).
   * Runs syncs in parallel for better performance.
   */
  public async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      logger.warn("Sync already in progress, skipping");
      return;
    }

    this.syncInProgress = true;
    logger.info("Starting sync for all providers");

    try {
      // Get all provider configs
      const providersRecord = await this.storage.getProviders();
      const providers = Object.entries(providersRecord);

      // Filter to only enabled providers with folders configured
      const providersToSync = providers.filter(([, data]) => data.config.enabled && data.folderId);

      if (providersToSync.length === 0) {
        logger.info("No providers to sync (none enabled or configured)");
        return;
      }

      logger.info(`Syncing ${providersToSync.length} providers`);

      // Sync all providers in parallel
      const results = await Promise.allSettled(
        providersToSync.map(([providerId]) => this.syncProvider(providerId)),
      );

      // Log results
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      logger.info("Sync completed", {
        total: providersToSync.length,
        successful,
        failed,
      });
    } catch (error) {
      logger.error("Sync all failed", error as Error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a specific provider
   *
   * Triggers sync for a single provider with retry logic.
   */
  public async syncProvider(providerId: string): Promise<void> {
    try {
      logger.info(`Syncing provider: ${providerId}`);

      // Perform sync
      const result = await this.syncEngine.syncProvider(providerId);

      // Reset retry count on success
      this.retryCount.delete(providerId);

      logger.info(`Provider synced: ${providerId}`, {
        result,
      });
    } catch (error) {
      logger.error(`Provider sync failed: ${providerId}`, error as Error);

      // Handle retries
      await this.handleSyncFailure(providerId, error as Error);
      throw error;
    }
  }

  /**
   * Handle sync failure with retry logic
   */
  private async handleSyncFailure(providerId: string, error: Error): Promise<void> {
    const retries = this.retryCount.get(providerId) ?? 0;

    if (retries < MAX_RETRIES) {
      // Increment retry count
      this.retryCount.set(providerId, retries + 1);

      // Schedule retry
      await this.scheduleRetrySyncProvider(providerId);

      logger.info(`Scheduled retry for ${providerId}`, {
        attempt: retries + 1,
        maxRetries: MAX_RETRIES,
      });
    } else {
      // Max retries reached
      this.retryCount.delete(providerId);

      logger.error(`Max retries reached for ${providerId}`, error);

      // TODO: Notify user of sync failure
      // This could be done via browser notifications or badge
    }
  }

  /**
   * Cancel all scheduled syncs
   */
  public async cancelAll(): Promise<void> {
    await chrome.alarms.clearAll();
    this.retryCount.clear();
    logger.info("All scheduled syncs cancelled");
  }

  /**
   * Get status of scheduled syncs
   */
  public async getStatus(): Promise<{
    periodicSync: chrome.alarms.Alarm | undefined;
    retrySyncs: chrome.alarms.Alarm[];
    syncInProgress: boolean;
  }> {
    const allAlarms = await chrome.alarms.getAll();

    const periodicSync = allAlarms.find((a) => a.name === ALARM_NAMES.PERIODIC_SYNC);
    const retrySyncs = allAlarms.filter((a) => a.name.startsWith(ALARM_NAMES.RETRY_SYNC));

    return {
      periodicSync,
      retrySyncs,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Update sync interval
   *
   * Reschedules the periodic sync with a new interval.
   * Called when user changes sync settings.
   */
  public async updateSyncInterval(intervalMs: number): Promise<void> {
    logger.info("Updating sync interval", { intervalMs });

    // Update settings
    await this.storage.saveSettings({ syncInterval: intervalMs });

    // Reschedule periodic sync with new interval
    await this.schedulePeriodicSync();

    logger.info("Sync interval updated successfully");
  }

  /**
   * Dispose the scheduler
   */
  public async dispose(): Promise<void> {
    await this.cancelAll();
    this.isInitialized = false;
    logger.info("Scheduler disposed");
  }
}

// Export singleton instance getter
export const getScheduler = (): BackgroundScheduler => BackgroundScheduler.getInstance();
