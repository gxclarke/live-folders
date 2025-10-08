/**
 * Retry Service
 *
 * Provides advanced retry logic with exponential backoff, jitter,
 * and configurable retry strategies for handling transient failures.
 */

import { Logger } from "../utils/logger";

const logger = new Logger("RetryService");

/**
 * Retry strategy types
 */
export enum RetryStrategy {
	/** Constant delay between retries */
	CONSTANT = "constant",
	/** Exponential backoff */
	EXPONENTIAL = "exponential",
	/** Linear increase in delay */
	LINEAR = "linear",
}

/**
 * Error types that can be retried
 */
export enum RetryableErrorType {
	/** Network connectivity issues */
	NETWORK = "network",
	/** Rate limiting */
	RATE_LIMIT = "rate_limit",
	/** Temporary server errors (5xx) */
	SERVER_ERROR = "server_error",
	/** Timeout */
	TIMEOUT = "timeout",
	/** Authentication token expired */
	AUTH_EXPIRED = "auth_expired",
	/** Unknown transient error */
	TRANSIENT = "transient",
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
	/** Maximum number of retry attempts */
	maxRetries?: number;
	/** Initial delay in milliseconds */
	initialDelay?: number;
	/** Maximum delay in milliseconds */
	maxDelay?: number;
	/** Retry strategy */
	strategy?: RetryStrategy;
	/** Backoff multiplier (for exponential strategy) */
	backoffMultiplier?: number;
	/** Add random jitter to delays */
	useJitter?: boolean;
	/** Custom function to determine if error is retryable */
	isRetryable?: (error: unknown) => boolean;
	/** Callback on each retry attempt */
	onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

/**
 * Retry result information
 */
export interface RetryResult<T> {
	/** Whether the operation succeeded */
	success: boolean;
	/** The result value (if successful) */
	value?: T;
	/** The error (if failed) */
	error?: unknown;
	/** Number of attempts made */
	attempts: number;
	/** Total time spent retrying (ms) */
	totalTime: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "isRetryable" | "onRetry">> = {
	maxRetries: 3,
	initialDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	strategy: RetryStrategy.EXPONENTIAL,
	backoffMultiplier: 2,
	useJitter: true,
};

/**
 * Retry Service
 *
 * Provides retry functionality with various strategies and configuration options
 */
export class RetryService {
	private static instance: RetryService;

	private constructor() {
		logger.info("RetryService initialized");
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): RetryService {
		if (!RetryService.instance) {
			RetryService.instance = new RetryService();
		}
		return RetryService.instance;
	}

	/**
	 * Execute an operation with retry logic
	 */
	public async execute<T>(
		operation: () => Promise<T>,
		options: RetryOptions = {},
	): Promise<RetryResult<T>> {
		const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
		const startTime = Date.now();

		let lastError: unknown;
		let attempt = 0;

		while (attempt <= config.maxRetries) {
			try {
				const value = await operation();
				return {
					success: true,
					value,
					attempts: attempt + 1,
					totalTime: Date.now() - startTime,
				};
			} catch (error) {
				lastError = error;
				attempt++;

				// Check if we should retry
				if (attempt > config.maxRetries) {
					break;
				}

				// Check if error is retryable
				const isRetryable = options.isRetryable
					? options.isRetryable(error)
					: this.isDefaultRetryable(error);

				if (!isRetryable) {
					logger.warn(
						`Error is not retryable, failing immediately: ${this.getErrorMessage(error)}`,
					);
					break;
				}

				// Calculate delay
				const delay = this.calculateDelay(
					attempt,
					config.initialDelay,
					config.maxDelay,
					config.strategy,
					config.backoffMultiplier,
					config.useJitter,
				);

				logger.info(`Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms`);

				// Call onRetry callback if provided
				options.onRetry?.(attempt, delay, error);

				// Wait before retrying
				await this.sleep(delay);
			}
		}

		// All retries exhausted
		return {
			success: false,
			error: lastError,
			attempts: attempt,
			totalTime: Date.now() - startTime,
		};
	}

	/**
	 * Calculate delay for next retry
	 */
	private calculateDelay(
		attempt: number,
		initialDelay: number,
		maxDelay: number,
		strategy: RetryStrategy,
		backoffMultiplier: number,
		useJitter: boolean,
	): number {
		let delay: number;

		switch (strategy) {
			case RetryStrategy.CONSTANT:
				delay = initialDelay;
				break;

			case RetryStrategy.LINEAR:
				delay = initialDelay * attempt;
				break;

			case RetryStrategy.EXPONENTIAL:
				delay = initialDelay * backoffMultiplier ** (attempt - 1);
				break;

			default:
				delay = initialDelay;
		}

		// Apply max delay cap
		delay = Math.min(delay, maxDelay);

		// Apply jitter if enabled (±25% randomness)
		if (useJitter) {
			const jitterRange = delay * 0.25;
			const jitter = Math.random() * jitterRange * 2 - jitterRange;
			delay = Math.max(0, delay + jitter);
		}

		return Math.round(delay);
	}

	/**
	 * Default logic to determine if an error is retryable
	 */
	private isDefaultRetryable(error: unknown): boolean {
		// Network errors
		if (error instanceof TypeError && error.message.toLowerCase().includes("network")) {
			return true;
		}

		// Fetch errors with specific status codes
		if (this.isFetchError(error)) {
			const status = (error as { status?: number }).status;
			if (status) {
				// Retry on:
				// - 408 Request Timeout
				// - 429 Too Many Requests
				// - 500 Internal Server Error
				// - 502 Bad Gateway
				// - 503 Service Unavailable
				// - 504 Gateway Timeout
				return [408, 429, 500, 502, 503, 504].includes(status);
			}
		}

		// Timeout errors
		if (error instanceof Error && error.message.toLowerCase().includes("timeout")) {
			return true;
		}

		// Auth errors (token expired)
		if (
			error instanceof Error &&
			(error.message.toLowerCase().includes("unauthorized") ||
				error.message.toLowerCase().includes("token expired"))
		) {
			return true;
		}

		// Default: not retryable
		return false;
	}

	/**
	 * Check if error is from fetch API
	 */
	private isFetchError(error: unknown): boolean {
		return (
			typeof error === "object" &&
			error !== null &&
			"status" in error &&
			typeof (error as { status?: number }).status === "number"
		);
	}

	/**
	 * Get error message from unknown error type
	 */
	private getErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === "string") {
			return error;
		}
		return String(error);
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Create a retryable function with bound options
	 */
	public wrap<T>(operation: () => Promise<T>, options: RetryOptions = {}): () => Promise<T> {
		return async () => {
			const result = await this.execute(operation, options);
			if (result.success) {
				return result.value as T;
			}
			throw result.error;
		};
	}

	/**
	 * Retry a specific error type with custom logic
	 */
	public async retryOn<T>(
		operation: () => Promise<T>,
		errorType: RetryableErrorType,
		options: Omit<RetryOptions, "isRetryable"> = {},
	): Promise<RetryResult<T>> {
		return this.execute(operation, {
			...options,
			isRetryable: (error) => this.matchesErrorType(error, errorType),
		});
	}

	/**
	 * Match error against a specific error type
	 */
	private matchesErrorType(error: unknown, errorType: RetryableErrorType): boolean {
		switch (errorType) {
			case RetryableErrorType.NETWORK:
				return error instanceof TypeError && error.message.toLowerCase().includes("network");

			case RetryableErrorType.RATE_LIMIT:
				return this.isFetchError(error) && (error as { status: number }).status === 429;

			case RetryableErrorType.SERVER_ERROR:
				return (
					this.isFetchError(error) &&
					(error as { status: number }).status >= 500 &&
					(error as { status: number }).status < 600
				);

			case RetryableErrorType.TIMEOUT:
				return error instanceof Error && error.message.toLowerCase().includes("timeout");

			case RetryableErrorType.AUTH_EXPIRED:
				return (
					(error instanceof Error &&
						(error.message.toLowerCase().includes("unauthorized") ||
							error.message.toLowerCase().includes("token expired"))) ||
					(this.isFetchError(error) && (error as unknown as { status: number }).status === 401)
				);

			case RetryableErrorType.TRANSIENT:
				return this.isDefaultRetryable(error);

			default:
				return false;
		}
	}
}

/**
 * Export singleton instance
 */
export const retryService = RetryService.getInstance();

/**
 * Convenience decorator/wrapper for retrying operations
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const result = await retryService.execute(operation, options);
	if (result.success) {
		return result.value as T;
	}
	throw result.error;
}
