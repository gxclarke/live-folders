import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter, RateLimitStrategy } from "../rate-limiter";

describe("RateLimiter", () => {
	let limiter: RateLimiter;

	beforeEach(() => {
		limiter = RateLimiter.getInstance();
		limiter.resetAll();
		vi.clearAllMocks();
	});

	describe("getInstance", () => {
		it("should return the same instance (singleton)", () => {
			const instance1 = RateLimiter.getInstance();
			const instance2 = RateLimiter.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("configure", () => {
		it("should configure rate limit for a provider", () => {
			limiter.configure("github", {
				maxRequests: 100,
				windowMs: 60000,
			});

			const status = limiter.getStatus("github");
			expect(status.limit).toBe(100);
			expect(status.remaining).toBe(100);
		});

		it("should use default strategy if not specified", () => {
			limiter.configure("github", {
				maxRequests: 50,
				windowMs: 30000,
			});

			const status = limiter.getStatus("github");
			expect(status.limit).toBe(50);
		});

		it("should configure with specific strategy", () => {
			limiter.configure("github", {
				maxRequests: 100,
				windowMs: 60000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});

			const status = limiter.getStatus("github");
			expect(status.limit).toBe(100);
		});
	});

	describe("checkLimit - TOKEN_BUCKET strategy", () => {
		beforeEach(() => {
			limiter.configure("github", {
				maxRequests: 3,
				windowMs: 1000,
				strategy: RateLimitStrategy.TOKEN_BUCKET,
			});
		});

		it("should allow requests within limit", async () => {
			expect(await limiter.checkLimit("github")).toBe(true);
			expect(await limiter.checkLimit("github")).toBe(true);
			expect(await limiter.checkLimit("github")).toBe(true);
		});

		it("should deny requests when tokens exhausted", async () => {
			await limiter.checkLimit("github");
			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			expect(await limiter.checkLimit("github")).toBe(false);
		});

		it("should refill tokens over time", async () => {
			// Exhaust tokens
			await limiter.checkLimit("github");
			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			// Wait for tokens to refill (1 token should refill in ~333ms for 3 tokens/1000ms)
			await new Promise((resolve) => setTimeout(resolve, 400));

			expect(await limiter.checkLimit("github")).toBe(true);
		});
	});

	describe("checkLimit - SLIDING_WINDOW strategy", () => {
		beforeEach(() => {
			limiter.configure("jira", {
				maxRequests: 3,
				windowMs: 1000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});
		});

		it("should allow requests within limit", async () => {
			expect(await limiter.checkLimit("jira")).toBe(true);
			expect(await limiter.checkLimit("jira")).toBe(true);
			expect(await limiter.checkLimit("jira")).toBe(true);
		});

		it("should deny requests when limit exceeded", async () => {
			await limiter.checkLimit("jira");
			await limiter.checkLimit("jira");
			await limiter.checkLimit("jira");

			expect(await limiter.checkLimit("jira")).toBe(false);
		});

		it("should allow requests after old ones expire", async () => {
			await limiter.checkLimit("jira");
			await limiter.checkLimit("jira");
			await limiter.checkLimit("jira");

			// Wait for window to slide
			await new Promise((resolve) => setTimeout(resolve, 1100));

			expect(await limiter.checkLimit("jira")).toBe(true);
		});
	});

	describe("checkLimit - FIXED_WINDOW strategy", () => {
		beforeEach(() => {
			limiter.configure("linear", {
				maxRequests: 3,
				windowMs: 1000,
				strategy: RateLimitStrategy.FIXED_WINDOW,
			});
		});

		it("should allow requests within limit", async () => {
			expect(await limiter.checkLimit("linear")).toBe(true);
			expect(await limiter.checkLimit("linear")).toBe(true);
			expect(await limiter.checkLimit("linear")).toBe(true);
		});

		it("should deny requests when limit exceeded", async () => {
			await limiter.checkLimit("linear");
			await limiter.checkLimit("linear");
			await limiter.checkLimit("linear");

			expect(await limiter.checkLimit("linear")).toBe(false);
		});

		it("should reset counter when window expires", async () => {
			await limiter.checkLimit("linear");
			await limiter.checkLimit("linear");
			await limiter.checkLimit("linear");

			// Wait for window to reset
			await new Promise((resolve) => setTimeout(resolve, 1100));

			expect(await limiter.checkLimit("linear")).toBe(true);
		});
	});

	describe("getStatus", () => {
		it("should return status for configured provider", () => {
			limiter.configure("github", {
				maxRequests: 100,
				windowMs: 60000,
			});

			const status = limiter.getStatus("github");

			expect(status.providerId).toBe("github");
			expect(status.limit).toBe(100);
			expect(status.remaining).toBe(100);
			expect(status.isLimited).toBe(false);
		});

		it("should use default config for unconfigured provider", () => {
			const status = limiter.getStatus("unknown");

			expect(status.providerId).toBe("unknown");
			expect(status.limit).toBe(60); // Default
		});

		it("should reflect consumed tokens", async () => {
			limiter.configure("github", {
				maxRequests: 5,
				windowMs: 60000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});

			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(3);
		});

		it("should indicate when limited", async () => {
			limiter.configure("github", {
				maxRequests: 2,
				windowMs: 60000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});

			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			const status = limiter.getStatus("github");
			expect(status.isLimited).toBe(true);
			expect(status.remaining).toBe(0);
		});
	});

	describe("waitForSlot", () => {
		it("should return immediately if not limited", async () => {
			limiter.configure("github", {
				maxRequests: 5,
				windowMs: 60000,
			});

			const startTime = Date.now();
			await limiter.waitForSlot("github");
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThan(50); // Should be nearly instant
		});

		it("should wait if rate limited", async () => {
			limiter.configure("github", {
				maxRequests: 1,
				windowMs: 500,
				strategy: RateLimitStrategy.FIXED_WINDOW,
			});

			await limiter.checkLimit("github");

			const startTime = Date.now();
			await limiter.waitForSlot("github");
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeGreaterThanOrEqual(400); // Should wait for window reset
		});
	});

	describe("execute", () => {
		it("should execute operation if within limit", async () => {
			limiter.configure("github", {
				maxRequests: 5,
				windowMs: 60000,
			});

			const operation = vi.fn().mockResolvedValue("result");

			const result = await limiter.execute("github", operation);

			expect(result).toBe("result");
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should wait and retry if rate limited", async () => {
			limiter.configure("github", {
				maxRequests: 1,
				windowMs: 500,
				strategy: RateLimitStrategy.FIXED_WINDOW,
			});

			const operation = vi.fn().mockResolvedValue("result");

			// First request consumes the token
			await limiter.checkLimit("github");

			const startTime = Date.now();
			const result = await limiter.execute("github", operation);
			const elapsed = Date.now() - startTime;

			expect(result).toBe("result");
			expect(elapsed).toBeGreaterThanOrEqual(400); // Waited for reset
		});
	});

	describe("reset", () => {
		it("should reset token bucket for provider", async () => {
			limiter.configure("github", {
				maxRequests: 2,
				windowMs: 60000,
				strategy: RateLimitStrategy.TOKEN_BUCKET,
			});

			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			limiter.reset("github");

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(2);
		});

		it("should reset sliding window for provider", async () => {
			limiter.configure("github", {
				maxRequests: 2,
				windowMs: 60000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});

			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			limiter.reset("github");

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(2);
		});

		it("should reset fixed window for provider", async () => {
			limiter.configure("github", {
				maxRequests: 2,
				windowMs: 60000,
				strategy: RateLimitStrategy.FIXED_WINDOW,
			});

			await limiter.checkLimit("github");
			await limiter.checkLimit("github");

			limiter.reset("github");

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(2);
		});
	});

	describe("resetAll", () => {
		it("should reset all providers", async () => {
			limiter.configure("github", { maxRequests: 2, windowMs: 60000 });
			limiter.configure("jira", { maxRequests: 3, windowMs: 60000 });

			await limiter.checkLimit("github");
			await limiter.checkLimit("jira");

			limiter.resetAll();

			expect(limiter.getStatus("github").remaining).toBe(2);
			expect(limiter.getStatus("jira").remaining).toBe(3);
		});
	});

	describe("getAllStatuses", () => {
		it("should return statuses for all providers", () => {
			limiter.configure("github", { maxRequests: 100, windowMs: 60000 });
			limiter.configure("jira", { maxRequests: 50, windowMs: 30000 });

			const statuses = limiter.getAllStatuses();

			expect(statuses.length).toBeGreaterThanOrEqual(2);
			expect(statuses.find((s) => s.providerId === "github")).toBeDefined();
			expect(statuses.find((s) => s.providerId === "jira")).toBeDefined();
		});
	});

	describe("updateFromHeaders", () => {
		beforeEach(() => {
			limiter.configure("github", {
				maxRequests: 100,
				windowMs: 60000,
				strategy: RateLimitStrategy.TOKEN_BUCKET,
			});
		});

		it("should update from Headers object", () => {
			const headers = new Headers({
				"x-ratelimit-remaining": "45",
				"x-ratelimit-limit": "100",
			});

			limiter.updateFromHeaders("github", headers);

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(45);
		});

		it("should update from plain object", () => {
			const headers = {
				"x-ratelimit-remaining": "30",
				"x-ratelimit-limit": "100",
			};

			limiter.updateFromHeaders("github", headers);

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(30);
		});

		it("should handle case-insensitive headers", () => {
			const headers = {
				"X-RateLimit-Remaining": "25",
				"X-RateLimit-Limit": "100",
			};

			limiter.updateFromHeaders("github", headers);

			const status = limiter.getStatus("github");
			expect(status.remaining).toBe(25);
		});

		it("should handle different header formats", () => {
			// GitHub style
			limiter.updateFromHeaders("github", {
				"x-ratelimit-remaining": "40",
				"x-ratelimit-limit": "100",
			});

			expect(limiter.getStatus("github").remaining).toBe(40);

			// Alternative format
			limiter.updateFromHeaders("github", {
				"ratelimit-remaining": "35",
				"ratelimit-limit": "100",
			});

			expect(limiter.getStatus("github").remaining).toBe(35);
		});

		it("should ignore updates for non-token-bucket strategies", () => {
			limiter.configure("jira", {
				maxRequests: 50,
				windowMs: 60000,
				strategy: RateLimitStrategy.SLIDING_WINDOW,
			});

			limiter.updateFromHeaders("jira", {
				"x-ratelimit-remaining": "10",
				"x-ratelimit-limit": "50",
			});

			// Should not affect sliding window strategy
			const status = limiter.getStatus("jira");
			expect(status.remaining).toBe(50);
		});
	});

	describe("edge cases", () => {
		it("should handle default config for unconfigured provider", async () => {
			expect(await limiter.checkLimit("unknown")).toBe(true);
		});

		it("should handle zero tokens gracefully", async () => {
			limiter.configure("github", {
				maxRequests: 0,
				windowMs: 60000,
				strategy: RateLimitStrategy.TOKEN_BUCKET,
			});

			expect(await limiter.checkLimit("github")).toBe(false);
		});

		it("should handle very short windows", async () => {
			limiter.configure("github", {
				maxRequests: 1,
				windowMs: 100,
				strategy: RateLimitStrategy.FIXED_WINDOW,
			});

			await limiter.checkLimit("github");

			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(await limiter.checkLimit("github")).toBe(true);
		});
	});
});
