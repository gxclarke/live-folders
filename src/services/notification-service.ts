/**
 * Notification Service
 *
 * Enhanced notification system for the extension that provides
 * rich, contextual notifications about sync events, errors, and updates.
 */

import type { BookmarkItem } from "../types";
import browser from "../utils/browser";
import { Logger } from "../utils/logger";
import { storageManager } from "./storage";

const logger = new Logger("NotificationService");

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
}

/**
 * Notification types
 */
export enum NotificationType {
  SYNC_SUCCESS = "sync_success",
  SYNC_ERROR = "sync_error",
  SYNC_PARTIAL = "sync_partial",
  AUTH_REQUIRED = "auth_required",
  AUTH_SUCCESS = "auth_success",
  AUTH_ERROR = "auth_error",
  NEW_ITEMS = "new_items",
  CONFLICT_DETECTED = "conflict_detected",
  RATE_LIMIT = "rate_limit",
  NETWORK_ERROR = "network_error",
  QUOTA_WARNING = "quota_warning",
}

/**
 * Notification data interface
 */
export interface NotificationData {
  /** Unique notification ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Priority level */
  priority: NotificationPriority;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Optional provider ID */
  providerId?: string;
  /** Optional context data */
  context?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp (auto-dismiss) */
  expiresAt?: number;
  /** Whether the notification has been shown */
  shown: boolean;
  /** Whether the notification was clicked */
  clicked: boolean;
}

/**
 * Notification options for creating notifications
 */
export interface NotificationOptions {
  /** Notification type */
  type: NotificationType;
  /** Priority (default: NORMAL) */
  priority?: NotificationPriority;
  /** Title */
  title: string;
  /** Message */
  message: string;
  /** Provider ID */
  providerId?: string;
  /** Context data */
  context?: Record<string, unknown>;
  /** Auto-dismiss after N milliseconds */
  autoDismiss?: number;
  /** Action buttons */
  buttons?: Array<{
    title: string;
  }>;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  /** Total notifications created */
  total: number;
  /** Notifications shown */
  shown: number;
  /** Notifications clicked */
  clicked: number;
  /** By type */
  byType: Record<NotificationType, number>;
  /** By priority */
  byPriority: Record<NotificationPriority, number>;
}

/**
 * Notification Service
 *
 * Singleton service for managing browser notifications
 */
export class NotificationService {
  private static instance: NotificationService;

  /** Active notifications */
  private notifications: Map<string, NotificationData> = new Map();

  /** Notification history (last 100) */
  private history: NotificationData[] = [];

  /** Maximum history size */
  private readonly MAX_HISTORY = 100;

  /** Rate limit map (provider ID → last notification time) */
  private rateLimitMap: Map<string, number> = new Map();

  /** Minimum time between notifications for same provider (ms) */
  private readonly RATE_LIMIT_MS = 5000; // 5 seconds

  private constructor() {
    this.setupNotificationClickHandler();
    logger.info("NotificationService initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<void> {
    // Load notification history from storage (future enhancement)
    // For now, start with empty history
    this.history = [];

    logger.info("Notification service initialized");
  }

  /**
   * Setup notification click handler
   */
  private setupNotificationClickHandler(): void {
    if (browser.notifications?.onClicked) {
      browser.notifications.onClicked.addListener((notificationId) => {
        this.handleNotificationClick(notificationId);
      });
    }

    if (browser.notifications?.onButtonClicked) {
      browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        this.handleButtonClick(notificationId, buttonIndex);
      });
    }
  }

  /**
   * Create and show a notification
   */
  public async notify(options: NotificationOptions): Promise<string> {
    // Check if notifications are enabled in settings
    const settings = await storageManager.getSettings();
    if (!settings.enableNotifications) {
      logger.debug("Notifications disabled in settings");
      return "";
    }

    // Check rate limiting
    if (options.providerId && this.isRateLimited(options.providerId)) {
      logger.debug(`Notification rate limited for ${options.providerId}`);
      return "";
    }

    // Generate notification ID
    const notificationId = `livefolder-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create notification data
    const notificationData: NotificationData = {
      id: notificationId,
      type: options.type,
      priority: options.priority ?? NotificationPriority.NORMAL,
      title: options.title,
      message: options.message,
      providerId: options.providerId,
      context: options.context,
      createdAt: Date.now(),
      expiresAt: options.autoDismiss ? Date.now() + options.autoDismiss : undefined,
      shown: false,
      clicked: false,
    };

    // Store notification
    this.notifications.set(notificationId, notificationData);
    this.addToHistory(notificationData);

    // Update rate limit
    if (options.providerId) {
      this.rateLimitMap.set(options.providerId, Date.now());
    }

    // Show browser notification
    await this.showBrowserNotification(notificationData, options.buttons);

    // Schedule auto-dismiss if configured
    if (options.autoDismiss) {
      setTimeout(() => {
        this.dismiss(notificationId);
      }, options.autoDismiss);
    }

    return notificationId;
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(
    data: NotificationData,
    buttons?: Array<{ title: string }>,
  ): Promise<void> {
    const iconUrl = browser.runtime.getURL("public/icon-128.png");

    // Firefox doesn't support buttons in notifications
    const isFirefox = navigator.userAgent.includes("Firefox");

    const notificationOptions: browser.Notifications.CreateNotificationOptions = {
      type: "basic" as const,
      iconUrl,
      title: data.title,
      message: data.message,
      priority: data.priority,
      // Only include buttons for Chrome/Edge (Firefox will throw an error)
      ...(isFirefox ? {} : { buttons: buttons?.slice(0, 2) }), // Max 2 buttons
    };

    try {
      logger.info(`Creating notification: ${data.id}`, { iconUrl, title: data.title, isFirefox });

      // Check if browser.notifications is available
      if (!browser.notifications) {
        logger.error("browser.notifications API not available in this context");
        throw new Error("Notifications API not available");
      }

      await browser.notifications.create(data.id, notificationOptions);
      data.shown = true;
      logger.info(`Notification shown: ${data.id}`);
    } catch (error) {
      logger.error("Failed to show notification:", error);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Check if provider is rate limited
   */
  private isRateLimited(providerId: string): boolean {
    const lastNotification = this.rateLimitMap.get(providerId);
    if (!lastNotification) {
      return false;
    }

    return Date.now() - lastNotification < this.RATE_LIMIT_MS;
  }

  /**
   * Dismiss a notification
   */
  public async dismiss(notificationId: string): Promise<void> {
    try {
      await browser.notifications.clear(notificationId);
      this.notifications.delete(notificationId);
      logger.debug(`Notification dismissed: ${notificationId}`);
    } catch (error) {
      logger.error("Failed to dismiss notification:", error);
    }
  }

  /**
   * Dismiss all active notifications
   */
  public async dismissAll(): Promise<void> {
    const promises = Array.from(this.notifications.keys()).map((id) => this.dismiss(id));
    await Promise.all(promises);
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return;
    }

    notification.clicked = true;
    logger.info(`Notification clicked: ${notificationId}`);

    // Handle different notification types
    switch (notification.type) {
      case NotificationType.AUTH_REQUIRED:
        // Open popup to authenticate
        browser.action?.openPopup?.();
        break;

      case NotificationType.CONFLICT_DETECTED:
        // Open popup to handle conflicts
        browser.action?.openPopup?.();
        break;

      case NotificationType.NEW_ITEMS:
        // Open popup to view new items
        browser.action?.openPopup?.();
        break;

      default:
        // Default: open popup
        browser.action?.openPopup?.();
    }

    // Dismiss notification after click
    this.dismiss(notificationId);
  }

  /**
   * Handle notification button click
   */
  private handleButtonClick(notificationId: string, buttonIndex: number): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return;
    }

    logger.info(`Notification button clicked: ${notificationId}, button: ${buttonIndex}`);

    // Handle button actions based on notification type and context
    // This can be extended based on specific notification types
    this.dismiss(notificationId);
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: NotificationData): void {
    this.history.push(notification);

    // Trim history if needed
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(-this.MAX_HISTORY);
    }

    // Future enhancement: Save to storage
    // For now, history is in-memory only
  }

  /**
   * Get notification history
   */
  public getHistory(): NotificationData[] {
    return [...this.history];
  }

  /**
   * Get notification by ID
   */
  public getNotification(notificationId: string): NotificationData | null {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Get all active notifications
   */
  public getActiveNotifications(): NotificationData[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notification statistics
   */
  public getStats(): NotificationStats {
    const all = [...this.history];

    const byType: Record<NotificationType, number> = {
      [NotificationType.SYNC_SUCCESS]: 0,
      [NotificationType.SYNC_ERROR]: 0,
      [NotificationType.SYNC_PARTIAL]: 0,
      [NotificationType.AUTH_REQUIRED]: 0,
      [NotificationType.AUTH_SUCCESS]: 0,
      [NotificationType.AUTH_ERROR]: 0,
      [NotificationType.NEW_ITEMS]: 0,
      [NotificationType.CONFLICT_DETECTED]: 0,
      [NotificationType.RATE_LIMIT]: 0,
      [NotificationType.NETWORK_ERROR]: 0,
      [NotificationType.QUOTA_WARNING]: 0,
    };

    const byPriority: Record<NotificationPriority, number> = {
      [NotificationPriority.LOW]: 0,
      [NotificationPriority.NORMAL]: 0,
      [NotificationPriority.HIGH]: 0,
    };

    let shown = 0;
    let clicked = 0;

    for (const notification of all) {
      byType[notification.type]++;
      byPriority[notification.priority]++;
      if (notification.shown) shown++;
      if (notification.clicked) clicked++;
    }

    return {
      total: all.length,
      shown,
      clicked,
      byType,
      byPriority,
    };
  }

  /**
   * Clear notification history
   */
  public async clearHistory(): Promise<void> {
    this.history = [];
    // Future enhancement: Clear from storage
    logger.info("Notification history cleared");
  }

  // Helper methods for common notification scenarios

  /**
   * Notify about successful sync
   */
  public async notifySyncSuccess(providerId: string, itemCount: number): Promise<string> {
    return this.notify({
      type: NotificationType.SYNC_SUCCESS,
      priority: NotificationPriority.LOW,
      title: "Sync Complete",
      message: `Successfully synced ${itemCount} items from ${providerId}`,
      providerId,
      autoDismiss: 5000,
    });
  }

  /**
   * Notify about sync error
   */
  public async notifySyncError(providerId: string, error: string): Promise<string> {
    return this.notify({
      type: NotificationType.SYNC_ERROR,
      priority: NotificationPriority.HIGH,
      title: "Sync Failed",
      message: `Failed to sync ${providerId}: ${error}`,
      providerId,
      buttons: [{ title: "Retry" }, { title: "Dismiss" }],
    });
  }

  /**
   * Notify about new items
   */
  public async notifyNewItems(providerId: string, items: BookmarkItem[]): Promise<string> {
    const count = items.length;
    return this.notify({
      type: NotificationType.NEW_ITEMS,
      priority: NotificationPriority.NORMAL,
      title: "New Items",
      message: `Found ${count} new ${count === 1 ? "item" : "items"} from ${providerId}`,
      providerId,
      context: { items },
      autoDismiss: 10000,
    });
  }

  /**
   * Notify about authentication requirement
   */
  public async notifyAuthRequired(providerId: string): Promise<string> {
    return this.notify({
      type: NotificationType.AUTH_REQUIRED,
      priority: NotificationPriority.HIGH,
      title: "Authentication Required",
      message: `Please sign in to ${providerId} to continue syncing`,
      providerId,
      buttons: [{ title: "Sign In" }, { title: "Later" }],
    });
  }

  /**
   * Notify about conflict detection
   */
  public async notifyConflict(providerId: string, conflictCount: number): Promise<string> {
    return this.notify({
      type: NotificationType.CONFLICT_DETECTED,
      priority: NotificationPriority.HIGH,
      title: "Conflicts Detected",
      message: `Found ${conflictCount} sync ${conflictCount === 1 ? "conflict" : "conflicts"} for ${providerId}`,
      providerId,
      buttons: [{ title: "Resolve" }, { title: "Later" }],
    });
  }

  /**
   * Notify about rate limiting
   */
  public async notifyRateLimit(providerId: string, retryAfter?: number): Promise<string> {
    const message = retryAfter
      ? `Rate limited. Will retry in ${Math.ceil(retryAfter / 60)} minutes`
      : "Rate limited. Please try again later";

    return this.notify({
      type: NotificationType.RATE_LIMIT,
      priority: NotificationPriority.NORMAL,
      title: "Rate Limit Exceeded",
      message: `${providerId}: ${message}`,
      providerId,
      autoDismiss: 10000,
    });
  }
}

/**
 * Export singleton instance
 */
export const notificationService = NotificationService.getInstance();
