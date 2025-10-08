/**
 * Logger Utility
 * Structured logging system with different log levels and debug mode
 */

import { storageManager } from "@/services/storage";

/**
 * Log levels
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
}

/**
 * Log level priority (for filtering)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	[LogLevel.DEBUG]: 0,
	[LogLevel.INFO]: 1,
	[LogLevel.WARN]: 2,
	[LogLevel.ERROR]: 3,
};

/**
 * Sensitive data patterns to redact
 */
const SENSITIVE_PATTERNS = [
	/token/i,
	/password/i,
	/secret/i,
	/key/i,
	/auth/i,
	/bearer/i,
	/api[_-]?key/i,
	/access[_-]?token/i,
	/refresh[_-]?token/i,
];

/**
 * Log entry structure
 */
export interface LogEntry {
	timestamp: number;
	level: LogLevel;
	category: string;
	message: string;
	data?: unknown;
	error?: Error;
}

/**
 * Logger class
 */
export class Logger {
	private category: string;
	private static debugMode = false;
	private static minLevel: LogLevel = LogLevel.INFO;

	constructor(category: string) {
		this.category = category;
	}

	/**
	 * Initialize logger with settings
	 */
	public static async initialize(): Promise<void> {
		const settings = await storageManager.getSettings();
		Logger.debugMode = settings.debugMode;
		Logger.minLevel = settings.debugMode ? LogLevel.DEBUG : LogLevel.INFO;
	}

	/**
	 * Set debug mode
	 */
	public static setDebugMode(enabled: boolean): void {
		Logger.debugMode = enabled;
		Logger.minLevel = enabled ? LogLevel.DEBUG : LogLevel.INFO;
	}

	/**
	 * Check if debug mode is enabled
	 */
	public static isDebugEnabled(): boolean {
		return Logger.debugMode;
	}

	/**
	 * Set minimum log level
	 */
	public static setMinLevel(level: LogLevel): void {
		Logger.minLevel = level;
	}

	/**
	 * Log debug message
	 */
	public debug(message: string, data?: unknown): void {
		this.log(LogLevel.DEBUG, message, data);
	}

	/**
	 * Log info message
	 */
	public info(message: string, data?: unknown): void {
		this.log(LogLevel.INFO, message, data);
	}

	/**
	 * Log warning message
	 */
	public warn(message: string, data?: unknown): void {
		this.log(LogLevel.WARN, message, data);
	}

	/**
	 * Log error message
	 */
	public error(message: string, error?: Error | unknown, data?: unknown): void {
		const errorObj = error instanceof Error ? error : undefined;
		const errorData = error instanceof Error ? data : error;

		this.log(LogLevel.ERROR, message, errorData, errorObj);
	}

	/**
	 * Log a message with specific level
	 */
	private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
		// Check if we should log this level
		if (!this.shouldLog(level)) {
			return;
		}

		// Create log entry
		const entry: LogEntry = {
			timestamp: Date.now(),
			level,
			category: this.category,
			message,
			data: this.sanitizeData(data),
			error,
		};

		// Output to console
		this.outputToConsole(entry);
	}

	/**
	 * Check if we should log this level
	 */
	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[Logger.minLevel];
	}

	/**
	 * Output log entry to console
	 */
	private outputToConsole(entry: LogEntry): void {
		const timestamp = new Date(entry.timestamp).toISOString();
		const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;

		// Choose console method based on level
		const consoleMethod = this.getConsoleMethod(entry.level);

		if (entry.error) {
			consoleMethod(prefix, entry.message, entry.error);
			if (entry.data) {
				console.log("Data:", entry.data);
			}
		} else if (entry.data !== undefined) {
			consoleMethod(prefix, entry.message, entry.data);
		} else {
			consoleMethod(prefix, entry.message);
		}
	}

	/**
	 * Get appropriate console method for log level
	 */
	private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
		switch (level) {
			case LogLevel.DEBUG:
				return console.debug;
			case LogLevel.INFO:
				return console.info;
			case LogLevel.WARN:
				return console.warn;
			case LogLevel.ERROR:
				return console.error;
			default:
				return console.log;
		}
	}

	/**
	 * Sanitize data to remove sensitive information
	 */
	private sanitizeData(data: unknown): unknown {
		if (!data) {
			return data;
		}

		// Don't sanitize in debug mode (developer can see everything)
		if (Logger.debugMode) {
			return data;
		}

		try {
			return this.sanitizeValue(data);
		} catch {
			// If sanitization fails, return a safe placeholder
			return "[sanitization error]";
		}
	}

	/**
	 * Recursively sanitize a value
	 */
	private sanitizeValue(value: unknown): unknown {
		if (value === null || value === undefined) {
			return value;
		}

		// Handle primitives
		if (typeof value !== "object") {
			return value;
		}

		// Handle arrays
		if (Array.isArray(value)) {
			return value.map((item) => this.sanitizeValue(item));
		}

		// Handle objects
		const sanitized: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
			// Check if key looks sensitive
			if (this.isSensitiveKey(key)) {
				sanitized[key] = "[REDACTED]";
			} else {
				sanitized[key] = this.sanitizeValue(val);
			}
		}

		return sanitized;
	}

	/**
	 * Check if a key name looks sensitive
	 */
	private isSensitiveKey(key: string): boolean {
		return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
	}

	/**
	 * Create a child logger with a sub-category
	 */
	public child(subCategory: string): Logger {
		return new Logger(`${this.category}:${subCategory}`);
	}

	/**
	 * Group related log messages
	 */
	public group(label: string, fn: () => void): void {
		console.group(`[${this.category}] ${label}`);
		try {
			fn();
		} finally {
			console.groupEnd();
		}
	}

	/**
	 * Time an operation
	 */
	public async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
		const start = performance.now();
		try {
			const result = await fn();
			const duration = performance.now() - start;
			this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
			return result;
		} catch (error) {
			const duration = performance.now() - start;
			this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
			throw error;
		}
	}
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: string): Logger {
	return new Logger(category);
}

/**
 * Global logger for general use
 */
export const logger = createLogger("LiveFolders");
