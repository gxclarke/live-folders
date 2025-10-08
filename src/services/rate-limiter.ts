/**
 * Rate Limiter Service
 *
 * Manages API rate limiting to prevent exceeding provider quotas.
 * Implements token bucket and sliding window algorithms.
 */

import { Logger } from "../utils/logger";

const logger = new Logger("RateLimiter");

/**
 * Rate limit configuration for a provider
 */
export interface RateLimitConfig {
	/** Maximum requests per window */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Strategy to use */
	strategy?: RateLimitStrategy;
}

/**
 * Rate limiting strategies
 */
export enum RateLimitStrategy {
	/** Token bucket algorithm */
	TOKEN_BUCKET = "token_bucket",
	/** Sliding window algorithm */
	SLIDING_WINDOW = "sliding_window",
	/** Fixed window algorithm */
	FIXED_WINDOW = "fixed_window",
}

/**
 * Rate limit status for a provider
 */
export interface RateLimitStatus {
	/** Provider ID */
	providerId: string;
	/** Remaining requests in current window */
	remaining: number;
	/** Maximum requests allowed */
	limit: number;
	/** Time until window resets (ms) */
	resetIn: number;
	/** Whether currently rate limited */
	isLimited: boolean;
}

/**
 * Request tracking for sliding window
 */
interface RequestLog {
	timestamp: number;
}

/**
 * Token bucket state
 */
interface TokenBucket {
	tokens: number;
	lastRefill: number;
}

/**
 * Rate Limiter Service
 *
 * Singleton service for managing API rate limits across providers
 */
export class RateLimiter {
	private static instance: RateLimiter;

	/** Rate limit configurations per provider */
	private configs: Map<string, RateLimitConfig> = new Map();

	/** Request logs for sliding window strategy */
	private requestLogs: Map<string, RequestLog[]> = new Map();

	/** Token buckets for token bucket strategy */
	private tokenBuckets: Map<string, TokenBucket> = new Map();

	/** Fixed window counters */
	private fixedWindows: Map<string, { count: number; windowStart: number }> = new Map();

	/** Default rate limit configuration */
	private readonly DEFAULT_CONFIG: RateLimitConfig = {
		maxRequests: 60,
		windowMs: 60000, // 1 minute
		strategy: RateLimitStrategy.TOKEN_BUCKET,
	};

	private constructor() {
		// Cleanup old request logs periodically
		setInterval(() => this.cleanup(), 60000); // Every minute
		logger.info("RateLimiter initialized");
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): RateLimiter {
		if (!RateLimiter.instance) {
			RateLimiter.instance = new RateLimiter();
		}
		return RateLimiter.instance;
	}

	/**
	 * Configure rate limiting for a provider
	 */
	public configure(providerId: string, config: RateLimitConfig): void {
		this.configs.set(providerId, {
			...config,
			strategy: config.strategy || RateLimitStrategy.TOKEN_BUCKET,
		});

		// Initialize strategy-specific state
		if (config.strategy === RateLimitStrategy.TOKEN_BUCKET) {
			this.tokenBuckets.set(providerId, {
				tokens: config.maxRequests,
				lastRefill: Date.now(),
			});
		}

		logger.info(
			`Rate limit configured for ${providerId}: ${config.maxRequests} requests per ${config.windowMs}ms`,
		);
	}

	/**
	 * Check if a request can be made (and consume a token if allowed)
	 */
	public async checkLimit(providerId: string): Promise<boolean> {
		const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;

		switch (config.strategy) {
			case RateLimitStrategy.TOKEN_BUCKET:
				return this.checkTokenBucket(providerId, config);

			case RateLimitStrategy.SLIDING_WINDOW:
				return this.checkSlidingWindow(providerId, config);

			case RateLimitStrategy.FIXED_WINDOW:
				return this.checkFixedWindow(providerId, config);

			default:
				return this.checkTokenBucket(providerId, config);
		}
	}

	/**
	 * Token bucket algorithm implementation
	 */
	private checkTokenBucket(providerId: string, config: RateLimitConfig): boolean {
		let bucket = this.tokenBuckets.get(providerId);

		if (!bucket) {
			bucket = {
				tokens: config.maxRequests,
				lastRefill: Date.now(),
			};
			this.tokenBuckets.set(providerId, bucket);
		}

		// Refill tokens based on time elapsed
		const now = Date.now();
		const timePassed = now - bucket.lastRefill;
		const refillRate = config.maxRequests / config.windowMs;
		const tokensToAdd = timePassed * refillRate;

		bucket.tokens = Math.min(config.maxRequests, bucket.tokens + tokensToAdd);
		bucket.lastRefill = now;

		// Check if we have tokens available
		if (bucket.tokens >= 1) {
			bucket.tokens -= 1;
			return true;
		}

		logger.warn(`Rate limit exceeded for ${providerId} (token bucket)`);
		return false;
	}

	/**
	 * Sliding window algorithm implementation
	 */
	private checkSlidingWindow(providerId: string, config: RateLimitConfig): boolean {
		const now = Date.now();
		const windowStart = now - config.windowMs;

		// Get request logs for this provider
		let logs = this.requestLogs.get(providerId) || [];

		// Remove requests outside current window
		logs = logs.filter((log) => log.timestamp > windowStart);

		// Check if we're under the limit
		if (logs.length < config.maxRequests) {
			logs.push({ timestamp: now });
			this.requestLogs.set(providerId, logs);
			return true;
		}

		logger.warn(`Rate limit exceeded for ${providerId} (sliding window)`);
		return false;
	}

	/**
	 * Fixed window algorithm implementation
	 */
	private checkFixedWindow(providerId: string, config: RateLimitConfig): boolean {
		const now = Date.now();
		let window = this.fixedWindows.get(providerId);

		if (!window) {
			window = {
				count: 0,
				windowStart: now,
			};
			this.fixedWindows.set(providerId, window);
		}

		// Check if we need to reset the window
		if (now - window.windowStart >= config.windowMs) {
			window.count = 0;
			window.windowStart = now;
		}

		// Check if we're under the limit
		if (window.count < config.maxRequests) {
			window.count++;
			return true;
		}

		logger.warn(`Rate limit exceeded for ${providerId} (fixed window)`);
		return false;
	}

	/**
	 * Get current rate limit status for a provider
	 */
	public getStatus(providerId: string): RateLimitStatus {
		const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;
		const now = Date.now();

		let remaining = 0;
		let resetIn = 0;

		switch (config.strategy) {
			case RateLimitStrategy.TOKEN_BUCKET: {
				const bucket = this.tokenBuckets.get(providerId);
				if (bucket) {
					// Refill tokens
					const timePassed = now - bucket.lastRefill;
					const refillRate = config.maxRequests / config.windowMs;
					const tokensToAdd = timePassed * refillRate;
					remaining = Math.min(config.maxRequests, Math.floor(bucket.tokens + tokensToAdd));

					// Time until next token
					if (remaining === 0) {
						resetIn = Math.ceil(config.windowMs / config.maxRequests);
					}
				} else {
					remaining = config.maxRequests;
				}
				break;
			}

			case RateLimitStrategy.SLIDING_WINDOW: {
				const logs = this.requestLogs.get(providerId) || [];
				const windowStart = now - config.windowMs;
				const validLogs = logs.filter((log) => log.timestamp > windowStart);
				remaining = Math.max(0, config.maxRequests - validLogs.length);

				// Time until oldest request expires
				if (validLogs.length > 0) {
					const oldestLog = validLogs[0];
					resetIn = Math.max(0, oldestLog.timestamp + config.windowMs - now);
				}
				break;
			}

			case RateLimitStrategy.FIXED_WINDOW: {
				const window = this.fixedWindows.get(providerId);
				if (window) {
					remaining = Math.max(0, config.maxRequests - window.count);
					resetIn = Math.max(0, window.windowStart + config.windowMs - now);
				} else {
					remaining = config.maxRequests;
				}
				break;
			}
		}

		return {
			providerId,
			remaining,
			limit: config.maxRequests,
			resetIn,
			isLimited: remaining === 0,
		};
	}

	/**
	 * Wait until rate limit allows the next request
	 */
	public async waitForSlot(providerId: string): Promise<void> {
		const status = this.getStatus(providerId);

		if (!status.isLimited) {
			return;
		}

		logger.info(`Waiting ${status.resetIn}ms for rate limit to reset for ${providerId}`);

		await new Promise((resolve) => setTimeout(resolve, status.resetIn));
	}

	/**
	 * Execute an operation with rate limiting
	 */
	public async execute<T>(providerId: string, operation: () => Promise<T>): Promise<T> {
		// Check rate limit
		const allowed = await this.checkLimit(providerId);

		if (!allowed) {
			// Wait for next available slot
			await this.waitForSlot(providerId);

			// Try again
			return this.execute(providerId, operation);
		}

		// Execute the operation
		return operation();
	}

	/**
	 * Reset rate limit for a provider
	 */
	public reset(providerId: string): void {
		const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;

		switch (config.strategy) {
			case RateLimitStrategy.TOKEN_BUCKET:
				this.tokenBuckets.set(providerId, {
					tokens: config.maxRequests,
					lastRefill: Date.now(),
				});
				break;

			case RateLimitStrategy.SLIDING_WINDOW:
				this.requestLogs.set(providerId, []);
				break;

			case RateLimitStrategy.FIXED_WINDOW:
				this.fixedWindows.set(providerId, {
					count: 0,
					windowStart: Date.now(),
				});
				break;
		}

		logger.info(`Rate limit reset for ${providerId}`);
	}

	/**
	 * Reset all rate limits
	 */
	public resetAll(): void {
		this.tokenBuckets.clear();
		this.requestLogs.clear();
		this.fixedWindows.clear();
		logger.info("All rate limits reset");
	}

	/**
	 * Clean up old request logs
	 */
	private cleanup(): void {
		const now = Date.now();

		// Clean up sliding window logs
		for (const [providerId, logs] of this.requestLogs.entries()) {
			const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;
			const windowStart = now - config.windowMs;

			const validLogs = logs.filter((log) => log.timestamp > windowStart);

			if (validLogs.length === 0) {
				this.requestLogs.delete(providerId);
			} else {
				this.requestLogs.set(providerId, validLogs);
			}
		}

		// Clean up old fixed windows
		for (const [providerId, window] of this.fixedWindows.entries()) {
			const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;

			if (now - window.windowStart >= config.windowMs * 2) {
				this.fixedWindows.delete(providerId);
			}
		}

		logger.debug("Rate limiter cleanup completed");
	}

	/**
	 * Get all provider statuses
	 */
	public getAllStatuses(): RateLimitStatus[] {
		const providerIds = new Set([
			...this.configs.keys(),
			...this.tokenBuckets.keys(),
			...this.requestLogs.keys(),
			...this.fixedWindows.keys(),
		]);

		return Array.from(providerIds).map((providerId) => this.getStatus(providerId));
	}

	/**
	 * Update rate limit from API response headers
	 */
	public updateFromHeaders(providerId: string, headers: Headers | Record<string, string>): void {
		// Common rate limit headers
		const remaining =
			this.getHeader(headers, "x-ratelimit-remaining") ||
			this.getHeader(headers, "x-rate-limit-remaining") ||
			this.getHeader(headers, "ratelimit-remaining");

		const limit =
			this.getHeader(headers, "x-ratelimit-limit") ||
			this.getHeader(headers, "x-rate-limit-limit") ||
			this.getHeader(headers, "ratelimit-limit");

		const reset =
			this.getHeader(headers, "x-ratelimit-reset") ||
			this.getHeader(headers, "x-rate-limit-reset") ||
			this.getHeader(headers, "ratelimit-reset");

		if (remaining && limit) {
			const config = this.configs.get(providerId) || this.DEFAULT_CONFIG;

			// Update token bucket to match server state
			if (config.strategy === RateLimitStrategy.TOKEN_BUCKET) {
				this.tokenBuckets.set(providerId, {
					tokens: Number.parseInt(remaining, 10),
					lastRefill: Date.now(),
				});
			}

			logger.debug(`Updated rate limit for ${providerId} from headers: ${remaining}/${limit}`);
		}

		if (reset) {
			const resetTime = Number.parseInt(reset, 10) * 1000; // Convert to ms
			const now = Date.now();

			if (resetTime > now) {
				logger.info(
					`Rate limit will reset for ${providerId} in ${Math.ceil((resetTime - now) / 1000)}s`,
				);
			}
		}
	}

	/**
	 * Get header value (case-insensitive)
	 */
	private getHeader(headers: Headers | Record<string, string>, name: string): string | null {
		if (headers instanceof Headers) {
			return headers.get(name);
		}

		// Check with exact case first
		if (headers[name]) {
			return headers[name];
		}

		// Check case-insensitive
		const lowerName = name.toLowerCase();
		for (const [key, value] of Object.entries(headers)) {
			if (key.toLowerCase() === lowerName) {
				return value;
			}
		}

		return null;
	}
}

/**
 * Export singleton instance
 */
export const rateLimiter = RateLimiter.getInstance();
