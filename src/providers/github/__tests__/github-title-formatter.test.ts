import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TitleFormatOptions } from "@/types";
import { GitHubProvider } from "../github-provider";

describe("GitHub Title Formatter", () => {
  let provider: GitHubProvider;

  // Mock PR data factory
  const createMockPR = (overrides = {}) => ({
    id: 123456789,
    node_id: "PR_test123",
    number: 123,
    title: "Add user authentication",
    html_url: "https://github.com/test/repo/pull/123",
    state: "open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    repository_url: "https://api.github.com/repos/test/repo",
    user: {
      login: "alice",
      avatar_url: "https://avatars.githubusercontent.com/u/123",
    },
    draft: false,
    merged: false,
    mergeable_state: "clean",
    requested_reviewers: [],
    assignees: [],
    ...overrides,
  });

  beforeEach(() => {
    provider = new GitHubProvider();
    vi.clearAllMocks();
  });

  describe("Status Indicators", () => {
    it("should show green emoji for open ready PR", async () => {
      const pr = createMockPR({ state: "open", mergeable_state: "clean" });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("🟢");
      expect(title).toContain("Add user authentication");
      expect(title).toContain("#123");
    });

    it("should show yellow emoji for draft PR", async () => {
      const pr = createMockPR({ state: "open", draft: true });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("🟡");
      expect(title).toContain("Add user authentication");
    });

    it("should show red emoji for conflicting PR", async () => {
      const pr = createMockPR({ state: "open", mergeable_state: "dirty" });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("🔴");
    });

    it("should show black emoji for merged PR", async () => {
      const pr = createMockPR({ state: "closed", merged: true });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("⚫");
    });

    it("should show text status when emojis disabled", async () => {
      const pr = createMockPR({ state: "open", mergeable_state: "clean" });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("[OPEN]");
      expect(title).not.toContain("🟢");
    });
  });

  describe("Review Status", () => {
    it("should show checkmark when no reviews requested", async () => {
      const pr = createMockPR({ state: "open", requested_reviewers: [] });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("✅");
    });

    it("should show eye emoji when reviews requested", async () => {
      const pr = createMockPR({
        state: "open",
        requested_reviewers: [{ login: "bob" }, { login: "charlie" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("👁️");
    });

    it("should show review count when emojis disabled", async () => {
      const pr = createMockPR({
        state: "open",
        requested_reviewers: [{ login: "bob" }, { login: "charlie" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("[2 REVIEWS]");
    });

    it("should not show review status for closed PRs", async () => {
      const pr = createMockPR({
        state: "closed",
        requested_reviewers: [{ login: "bob" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).not.toContain("👁️");
      expect(title).not.toContain("✅");
    });
  });

  describe("Age Indicator", () => {
    it("should show age emoji for PRs older than 7 days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const pr = createMockPR({ created_at: oldDate.toISOString() });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: true,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("⏰");
    });

    it("should not show age emoji for recent PRs", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      const pr = createMockPR({ created_at: recentDate.toISOString() });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: true,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).not.toContain("⏰");
    });

    it("should show age in days when emojis disabled", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const pr = createMockPR({ created_at: oldDate.toISOString() });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: true,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toMatch(/\[10d\]/);
    });
  });

  describe("Creator and Assignee", () => {
    it("should show creator when enabled", async () => {
      const pr = createMockPR({ user: { login: "alice", avatar_url: "" } });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("@alice:");
    });

    it("should show assignee when enabled and different from creator", async () => {
      const pr = createMockPR({
        user: { login: "alice", avatar_url: "" },
        assignees: [{ login: "bob" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: true,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("@alice:");
      expect(title).toContain("→@bob");
    });

    it("should not duplicate when assignee is same as creator", async () => {
      const pr = createMockPR({
        user: { login: "alice", avatar_url: "" },
        assignees: [{ login: "alice" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: true,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("@alice:");
      expect(title).not.toContain("→@alice");
    });
  });

  describe("Format Styles", () => {
    it("should use compact format by default", async () => {
      const pr = createMockPR();
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("#123");
      expect(title).not.toContain("(#123)");
    });

    it("should always use space-separated compact format", async () => {
      const pr = createMockPR();
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: true,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toBe("#123 🟢 ✅ Add user authentication");
    });

    it("should use minimal format", async () => {
      const pr = createMockPR();
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "minimal",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("Add user authentication");
      expect(title).toContain("#123");
    });
  });

  describe("Edge Cases", () => {
    it("should handle PR with no user", async () => {
      const pr = createMockPR({ user: null });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("Add user authentication");
      expect(title).not.toContain("@");
    });

    it("should handle all options disabled", async () => {
      const pr = createMockPR();
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toBe("Add user authentication #123");
    });

    it("should handle all options enabled", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const pr = createMockPR({
        state: "open",
        draft: false,
        mergeable_state: "clean",
        created_at: oldDate.toISOString(),
        user: { login: "alice", avatar_url: "" },
        assignees: [{ login: "bob" }],
        requested_reviewers: [{ login: "charlie" }],
      });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: true,
        includePriority: false,
        includeAge: true,
        includeReviewStatus: true,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatGitHubTitle(pr, options);

      expect(title).toContain("🟢"); // Status
      expect(title).toContain("👁️"); // Review requested
      expect(title).toContain("⏰"); // Age
      expect(title).toContain("@alice:"); // Creator
      expect(title).toContain("→@bob"); // Assignee
      expect(title).toContain("Add user authentication");
      expect(title).toContain("#123");
    });
  });
});
