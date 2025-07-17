/**
 * Storage factory
 * Creates appropriate StorageProvider based on environment
 */

import type { StorageProvider } from "../storage/StorageProvider";
import { LocalStorageProvider } from "../storage/LocalStorageProvider";
import { ExternalStorageProvider } from "../storage/ExternalStorageProvider";
import type { ExternalStorageAdapter } from "../storage/ExternalStorageProvider";
import { detectEnvironment } from "./environmentDetector";

/**
 * Create default StorageProvider based on environment
 *
 * @param externalAdapter - Optional adapter for external storage (e.g., file system)
 */
export function createDefaultStorageProvider(
	externalAdapter?: ExternalStorageAdapter,
): StorageProvider {
	const environment = detectEnvironment();

	switch (environment) {
		case "browser":
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024, // 5MB
			});

		case "node":
			if (externalAdapter) {
				return new ExternalStorageProvider(externalAdapter, {
					dataDir: "./data",
					prettyJson: true,
					autoCreateDir: true,
				});
			}
			// Fallback to LocalStorageProvider if no adapter provided
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
			});

		default:
			// Default to LocalStorageProvider for unknown environments
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
			});
	}
}

/**
 * Environment-specific StorageProvider creation options
 */
export interface StorageProviderOptions {
	browser?: {
		enableCompression?: boolean;
		enableEncryption?: boolean;
		encryptionKey?: string;
		maxStorageSize?: number;
	};
	external?: {
		dataDir?: string;
		prettyJson?: boolean;
		autoCreateDir?: boolean;
		encoding?: "utf8" | "utf-8";
	};
}

/**
 * Create StorageProvider with options
 *
 * @param options - Configuration options for storage providers
 * @param externalAdapter - Optional adapter for external storage (e.g., file system)
 */
export function createStorageProvider(
	options?: StorageProviderOptions,
	externalAdapter?: ExternalStorageAdapter,
): StorageProvider {
	// Set default options if not provided
	const config = options || {};
	const environment = detectEnvironment();

	switch (environment) {
		case "browser":
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
				...config.browser,
			});

		case "node":
			if (externalAdapter) {
				return new ExternalStorageProvider(externalAdapter, {
					dataDir: "./data",
					prettyJson: true,
					autoCreateDir: true,
					encoding: "utf8",
					...config.external,
				});
			}
			// Fallback to LocalStorageProvider if no adapter provided
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
				...config.browser,
			});

		default:
			// Default to LocalStorageProvider for unknown environments
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
				...config.browser,
			});
	}
}
