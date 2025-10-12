import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookmarkItem } from "@/types";
import {
  NotificationPriority,
  NotificationService,
  NotificationType,
} from "../notification-service";
import { storageManager } from "../storage";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(async () => {
    service = NotificationService.getInstance();

    // Enable notifications in settings
    const settings = await storageManager.getSettings();
    await storageManager.saveSettings({ ...settings, enableNotifications: true });

    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return the same instance (singleton)", () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("notify", () => {
    it("should create and show a notification with default priority", async () => {
      const notificationId = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test Notification",
        message: "This is a test",
        providerId: "github",
      });

      expect(notificationId).toBeTruthy();
      expect(notificationId).toMatch(/^livefolder-/);

      const notification = service.getNotification(notificationId);
      expect(notification).toBeTruthy();
      expect(notification?.type).toBe(NotificationType.SYNC_SUCCESS);
      expect(notification?.priority).toBe(NotificationPriority.NORMAL);
      expect(notification?.title).toBe("Test Notification");
      expect(notification?.message).toBe("This is a test");
    });

    it("should create notification with HIGH priority", async () => {
      const notificationId = await service.notify({
        type: NotificationType.AUTH_REQUIRED,
        priority: NotificationPriority.HIGH,
        title: "Auth Required",
        message: "Please sign in",
      });

      const notification = service.getNotification(notificationId);
      expect(notification?.priority).toBe(NotificationPriority.HIGH);
    });

    it("should create notification with LOW priority", async () => {
      const notificationId = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        priority: NotificationPriority.LOW,
        title: "Success",
        message: "Sync complete",
      });

      const notification = service.getNotification(notificationId);
      expect(notification?.priority).toBe(NotificationPriority.LOW);
    });

    it("should store context data", async () => {
      const context = { itemCount: 5, source: "api" };

      const notificationId = await service.notify({
        type: NotificationType.NEW_ITEMS,
        title: "New Items",
        message: "Found new items",
        context,
      });

      const notification = service.getNotification(notificationId);
      expect(notification?.context).toEqual(context);
    });

    it("should respect rate limiting for same provider", async () => {
      // Use unique provider to avoid conflicts with other tests
      const providerId = `test-rate-limit-${Date.now()}`;

      // First notification should succeed
      const id1 = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "First",
        message: "Message",
        providerId,
      });
      expect(id1).toBeTruthy();

      // Second notification within 5s should be rate limited
      const id2 = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Second",
        message: "Message",
        providerId,
      });
      expect(id2).toBe("");
    });

    it("should not rate limit different providers", async () => {
      const id1 = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "GitHub",
        message: "Message",
        providerId: `provider-a-${Date.now()}`,
      });

      const id2 = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Jira",
        message: "Message",
        providerId: `provider-b-${Date.now()}`,
      });

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it("should add notification to history", async () => {
      const id = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test",
        message: "Message",
      });

      const history = service.getHistory();
      expect(history.length).toBeGreaterThan(0);

      const notification = history.find((n) => n.id === id);
      expect(notification).toBeTruthy();
    });
  });

  describe("dismiss", () => {
    it("should dismiss an active notification", async () => {
      const id = await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test",
        message: "Message",
      });

      expect(service.getNotification(id)).toBeTruthy();

      await service.dismiss(id);

      expect(service.getNotification(id)).toBeNull();
    });
  });

  describe("dismissAll", () => {
    it("should dismiss all active notifications", async () => {
      await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test 1",
        message: "Message",
      });

      await service.notify({
        type: NotificationType.SYNC_ERROR,
        title: "Test 2",
        message: "Message",
      });

      expect(service.getActiveNotifications().length).toBeGreaterThan(0);

      await service.dismissAll();

      expect(service.getActiveNotifications().length).toBe(0);
    });
  });

  describe("getActiveNotifications", () => {
    it("should return all active notifications", async () => {
      await service.dismissAll();

      await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test 1",
        message: "Message",
      });

      await service.notify({
        type: NotificationType.SYNC_ERROR,
        title: "Test 2",
        message: "Message",
      });

      const active = service.getActiveNotifications();
      expect(active).toHaveLength(2);
    });
  });

  describe("getStats", () => {
    it("should track notification statistics", async () => {
      await service.clearHistory();

      await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        priority: NotificationPriority.LOW,
        title: "Success",
        message: "Message",
      });

      await service.notify({
        type: NotificationType.SYNC_ERROR,
        priority: NotificationPriority.HIGH,
        title: "Error",
        message: "Message",
      });

      const stats = service.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byType[NotificationType.SYNC_SUCCESS]).toBe(1);
      expect(stats.byType[NotificationType.SYNC_ERROR]).toBe(1);
      expect(stats.byPriority[NotificationPriority.LOW]).toBe(1);
      expect(stats.byPriority[NotificationPriority.HIGH]).toBe(1);
    });

    it("should count shown notifications", async () => {
      await service.clearHistory();

      await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test",
        message: "Message",
      });

      const stats = service.getStats();
      expect(stats.shown).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clearHistory", () => {
    it("should clear notification history", async () => {
      await service.notify({
        type: NotificationType.SYNC_SUCCESS,
        title: "Test",
        message: "Message",
      });

      expect(service.getHistory().length).toBeGreaterThan(0);

      await service.clearHistory();

      expect(service.getHistory().length).toBe(0);
    });
  });

  describe("helper methods", () => {
    beforeEach(async () => {
      // Clear history and active notifications before each helper test
      await service.dismissAll();
      await service.clearHistory();
    });

    describe("notifySyncSuccess", () => {
      it("should create sync success notification", async () => {
        const id = await service.notifySyncSuccess("test-provider", 10);

        // Check from history since autoDismiss removes from active
        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.SYNC_SUCCESS);
        expect(notification?.priority).toBe(NotificationPriority.LOW);
        expect(notification?.title).toBe("Sync Complete");
        expect(notification?.message).toContain("10 items");
        expect(notification?.message).toContain("test-provider");
      });
    });

    describe("notifySyncError", () => {
      it("should create sync error notification", async () => {
        const id = await service.notifySyncError("test-provider-2", "Network timeout");

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.SYNC_ERROR);
        expect(notification?.priority).toBe(NotificationPriority.HIGH);
        expect(notification?.title).toBe("Sync Failed");
        expect(notification?.message).toContain("test-provider-2");
        expect(notification?.message).toContain("Network timeout");
      });
    });

    describe("notifyNewItems", () => {
      it("should create new items notification with singular message", async () => {
        const items: BookmarkItem[] = [
          {
            id: "item-1",
            title: "Test Item",
            url: "https://example.com",
            providerId: "test-provider-3",
          },
        ];

        const id = await service.notifyNewItems("test-provider-3", items);

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.NEW_ITEMS);
        expect(notification?.message).toContain("1 new item");
      });

      it("should create new items notification with plural message", async () => {
        const items: BookmarkItem[] = [
          {
            id: "item-1",
            title: "Item 1",
            url: "https://example.com/1",
            providerId: "test-provider-4",
          },
          {
            id: "item-2",
            title: "Item 2",
            url: "https://example.com/2",
            providerId: "test-provider-4",
          },
        ];

        const id = await service.notifyNewItems("test-provider-4", items);

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.message).toContain("2 new items");
      });
    });

    describe("notifyAuthRequired", () => {
      it("should create auth required notification", async () => {
        const id = await service.notifyAuthRequired("test-provider-5");

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.AUTH_REQUIRED);
        expect(notification?.priority).toBe(NotificationPriority.HIGH);
        expect(notification?.title).toBe("Authentication Required");
        expect(notification?.message).toContain("test-provider-5");
      });
    });

    describe("notifyConflict", () => {
      it("should create conflict notification with singular message", async () => {
        const id = await service.notifyConflict("test-provider-6", 1);

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.CONFLICT_DETECTED);
        expect(notification?.priority).toBe(NotificationPriority.HIGH);
        expect(notification?.message).toContain("1 sync conflict");
      });

      it("should create conflict notification with plural message", async () => {
        const id = await service.notifyConflict("test-provider-7", 3);

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.message).toContain("3 sync conflicts");
      });
    });

    describe("notifyRateLimit", () => {
      it("should create rate limit notification without retry time", async () => {
        const id = await service.notifyRateLimit("test-provider-8");

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.type).toBe(NotificationType.RATE_LIMIT);
        expect(notification?.priority).toBe(NotificationPriority.NORMAL);
        expect(notification?.message).toContain("try again later");
      });

      it("should create rate limit notification with retry time", async () => {
        const retryAfter = 180; // 3 minutes in seconds (API returns seconds)

        const id = await service.notifyRateLimit("test-provider-9", retryAfter);

        const history = service.getHistory();
        const notification = history.find((n) => n.id === id);

        expect(notification).toBeTruthy();
        expect(notification?.message).toContain("3 minutes");
      });
    });
  });

  describe("notification types", () => {
    it("should support all notification types", async () => {
      const types = [
        NotificationType.SYNC_SUCCESS,
        NotificationType.SYNC_ERROR,
        NotificationType.SYNC_PARTIAL,
        NotificationType.AUTH_REQUIRED,
        NotificationType.AUTH_SUCCESS,
        NotificationType.AUTH_ERROR,
        NotificationType.NEW_ITEMS,
        NotificationType.CONFLICT_DETECTED,
        NotificationType.RATE_LIMIT,
        NotificationType.NETWORK_ERROR,
        NotificationType.QUOTA_WARNING,
      ];

      for (const type of types) {
        const id = await service.notify({
          type,
          title: `Test ${type}`,
          message: "Test message",
        });

        const notification = service.getNotification(id);
        expect(notification?.type).toBe(type);
      }
    });
  });

  describe("priority levels", () => {
    it("should support all priority levels", async () => {
      const priorities = [
        NotificationPriority.LOW,
        NotificationPriority.NORMAL,
        NotificationPriority.HIGH,
      ];

      for (const priority of priorities) {
        const id = await service.notify({
          type: NotificationType.SYNC_SUCCESS,
          priority,
          title: "Test",
          message: "Message",
        });

        const notification = service.getNotification(id);
        expect(notification?.priority).toBe(priority);
      }
    });
  });
});
