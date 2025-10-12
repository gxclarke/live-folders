import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TitleFormatOptions } from "@/types";
import { JiraProvider } from "../jira-provider";

describe("Jira Title Formatter", () => {
  let provider: JiraProvider;

  // Mock issue data factory
  const createMockIssue = (overrides = {}) => ({
    id: "10001",
    key: "PROJ-123",
    self: "https://jira.example.com/rest/api/2/issue/10001",
    fields: {
      summary: "Fix critical login crash",
      status: {
        name: "In Progress",
        statusCategory: {
          key: "indeterminate",
        },
      },
      priority: {
        name: "High",
        iconUrl: "https://jira.example.com/images/icons/priorities/high.svg",
      },
      issuetype: {
        name: "Bug",
        iconUrl: "https://jira.example.com/images/icons/issuetypes/bug.svg",
      },
      project: {
        key: "PROJ",
        name: "Project Name",
      },
      assignee: {
        displayName: "Alice Smith",
        avatarUrls: {
          "48x48": "https://avatar.url",
        },
      },
      reporter: {
        displayName: "Bob Jones",
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    ...overrides,
  });

  beforeEach(() => {
    provider = new JiraProvider();
    vi.clearAllMocks();
  });

  describe("Priority Indicators", () => {
    it("should show red emoji for highest priority", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          priority: { name: "Highest", iconUrl: "" },
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: true,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("🔴");
    });

    it("should show orange emoji for high priority", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          priority: { name: "High", iconUrl: "" },
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: true,
        includeAssignee: false,
        includePriority: true,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("🟠");
    });

    it("should show text priority when emojis disabled", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          priority: { name: "High", iconUrl: "" },
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: false,
        includePriority: true,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("[HIGH]");
    });
  });

  describe("Issue Type Indicators", () => {
    it("should show bug emoji for bug issue type", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          issuetype: { name: "Bug", iconUrl: "" },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("🐛");
    });

    it("should show epic emoji for epic issue type", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          issuetype: { name: "Epic", iconUrl: "" },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("📚");
    });

    it("should show story emoji for user story", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          issuetype: { name: "User Story", iconUrl: "" },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("📖");
    });

    it("should show task emoji for task", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          issuetype: { name: "Task", iconUrl: "" },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("✅");
    });

    it("should show text type when emojis disabled", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          issuetype: { name: "Bug", iconUrl: "" },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("[BUG]");
    });
  });

  describe("Status Indicators", () => {
    it("should show issue type emoji in status mode", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("🐛"); // Bug emoji
    });

    it("should show issue type text when emojis disabled", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("[BUG]");
    });

    it("should show issue type for done issues", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          status: {
            name: "Done",
            statusCategory: { key: "done" },
          },
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("[BUG]");
    });
  });

  describe("Assignee and Creator", () => {
    it("should show assignee when enabled", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          assignee: {
            displayName: "Alice Smith",
            avatarUrls: { "48x48": "" },
          },
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: true,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("→@Alice");
    });

    it("should show unassigned when no assignee", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          assignee: null,
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: false,
        includeEmojis: false,
        includeAssignee: true,
        includePriority: false,
        includeAge: false,
        includeReviewStatus: false,
        includeCreator: false,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("→@unassigned");
    });

    it("should show creator when enabled and different from assignee", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          assignee: {
            displayName: "Alice Smith",
            avatarUrls: { "48x48": "" },
          },
          reporter: {
            displayName: "Bob Jones",
          },
        },
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("→@Alice");
      expect(title).toContain("@Bob:");
    });

    it("should not duplicate when creator is same as assignee", async () => {
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          assignee: {
            displayName: "Alice Smith",
            avatarUrls: { "48x48": "" },
          },
          reporter: {
            displayName: "Alice Smith",
          },
        },
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("@Alice:");
      expect(title).not.toContain("by @Alice");
    });
  });

  describe("Age Indicator", () => {
    it("should show age emoji for issues older than 7 days", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: oldDate.toISOString(),
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("⏰");
    });

    it("should not show age for recent issues", async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: recentDate.toISOString(),
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).not.toContain("⏰");
    });

    it("should show age in days when emojis disabled", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15);
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          created: oldDate.toISOString(),
        },
      });
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toMatch(/\[15d\]/);
    });
  });

  describe("Format Styles", () => {
    it("should use compact format with square brackets", async () => {
      const issue = createMockIssue();
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("[PROJ-123]");
      expect(title).not.toContain("(PROJ-123)");
    });

    it("should always use space-separated compact format", async () => {
      const issue = createMockIssue();
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toBe("Fix critical login crash [PROJ-123]");
    });
  });

  describe("Edge Cases", () => {
    it("should handle all options disabled", async () => {
      const issue = createMockIssue();
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
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toBe("Fix critical login crash [PROJ-123]");
    });

    it("should handle all options enabled", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const issue = createMockIssue({
        fields: {
          ...createMockIssue().fields,
          priority: { name: "Highest", iconUrl: "" },
          issuetype: { name: "Bug", iconUrl: "" },
          status: {
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
          assignee: {
            displayName: "Alice Smith",
            avatarUrls: { "48x48": "" },
          },
          reporter: {
            displayName: "Bob Jones",
          },
          created: oldDate.toISOString(),
        },
      });
      const options: TitleFormatOptions = {
        includeStatus: true,
        includeEmojis: true,
        includeAssignee: true,
        includePriority: true,
        includeAge: true,
        includeReviewStatus: false,
        includeCreator: true,
        format: "compact",
      };

      // @ts-expect-error - accessing private method for testing
      const title = provider.formatJiraTitle(issue, options);

      expect(title).toContain("🔴"); // Priority
      expect(title).toContain("🐛"); // Type
      expect(title).toContain("→@Alice"); // Assignee
      expect(title).toContain("@Bob:"); // Creator
      expect(title).toContain("⏰"); // Age
      expect(title).toContain("Fix critical login crash");
      expect(title).toContain("[PROJ-123]");
    });
  });
});
