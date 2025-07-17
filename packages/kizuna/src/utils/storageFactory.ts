/**
 * Storage factory
 * Creates appropriate StorageProvider based on environment
 */

import type { StorageProvider } from "../storage/StorageProvider";
import { LocalStorageProvider } from "../storage/LocalStorageProvider";
import { FileSystemStorageProvider } from "../storage/FileSystemStorageProvider";
import { detectEnvironment } from "./environmentDetector";

/**
 * Create default StorageProvider based on environment
 */
export function createDefaultStorageProvider(): StorageProvider {
	const environment = detectEnvironment();

	switch (environment) {
		case "browser":
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024, // 5MB
			});

		case "node":
			return new FileSystemStorageProvider({
				dataDir: "./data",
				prettyJson: true,
				autoCreateDir: true,
			});

		default:
			throw new Error(`Unsupported environment: ${environment}`);
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
	node?: {
		dataDir?: string;
		prettyJson?: boolean;
		autoCreateDir?: boolean;
		encoding?: "utf8" | "utf-8";
	};
}

/**
 * Create StorageProvider with options
 */
export function createStorageProvider(
	options: StorageProviderOptions = {},
): StorageProvider {
	const environment = detectEnvironment();

	switch (environment) {
		case "browser":
			return new LocalStorageProvider({
				enableCompression: false,
				enableEncryption: false,
				maxStorageSize: 5 * 1024 * 1024,
				...options.browser,
			});

		case "node":
			return new FileSystemStorageProvider({
				dataDir: "./data",
				prettyJson: true,
				autoCreateDir: true,
				encoding: "utf8",
				...options.node,
			});

		default:
			throw new Error(`Unsupported environment: ${environment}`);
	}
}
