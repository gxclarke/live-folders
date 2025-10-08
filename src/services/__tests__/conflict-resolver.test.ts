import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookmarkItem, ConflictResolution } from "@/types";
import { ConflictResolver, ConflictType } from "../conflict-resolver";

describe("ConflictResolver", () => {
	let resolver: ConflictResolver;

	beforeEach(() => {
		resolver = ConflictResolver.getInstance();
		resolver.clearConflicts();
		vi.clearAllMocks();
	});

	describe("getInstance", () => {
		it("should return the same instance (singleton)", () => {
			const instance1 = ConflictResolver.getInstance();
			const instance2 = ConflictResolver.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("detectConflict", () => {
		it("should detect METADATA_CONFLICT when items have different titles", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T11:00:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");

			expect(conflict).toBeTruthy();
			expect(conflict?.type).toBe(ConflictType.METADATA_CONFLICT);
			expect(conflict?.local).toEqual(localItem);
			expect(conflict?.remote).toEqual(remoteItem);
		});
		it("should detect URL_MISMATCH conflict when URLs differ", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://old-url.com",
				providerId: "github",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://new-url.com",
				providerId: "github",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");

			expect(conflict).toBeTruthy();
			expect(conflict?.type).toBe(ConflictType.URL_MISMATCH);
		});

		it("should return null when no conflict exists", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			expect(conflict).toBeNull();
		});

		it("should return null when one item is null", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
			};

			const conflict = resolver.detectConflict(localItem, null, "github");
			expect(conflict).toBeNull();
		});

		it("should detect METADATA_CONFLICT when only metadata differs", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Different Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Another Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");

			expect(conflict).toBeTruthy();
			expect(conflict?.type).toBe(ConflictType.METADATA_CONFLICT);
		});
	});

	describe("resolveConflict - remote_wins strategy", () => {
		it("should choose remote item with default strategy", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("remote_wins");
			expect(resolution.resolved).toEqual(remoteItem);
			expect(resolution.requiresUserConfirmation).toBe(false);
		});
	});

	describe("resolveConflict - local_wins strategy", () => {
		it("should choose local item when strategy is set", () => {
			resolver.setDefaultStrategy("local_wins");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("local_wins");
			expect(resolution.resolved).toEqual(localItem);
		});
	});

	describe("resolveConflict - newest_wins strategy", () => {
		it("should choose newer item based on lastModified", () => {
			resolver.setDefaultStrategy("newest_wins");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Old Local",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "New Remote",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("newest_wins");
			expect(resolution.resolved?.title).toBe("New Remote");
		});

		it("should return null when only timestamps differ but not metadata", () => {
			resolver.setDefaultStrategy("newest_wins");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Same Title",
				url: "https://example.com",
				providerId: "github",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			expect(conflict).toBeNull();
		});
	});

	describe("resolveConflict - merge strategy", () => {
		it("should merge local and remote items", () => {
			resolver.setDefaultStrategy("merge");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
				description: "Remote description",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("merge");
			expect(resolution.resolved?.title).toBe("Local Title"); // Local is newer
			expect(resolution.resolved?.description).toBe("Remote description");
		});
	});

	describe("resolveConflict - manual strategy", () => {
		it("should mark for manual resolution", () => {
			resolver.setDefaultStrategy("manual");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("manual");
			expect(resolution.requiresUserConfirmation).toBe(true);
		});
	});

	describe("setProviderStrategy", () => {
		it("should use provider-specific strategy", () => {
			resolver.setDefaultStrategy("remote_wins");
			resolver.setProviderStrategy("github", "local_wins");

			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			const resolution = resolver.resolveConflict(conflict);

			expect(resolution.strategy).toBe("local_wins");
			expect(resolution.resolved).toEqual(localItem);
		});
	});

	describe("getStats", () => {
		it("should track conflict statistics", () => {
			const localItem1: BookmarkItem = {
				id: "item-1",
				title: "Title A",
				url: "https://example.com/a",
				providerId: "github",
			};

			const remoteItem1: BookmarkItem = {
				id: "item-1",
				title: "Title A",
				url: "https://example.com/b",
				providerId: "github",
			};

			resolver.detectConflict(localItem1, remoteItem1, "github");

			const stats = resolver.getStats();

			expect(stats.total).toBe(1);
			expect(stats.byProvider.github).toBe(1);
			expect(stats.byType[ConflictType.URL_MISMATCH]).toBe(1);
		});

		it("should count conflicts by type and provider", () => {
			const githubLocal: BookmarkItem = {
				id: "item-1",
				title: "Title",
				url: "https://old.com",
				providerId: "github",
			};

			const githubRemote: BookmarkItem = {
				id: "item-1",
				title: "Title",
				url: "https://new.com",
				providerId: "github",
			};

			const jiraLocal: BookmarkItem = {
				id: "item-2",
				title: "Jira A",
				url: "https://jira.com",
				providerId: "jira",
				lastModified: "2025-10-08T09:00:00Z",
			};

			const jiraRemote: BookmarkItem = {
				id: "item-2",
				title: "Jira B",
				url: "https://jira.com",
				providerId: "jira",
				lastModified: "2025-10-08T11:00:00Z",
			};

			resolver.detectConflict(githubLocal, githubRemote, "github");
			resolver.detectConflict(jiraLocal, jiraRemote, "jira");

			const stats = resolver.getStats();

			expect(stats.total).toBe(2);
			expect(stats.byProvider.github).toBe(1);
			expect(stats.byProvider.jira).toBe(1);
		});
	});

	describe("getUnresolvedConflicts", () => {
		it("should return all unresolved conflicts", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local",
				url: "https://old.com",
				providerId: "github",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote",
				url: "https://new.com",
				providerId: "github",
			};

			resolver.detectConflict(localItem, remoteItem, "github");

			const unresolved = resolver.getUnresolvedConflicts();
			expect(unresolved).toHaveLength(1);
			expect(unresolved[0].id).toBe("github-item-1");
		});

		it("should not return resolved conflicts", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local",
				url: "https://old.com",
				providerId: "github",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote",
				url: "https://new.com",
				providerId: "github",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github");
			if (!conflict) throw new Error("Expected conflict");
			resolver.resolveConflict(conflict);

			const unresolved = resolver.getUnresolvedConflicts();
			expect(unresolved).toHaveLength(0);
		});
	});

	describe("getProviderConflicts", () => {
		it("should filter conflicts by provider", () => {
			const githubLocal: BookmarkItem = {
				id: "item-1",
				title: "GitHub",
				url: "https://old.com",
				providerId: "github",
			};

			const githubRemote: BookmarkItem = {
				id: "item-1",
				title: "GitHub",
				url: "https://new.com",
				providerId: "github",
			};

			const jiraLocal: BookmarkItem = {
				id: "item-2",
				title: "Jira",
				url: "https://old.com",
				providerId: "jira",
			};

			const jiraRemote: BookmarkItem = {
				id: "item-2",
				title: "Jira",
				url: "https://new.com",
				providerId: "jira",
			};

			resolver.detectConflict(githubLocal, githubRemote, "github");
			resolver.detectConflict(jiraLocal, jiraRemote, "jira");

			const githubConflicts = resolver.getProviderConflicts("github");
			const jiraConflicts = resolver.getProviderConflicts("jira");

			expect(githubConflicts).toHaveLength(1);
			expect(jiraConflicts).toHaveLength(1);
			expect(githubConflicts[0].providerId).toBe("github");
			expect(jiraConflicts[0].providerId).toBe("jira");
		});
	});

	describe("resolveManually", () => {
		it("should resolve with keep_local action", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github")!;

			const resolution: ConflictResolution = {
				action: "keep_local",
			};

			const result = resolver.resolveManually(conflict.id, resolution);

			expect(result).toBeTruthy();
			expect(result?.strategy).toBe("manual");
			expect(result?.resolved).toEqual(localItem);
			expect(result?.requiresUserConfirmation).toBe(false);
		});

		it("should resolve with keep_remote action", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:00:00Z",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote Title",
				url: "https://example.com",
				providerId: "github",
				lastModified: "2025-10-08T10:05:00Z",
			};

			const conflict = resolver.detectConflict(localItem, remoteItem, "github")!;

			const resolution: ConflictResolution = {
				action: "keep_remote",
			};

			const result = resolver.resolveManually(conflict.id, resolution);

			expect(result).toBeTruthy();
			expect(result?.resolved).toEqual(remoteItem);
		});

		it("should return null for non-existent conflict", () => {
			const resolution: ConflictResolution = {
				action: "keep_local",
			};

			const result = resolver.resolveManually("non-existent-id", resolution);
			expect(result).toBeNull();
		});
	});

	describe("clearConflicts", () => {
		it("should clear all conflicts", () => {
			const localItem: BookmarkItem = {
				id: "item-1",
				title: "Local",
				url: "https://old.com",
				providerId: "github",
			};

			const remoteItem: BookmarkItem = {
				id: "item-1",
				title: "Remote",
				url: "https://new.com",
				providerId: "github",
			};

			resolver.detectConflict(localItem, remoteItem, "github");

			expect(resolver.getUnresolvedConflicts()).toHaveLength(1);

			resolver.clearConflicts();

			expect(resolver.getUnresolvedConflicts()).toHaveLength(0);
		});
	});
});
