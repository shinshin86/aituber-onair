/**
 * Storage factory tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	createDefaultStorageProvider,
	createStorageProvider,
} from "../src/utils/storageFactory";
import { LocalStorageProvider } from "../src/storage/LocalStorageProvider";
import { FileSystemStorageProvider } from "../src/storage/FileSystemStorageProvider";

describe("storageFactory", () => {
	// Store original globals
	const originalWindow = (global as Record<string, unknown>).window;
	const originalProcess = (global as Record<string, unknown>).process;
	const originalLocalStorage = (global as Record<string, unknown>).localStorage;

	afterEach(() => {
		// Restore original globals
		(global as Record<string, unknown>).window = originalWindow;
		(global as Record<string, unknown>).process = originalProcess;
		(global as Record<string, unknown>).localStorage = originalLocalStorage;
	});

	describe("createDefaultStorageProvider", () => {
		it("should create LocalStorageProvider in browser environment", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(LocalStorageProvider);
		});

		it("should create FileSystemStorageProvider in Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);
		});

		it("should default to FileSystemStorageProvider when environment is unclear", () => {
			// Remove both window and process
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = undefined;

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);
		});

		it("should create LocalStorageProvider with default browser configuration", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createDefaultStorageProvider() as LocalStorageProvider;
			expect(provider).toBeInstanceOf(LocalStorageProvider);

			// Test default configuration by accessing private config
			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(false);
			expect(config.enableEncryption).toBe(false);
			expect(config.maxStorageSize).toBe(5 * 1024 * 1024);
		});

		it("should create FileSystemStorageProvider with default Node.js configuration", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider =
				createDefaultStorageProvider() as FileSystemStorageProvider;
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);

			// Test default configuration by accessing private config
			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.dataDir).toBe("./data");
			expect(config.prettyJson).toBe(true);
			expect(config.autoCreateDir).toBe(true);
		});
	});

	describe("createStorageProvider", () => {
		it("should create LocalStorageProvider with custom browser options", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createStorageProvider({
				browser: {
					enableCompression: true,
					enableEncryption: true,
					encryptionKey: "test-key",
					maxStorageSize: 10 * 1024 * 1024,
				},
			}) as LocalStorageProvider;

			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(true);
			expect(config.enableEncryption).toBe(true);
			expect(config.encryptionKey).toBe("test-key");
			expect(config.maxStorageSize).toBe(10 * 1024 * 1024);
		});

		it("should create FileSystemStorageProvider with custom Node.js options", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider = createStorageProvider({
				node: {
					dataDir: "./custom-data",
					prettyJson: false,
					autoCreateDir: false,
					encoding: "utf-8",
				},
			}) as FileSystemStorageProvider;

			expect(provider).toBeInstanceOf(FileSystemStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.dataDir).toBe("./custom-data");
			expect(config.prettyJson).toBe(false);
			expect(config.autoCreateDir).toBe(false);
			expect(config.encoding).toBe("utf-8");
		});

		it("should ignore node options in browser environment", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createStorageProvider({
				browser: {
					enableCompression: true,
				},
				node: {
					dataDir: "./should-be-ignored",
				},
			}) as LocalStorageProvider;

			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(true);
			// Node.js options should be ignored
			expect(config.dataDir).toBeUndefined();
		});

		it("should ignore browser options in Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider = createStorageProvider({
				browser: {
					enableCompression: true,
				},
				node: {
					dataDir: "./custom-data",
				},
			}) as FileSystemStorageProvider;

			expect(provider).toBeInstanceOf(FileSystemStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.dataDir).toBe("./custom-data");
			// Browser options should be ignored
			expect(config.enableCompression).toBeUndefined();
		});

		it("should use default options when no options provided", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider = createStorageProvider({}) as FileSystemStorageProvider;
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.dataDir).toBe("./data");
			expect(config.prettyJson).toBe(true);
			expect(config.autoCreateDir).toBe(true);
		});

		it("should merge provided options with defaults", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createStorageProvider({
				browser: {
					enableCompression: true,
					// maxStorageSize not provided, should use default
				},
			}) as LocalStorageProvider;

			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(true); // Custom value
			expect(config.enableEncryption).toBe(false); // Default value
			expect(config.maxStorageSize).toBe(5 * 1024 * 1024); // Default value
		});
	});

	describe("error handling", () => {
		it("should default to FileSystemStorageProvider for unknown environments", () => {
			// Mock an unclear environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).localStorage = undefined;
			(global as Record<string, unknown>).process = undefined;

			// This should not throw because unknown environments default to 'node'
			expect(() => createDefaultStorageProvider()).not.toThrow();

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);
		});
	});

	describe("integration tests", () => {
		it("should create functional LocalStorageProvider", async () => {
			// Mock browser environment
			const mockStorage: Record<string, string> = {};
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: (key: string) => mockStorage[key] || null,
					setItem: (key: string, value: string) => {
						mockStorage[key] = value;
					},
					removeItem: (key: string) => {
						delete mockStorage[key];
					},
					clear: () => {
						for (const key of Object.keys(mockStorage)) {
							delete mockStorage[key];
						}
					},
				},
			};
			(global as Record<string, unknown>).localStorage = (
				global as Record<string, unknown>
			).window.localStorage;
			(global as Record<string, unknown>).process = undefined;

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(LocalStorageProvider);

			// Test basic functionality
			const testData = { test: "value" };
			await provider.save("test-key", testData);
			const loadedData = await provider.load("test-key");
			expect(loadedData).toEqual(testData);
		});

		it("should create functional FileSystemStorageProvider", async () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(FileSystemStorageProvider);

			// Basic instantiation test (actual file operations would need more setup)
			expect(provider.save).toBeDefined();
			expect(provider.load).toBeDefined();
			expect(provider.remove).toBeDefined();
			expect(provider.clear).toBeDefined();
			expect(provider.getStorageInfo).toBeDefined();
		});
	});
});
