import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthState, ExtensionSettings, ProviderStorageData } from "@/types";
import { StorageManager } from "../storage";

describe("StorageManager", () => {
	let storage: StorageManager;

	beforeEach(() => {
		storage = StorageManager.getInstance();
		// Clear storage before each test
		browser.storage?.local.clear();
		vi.clearAllMocks();
	});

	describe("getInstance", () => {
		it("should return the same instance (singleton)", () => {
			const instance1 = StorageManager.getInstance();
			const instance2 = StorageManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("Auth State Management", () => {
		it("should save and retrieve auth state", async () => {
			const authState: AuthState = {
				providerId: "github",
				authenticated: true,
				tokens: {
					accessToken: "test-token-123",
					refreshToken: "refresh-token-456",
					tokenType: "Bearer",
					expiresAt: Date.now() + 3600000,
				},
			};

			const result = await storage.saveAuth("github", authState);
			expect(result.success).toBe(true);

			const retrieved = await storage.getAuth("github");
			expect(retrieved).toBeTruthy();
			expect(retrieved?.providerId).toBe("github");
		});

		it("should return null for non-existent auth state", async () => {
			const authState = await storage.getAuth("nonexistent");
			expect(authState).toBeNull();
		});

		it("should delete auth state", async () => {
			const authState: AuthState = {
				providerId: "github",
				authenticated: true,
				tokens: {
					accessToken: "test-token",
					tokenType: "Bearer",
					expiresAt: Date.now() + 3600000,
				},
			};

			await storage.saveAuth("github", authState);
			const deleteResult = await storage.deleteAuth("github");
			expect(deleteResult.success).toBe(true);

			const retrieved = await storage.getAuth("github");
			expect(retrieved).toBeNull();
		});

		it("should retrieve all auth states", async () => {
			const githubAuth: AuthState = {
				providerId: "github",
				authenticated: true,
				tokens: {
					accessToken: "github-token",
					tokenType: "Bearer",
					expiresAt: Date.now() + 3600000,
				},
			};

			const jiraAuth: AuthState = {
				providerId: "jira",
				authenticated: true,
				tokens: {
					accessToken: "jira-token",
					tokenType: "Bearer",
					expiresAt: Date.now() + 3600000,
				},
			};

			await storage.saveAuth("github", githubAuth);
			await storage.saveAuth("jira", jiraAuth);

			const allAuth = await storage.getAllAuth();
			expect(Object.keys(allAuth)).toHaveLength(2);
			expect(allAuth.github).toBeTruthy();
			expect(allAuth.jira).toBeTruthy();
		});
	});

	describe("Provider Data Management", () => {
		it("should save and retrieve provider data", async () => {
			const providerData: ProviderStorageData = {
				config: {
					enabled: true,
					folderId: "folder-id-1",
					settings: {
						syncInterval: 15,
					},
				},
				lastSync: Date.now(),
			};

			const saveResult = await storage.saveProvider("github", providerData);
			expect(saveResult.success).toBe(true);

			const retrieved = await storage.getProvider("github");
			expect(retrieved).toEqual(providerData);
		});

		it("should return null for non-existent provider", async () => {
			const provider = await storage.getProvider("nonexistent");
			expect(provider).toBeNull();
		});

		it("should retrieve all providers", async () => {
			const githubData: ProviderStorageData = {
				config: {
					enabled: true,
				},
				lastSync: Date.now(),
			};

			const jiraData: ProviderStorageData = {
				config: {
					enabled: false,
				},
				lastSync: Date.now(),
			};

			await storage.saveProvider("github", githubData);
			await storage.saveProvider("jira", jiraData);

			const allProviders = await storage.getProviders();
			expect(Object.keys(allProviders)).toHaveLength(2);
			expect(allProviders.github).toEqual(githubData);
			expect(allProviders.jira).toEqual(jiraData);
		});

		it("should delete provider and cleanup related data", async () => {
			const providerData: ProviderStorageData = {
				config: {
					enabled: true,
				},
				lastSync: Date.now(),
			};

			const authState: AuthState = {
				providerId: "github",
				authenticated: true,
				tokens: {
					accessToken: "test-token",
					tokenType: "Bearer",
					expiresAt: Date.now() + 3600000,
				},
			};

			await storage.saveProvider("github", providerData);
			await storage.saveAuth("github", authState);

			const deleteResult = await storage.deleteProvider("github");
			expect(deleteResult.success).toBe(true);

			const provider = await storage.getProvider("github");
			expect(provider).toBeNull();

			const auth = await storage.getAuth("github");
			expect(auth).toBeNull();
		});
	});

	describe("Settings Management", () => {
		it("should retrieve default settings when none exist", async () => {
			const settings = await storage.getSettings();

			expect(settings).toBeTruthy();
			expect(settings.syncInterval).toBeDefined();
			expect(settings.enableNotifications).toBeDefined();
		});

		it("should save and retrieve settings", async () => {
			const newSettings: Partial<ExtensionSettings> = {
				syncInterval: 30,
				enableNotifications: false,
				theme: "dark",
			};

			const saveResult = await storage.saveSettings(newSettings);
			expect(saveResult.success).toBe(true);

			const retrieved = await storage.getSettings();
			expect(retrieved.syncInterval).toBe(30);
			expect(retrieved.enableNotifications).toBe(false);
			expect(retrieved.theme).toBe("dark");
		});

		it("should merge partial settings with existing ones", async () => {
			await storage.saveSettings({
				syncInterval: 30,
				enableNotifications: false,
			});

			await storage.saveSettings({
				theme: "dark",
			});

			const settings = await storage.getSettings();
			expect(settings.syncInterval).toBe(30);
			expect(settings.enableNotifications).toBe(false);
			expect(settings.theme).toBe("dark");
		});
	});

	describe("Error Handling", () => {
		it("should handle storage.get errors gracefully", async () => {
			// Mock storage.local.get to throw an error
			const mockGet = browser.storage?.local.get;
			if (mockGet) {
				vi.mocked(mockGet).mockRejectedValueOnce(new Error("Storage quota exceeded"));
			}

			await expect(storage.getAuth("github")).rejects.toThrow("Storage quota exceeded");
		});

		it("should return error result on save failure", async () => {
			const mockSet = browser.storage?.local.set;
			if (mockSet) {
				vi.mocked(mockSet).mockRejectedValueOnce(new Error("Storage write failed"));
			}

			const providerData: ProviderStorageData = {
				config: {
					enabled: true,
				},
				lastSync: Date.now(),
			};

			const result = await storage.saveProvider("github", providerData);
			expect(result.success).toBe(false);
			expect(result.error).toBe("Storage write failed");
		});
	});

	describe("Initialization", () => {
		it("should initialize storage with default values", async () => {
			await storage.initialize();

			const settings = await storage.getSettings();
			expect(settings).toBeTruthy();
			expect(settings.syncInterval).toBeDefined();
		});

		it("should not reinitialize if already initialized", async () => {
			await storage.initialize();
			const firstSettings = await storage.getSettings();

			await storage.initialize();
			const secondSettings = await storage.getSettings();

			expect(firstSettings).toEqual(secondSettings);
		});
	});
});
