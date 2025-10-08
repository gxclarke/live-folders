import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	RetryService,
	RetryStrategy,
	RetryableErrorType,
	withRetry,
} from "../retry-service";

describe("RetryService", () => {
	let service: RetryService;

	beforeEach(() => {
		service = RetryService.getInstance();
		vi.clearAllMocks();
	});

	describe("getInstance", () => {
		it("should return the same instance (singleton)", () => {
			const instance1 = RetryService.getInstance();
			const instance2 = RetryService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("execute", () => {
		it("should succeed on first attempt", async () => {
			const operation = vi.fn().mockResolvedValue("success");

			const result = await service.execute(operation);

			expect(result.success).toBe(true);
			expect(result.value).toBe("success");
			expect(result.attempts).toBe(1);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure and eventually succeed", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 }) // Server error (retryable)
				.mockRejectedValueOnce({ status: 503 })
				.mockResolvedValue("success");

			const result = await service.execute(operation, {
				maxRetries: 3,
				initialDelay: 10,
				strategy: RetryStrategy.CONSTANT,
				useJitter: false,
			});

			expect(result.success).toBe(true);
			expect(result.value).toBe("success");
			expect(result.attempts).toBe(3);
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should fail after exhausting retries", async () => {
			const error = { status: 503 }; // Retryable error
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 2,
				initialDelay: 10,
				strategy: RetryStrategy.CONSTANT,
				useJitter: false,
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe(error);
			expect(result.attempts).toBe(3); // initial + 2 retries
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should not retry non-retryable errors", async () => {
			const error = new Error("Validation error");
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 3,
			});

			expect(result.success).toBe(false);
			expect(result.attempts).toBe(1); // No retries
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should call onRetry callback on each retry", async () => {
			const onRetry = vi.fn();
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 }) // Retryable error
				.mockResolvedValue("success");

			await service.execute(operation, {
				maxRetries: 2,
				initialDelay: 10,
				strategy: RetryStrategy.CONSTANT,
				useJitter: false,
				onRetry,
			});

			expect(onRetry).toHaveBeenCalledTimes(1);
			expect(onRetry).toHaveBeenCalledWith(1, 10, expect.anything());
		});

		it("should use custom isRetryable function", async () => {
			const error = new Error("Custom error");
			const operation = vi.fn().mockRejectedValue(error);
			const isRetryable = vi.fn().mockReturnValue(true);

			const result = await service.execute(operation, {
				maxRetries: 2,
				initialDelay: 10,
				strategy: RetryStrategy.CONSTANT,
				useJitter: false,
				isRetryable,
			});

			expect(isRetryable).toHaveBeenCalledWith(error);
			expect(result.attempts).toBe(3);
		});
	});

	describe("retry strategies", () => {
		describe("CONSTANT strategy", () => {
			it("should use constant delay between retries", async () => {
				const onRetry = vi.fn();
				const operation = vi
					.fn()
					.mockRejectedValueOnce({ status: 503 })
					.mockRejectedValueOnce({ status: 503 })
					.mockResolvedValue("success");

				await service.execute(operation, {
					maxRetries: 2,
					initialDelay: 100,
					strategy: RetryStrategy.CONSTANT,
					useJitter: false,
					onRetry,
				});

				expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.anything());
				expect(onRetry).toHaveBeenNthCalledWith(2, 2, 100, expect.anything());
			});
		});

		describe("LINEAR strategy", () => {
			it("should use linear increasing delay", async () => {
				const onRetry = vi.fn();
				const operation = vi
					.fn()
					.mockRejectedValueOnce({ status: 503 })
					.mockRejectedValueOnce({ status: 503 })
					.mockResolvedValue("success");

				await service.execute(operation, {
					maxRetries: 2,
					initialDelay: 100,
					strategy: RetryStrategy.LINEAR,
					useJitter: false,
					onRetry,
				});

				expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.anything());
				expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.anything());
			});
		});

		describe("EXPONENTIAL strategy", () => {
			it("should use exponential backoff", async () => {
				const onRetry = vi.fn();
				const operation = vi
					.fn()
					.mockRejectedValueOnce({ status: 503 })
					.mockRejectedValueOnce({ status: 503 })
					.mockRejectedValueOnce({ status: 503 })
					.mockResolvedValue("success");

				await service.execute(operation, {
					maxRetries: 3,
					initialDelay: 100,
					strategy: RetryStrategy.EXPONENTIAL,
					backoffMultiplier: 2,
					useJitter: false,
					onRetry,
				});

				expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.anything()); // 100 * 2^0
				expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.anything()); // 100 * 2^1
				expect(onRetry).toHaveBeenNthCalledWith(3, 3, 400, expect.anything()); // 100 * 2^2
			});

			it("should respect maxDelay cap", async () => {
				const onRetry = vi.fn();
				const operation = vi
					.fn()
					.mockRejectedValueOnce({ status: 503 })
					.mockRejectedValueOnce({ status: 503 })
					.mockResolvedValue("success");

				await service.execute(operation, {
					maxRetries: 2,
					initialDelay: 1000,
					maxDelay: 1500,
					strategy: RetryStrategy.EXPONENTIAL,
					backoffMultiplier: 2,
					useJitter: false,
					onRetry,
				});

				expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, expect.anything());
				expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1500, expect.anything()); // Capped at maxDelay
			});
		});

		describe("jitter", () => {
			it("should apply jitter when enabled", async () => {
				const onRetry = vi.fn();
				const operation = vi
					.fn()
					.mockRejectedValueOnce({ status: 503 })
					.mockResolvedValue("success");

				await service.execute(operation, {
					maxRetries: 1,
					initialDelay: 100,
					strategy: RetryStrategy.CONSTANT,
					useJitter: true,
					onRetry,
				});

				const delay = onRetry.mock.calls[0][1];
				// Jitter should be within ±25% of 100 (75-125)
				expect(delay).toBeGreaterThanOrEqual(75);
				expect(delay).toBeLessThanOrEqual(125);
			});
		});
	});

	describe("error type detection", () => {
		it("should detect network errors", async () => {
			const error = new TypeError("Network request failed");
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2); // Should retry
		});

		it("should detect timeout errors", async () => {
			const error = new Error("Request timeout");
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2); // Should retry
		});

		it("should detect rate limit errors (429)", async () => {
			const error = { status: 429, message: "Too Many Requests" };
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2); // Should retry
		});

		it("should detect server errors (5xx)", async () => {
			const error = { status: 503, message: "Service Unavailable" };
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2); // Should retry
		});

		it("should detect auth expired errors", async () => {
			const error = new Error("Token expired");
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2); // Should retry
		});

		it("should not retry client errors (4xx except 408, 429)", async () => {
			const error = { status: 400, message: "Bad Request" };
			const operation = vi.fn().mockRejectedValue(error);

			const result = await service.execute(operation, {
				maxRetries: 2,
			});

			expect(result.attempts).toBe(1); // No retry
		});
	});

	describe("retryOn", () => {
		it("should retry only on specific error type - NETWORK", async () => {
			const networkError = new TypeError("Network error");
			const operation = vi.fn().mockRejectedValue(networkError);

			const result = await service.retryOn(operation, RetryableErrorType.NETWORK, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2);
		});

		it("should retry only on specific error type - RATE_LIMIT", async () => {
			const rateLimitError = { status: 429 };
			const operation = vi.fn().mockRejectedValue(rateLimitError);

			const result = await service.retryOn(operation, RetryableErrorType.RATE_LIMIT, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2);
		});

		it("should retry only on specific error type - SERVER_ERROR", async () => {
			const serverError = { status: 500 };
			const operation = vi.fn().mockRejectedValue(serverError);

			const result = await service.retryOn(operation, RetryableErrorType.SERVER_ERROR, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(2);
		});

		it("should not retry when error type doesn't match", async () => {
			const otherError = new Error("Some other error");
			const operation = vi.fn().mockRejectedValue(otherError);

			const result = await service.retryOn(operation, RetryableErrorType.NETWORK, {
				maxRetries: 2,
			});

			expect(result.attempts).toBe(1); // No retry
		});
	});

	describe("wrap", () => {
		it("should wrap operation with retry logic", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 }) // Retryable error
				.mockResolvedValue("success");

			const wrapped = service.wrap(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			const result = await wrapped();

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it("should throw error if retries exhausted", async () => {
			const error = { status: 503 };
			const operation = vi.fn().mockRejectedValue(error);

			const wrapped = service.wrap(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			await expect(wrapped()).rejects.toThrow();
		});
	});

	describe("withRetry helper", () => {
		it("should retry operation using helper function", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 }) // Retryable error
				.mockResolvedValue("success");

			const result = await withRetry(operation, {
				maxRetries: 1,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result).toBe("success");
			expect(operation).toHaveBeenCalledTimes(2);
		});

		it("should throw if retries exhausted", async () => {
			const error = { status: 503 };
			const operation = vi.fn().mockRejectedValue(error);

			await expect(
				withRetry(operation, {
					maxRetries: 1,
					initialDelay: 10,
					useJitter: false,
				}),
			).rejects.toThrow();
		});
	});

	describe("retry result metadata", () => {
		it("should track total time spent", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 })
				.mockResolvedValue("success");

			const result = await service.execute(operation, {
				maxRetries: 1,
				initialDelay: 50,
				strategy: RetryStrategy.CONSTANT,
				useJitter: false,
			});

			expect(result.totalTime).toBeGreaterThanOrEqual(50);
		});

		it("should track number of attempts", async () => {
			const operation = vi
				.fn()
				.mockRejectedValueOnce({ status: 503 })
				.mockRejectedValueOnce({ status: 503 })
				.mockResolvedValue("success");

			const result = await service.execute(operation, {
				maxRetries: 2,
				initialDelay: 10,
				useJitter: false,
			});

			expect(result.attempts).toBe(3);
		});
	});

	describe("edge cases", () => {
		it("should handle maxRetries = 0", async () => {
			const operation = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await service.execute(operation, {
				maxRetries: 0,
			});

			expect(result.success).toBe(false);
			expect(result.attempts).toBe(1);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should handle string errors", async () => {
			const operation = vi.fn().mockRejectedValue("String error");

			const result = await service.execute(operation, {
				maxRetries: 0,
			});

			expect(result.error).toBe("String error");
		});

		it("should handle null/undefined errors", async () => {
			const operation = vi.fn().mockRejectedValue(null);

			const result = await service.execute(operation, {
				maxRetries: 0,
			});

			expect(result.error).toBe(null);
		});
	});
});
