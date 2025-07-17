/**
 * Storage factory tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	createDefaultStorageProvider,
	createStorageProvider,
} from "../src/utils/storageFactory";
import { LocalStorageProvider } from "../src/storage/LocalStorageProvider";
import {
	ExternalStorageProvider,
	type ExternalStorageAdapter,
} from "../src/storage/ExternalStorageProvider";

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

		it("should create LocalStorageProvider in Node.js environment without adapter", () => {
			// Mock Node.js environment with minimal localStorage mock
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};
			// Mock localStorage to be available
			(global as Record<string, unknown>).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
			};

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(LocalStorageProvider);
		});

		it("should default to LocalStorageProvider when environment is unclear", () => {
			// Remove both window and process
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = undefined;
			// Mock localStorage to be available
			(global as Record<string, unknown>).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
			};

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(LocalStorageProvider);
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

		it("should create ExternalStorageProvider with adapter in Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			// Create a mock adapter
			const mockAdapter: ExternalStorageAdapter = {
				readFile: async () => "{}",
				writeFile: async () => {},
				deleteFile: async () => {},
				listFiles: async () => [],
				ensureDir: async () => {},
				exists: async () => true,
				joinPath: (...components) => components.join("/"),
			};

			const provider = createDefaultStorageProvider(mockAdapter);
			expect(provider).toBeInstanceOf(ExternalStorageProvider);
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

		it("should create ExternalStorageProvider with custom external options", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			// Create a mock adapter
			const mockAdapter: ExternalStorageAdapter = {
				readFile: async () => "{}",
				writeFile: async () => {},
				deleteFile: async () => {},
				listFiles: async () => [],
				ensureDir: async () => {},
				exists: async () => true,
				joinPath: (...components) => components.join("/"),
			};

			const provider = createStorageProvider(
				{
					external: {
						dataDir: "./custom-data",
						prettyJson: false,
						autoCreateDir: false,
						encoding: "utf-8",
					},
				},
				mockAdapter,
			);

			expect(provider).toBeInstanceOf(ExternalStorageProvider);
		});

		it("should ignore external options in browser environment", () => {
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
				external: {
					dataDir: "./should-be-ignored",
				},
			}) as LocalStorageProvider;

			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(true);
			// External options should be ignored
			expect(config.dataDir).toBeUndefined();
		});

		it("should fallback to LocalStorageProvider in Node.js environment without adapter", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};
			// Mock localStorage to be available
			(global as Record<string, unknown>).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
			};

			const provider = createStorageProvider({
				browser: {
					enableCompression: true,
				},
				external: {
					dataDir: "./custom-data",
				},
			}) as LocalStorageProvider;

			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			// Should use browser options as fallback
			expect(config.enableCompression).toBe(true);
			// External options should be ignored without adapter
			expect(config.dataDir).toBeUndefined();
		});

		it("should use default options when no options provided", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};
			// Mock localStorage to be available
			(global as Record<string, unknown>).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
			};

			const provider = createStorageProvider({}) as LocalStorageProvider;
			expect(provider).toBeInstanceOf(LocalStorageProvider);

			const config = (provider as { config: Record<string, unknown> }).config;
			expect(config.enableCompression).toBe(false);
			expect(config.enableEncryption).toBe(false);
			expect(config.maxStorageSize).toBe(5 * 1024 * 1024);
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
		it("should default to LocalStorageProvider for unknown environments", () => {
			// Mock an unclear environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = undefined;
			// Mock localStorage to be available
			(global as Record<string, unknown>).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
			};

			// This should not throw because unknown environments default to LocalStorageProvider
			expect(() => createDefaultStorageProvider()).not.toThrow();

			const provider = createDefaultStorageProvider();
			expect(provider).toBeInstanceOf(LocalStorageProvider);
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

		it("should create functional ExternalStorageProvider", async () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			// Create a mock adapter with test data
			const mockStorage: Record<string, string> = {};
			const mockAdapter: ExternalStorageAdapter = {
				readFile: async (filePath: string) => mockStorage[filePath] || "{}",
				writeFile: async (filePath: string, data: string) => {
					mockStorage[filePath] = data;
				},
				deleteFile: async (filePath: string) => {
					delete mockStorage[filePath];
				},
				listFiles: async () => Object.keys(mockStorage),
				ensureDir: async () => {},
				exists: async (path: string) => path in mockStorage,
				joinPath: (...components) => components.join("/"),
			};

			const provider = createDefaultStorageProvider(mockAdapter);
			expect(provider).toBeInstanceOf(ExternalStorageProvider);

			// Test basic functionality
			const testData = { test: "value" };
			await provider.save("test-key", testData);
			const loadedData = await provider.load("test-key");
			expect(loadedData).toEqual(testData);
		});
	});
});
