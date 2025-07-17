/**
 * StorageProvider - Abstract class for storage providers
 *
 * Provides a unified interface for different storage systems
 * (LocalStorage, IndexedDB, external APIs, etc.)
 */

import type { StorageProvider as IStorageProvider } from "../types";

/**
 * Abstract base class for storage providers
 */
export abstract class StorageProvider implements IStorageProvider {
	/**
	 * Save data
	 * @param key Storage key
	 * @param data Data to save
	 */
	abstract save(key: string, data: unknown): Promise<void>;

	/**
	 * Load data
	 * @param key Storage key
	 * @returns Loaded data, or null if not exists
	 */
	abstract load<T>(key: string): Promise<T | null>;

	/**
	 * Remove data
	 * @param key Key to remove
	 */
	abstract remove(key: string): Promise<void>;

	/**
	 * Get all keys
	 * @returns Array of keys
	 */
	abstract getAllKeys(): Promise<string[]>;

	/**
	 * Clear storage
	 */
	abstract clear(): Promise<void>;

	/**
	 * Check if storage is available
	 */
	abstract isAvailable(): boolean;

	/**
	 * Check storage size limit
	 * @param data Data to be saved
	 * @returns Whether it can be stored
	 */
	abstract canStore(data: unknown): Promise<boolean>;

	/**
	 * Get storage usage
	 * @returns Usage information
	 */
	abstract getStorageInfo(): Promise<StorageInfo>;

	// ============================================================================
	// Common utility methods
	// ============================================================================

	/**
	 * Serialize data
	 */
	protected serialize(data: unknown): string {
		try {
			return JSON.stringify(data, this.replacer);
		} catch (error) {
			throw new Error(`Failed to serialize data: ${error}`);
		}
	}

	/**
	 * Deserialize data
	 */
	protected deserialize<T>(data: string): T {
		try {
			return JSON.parse(data, this.reviver);
		} catch (error) {
			throw new Error(`Failed to deserialize data: ${error}`);
		}
	}

	/**
	 * Validate data
	 */
	protected validateKey(key: string): void {
		if (!key || typeof key !== "string" || key.trim().length === 0) {
			throw new Error("Invalid key: key must be a non-empty string");
		}

		if (key.length > 256) {
			throw new Error("Invalid key: key must be less than 256 characters");
		}
	}

	/**
	 * Get data size (in bytes)
	 */
	protected getDataSize(data: string): number {
		return new Blob([data]).size;
	}

	/**
	 * Generate safe key name
	 */
	protected sanitizeKey(key: string): string {
		return key.replace(/[^a-zA-Z0-9_\-:.]/g, "_");
	}

	// ============================================================================
	// JSON serialization helpers
	// ============================================================================

	/**
	 * Replacer function for JSON.stringify
	 * Properly serializes special objects like Date and Map
	 */
	private replacer(key: string, value: unknown): unknown {
		// Process Date objects
		if (value instanceof Date) {
			return {
				__type: "Date",
				value: value.toISOString(),
			};
		}

		// Process Map objects
		if (value instanceof Map) {
			return {
				__type: "Map",
				value: Array.from(value.entries()),
			};
		}

		// Process Set objects
		if (value instanceof Set) {
			return {
				__type: "Set",
				value: Array.from(value),
			};
		}

		return value;
	}

	/**
	 * Reviver function for JSON.parse
	 * Restores serialized special objects
	 */
	private reviver(key: string, value: unknown): unknown {
		if (typeof value === "object" && value !== null && "__type" in value) {
			const typedValue = value as { __type: string; value: unknown };
			switch (typedValue.__type) {
				case "Date":
					return new Date(typedValue.value as string);
				case "Map":
					return new Map(typedValue.value as [unknown, unknown][]);
				case "Set":
					return new Set(typedValue.value as unknown[]);
			}
		}

		return value;
	}
}

/**
 * Storage information
 */
export interface StorageInfo {
	/** Usage (bytes) */
	used: number;
	/** Available space (bytes, undefined if unknown) */
	available?: number;
	/** Total capacity (bytes, undefined if unknown) */
	total?: number;
	/** Number of keys */
	keyCount: number;
	/** Last update time */
	lastUpdated: Date;
}

/**
 * Storage error class
 */
export class StorageError extends Error {
	constructor(
		message: string,
		public readonly code: StorageErrorCode,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "StorageError";
	}
}

/**
 * Storage error codes
 */
export enum StorageErrorCode {
	NOT_AVAILABLE = "NOT_AVAILABLE",
	QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
	PERMISSION_DENIED = "PERMISSION_DENIED",
	NETWORK_ERROR = "NETWORK_ERROR",
	INVALID_KEY = "INVALID_KEY",
	INVALID_DATA = "INVALID_DATA",
	SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
	SAVE_ERROR = "SAVE_ERROR",
	LOAD_ERROR = "LOAD_ERROR",
	REMOVE_ERROR = "REMOVE_ERROR",
	CLEAR_ERROR = "CLEAR_ERROR",
	INFO_ERROR = "INFO_ERROR",
}
