/**
 * FileSystemStorageProvider tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { FileSystemStorageProvider } from "../src/storage/FileSystemStorageProvider";
import { StorageError, StorageErrorCode } from "../src/storage/StorageProvider";

// Mock global objects for Node.js environment
global.performance = performance;

describe("FileSystemStorageProvider", () => {
	let provider: FileSystemStorageProvider;
	const testDataDir = "./test-data";

	beforeEach(() => {
		provider = new FileSystemStorageProvider({
			dataDir: testDataDir,
			prettyJson: true,
			autoCreateDir: true,
			encoding: "utf8",
		});
	});

	afterEach(async () => {
		// Clean up test data directory
		try {
			await fs.rm(testDataDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe("save and load", () => {
		it("should save and load data correctly", async () => {
			const testData = {
				userId: "test-user",
				points: 100,
				level: 2,
				achievements: ["first_comment"],
			};

			await provider.save("test-key", testData);
			const loadedData = await provider.load("test-key");

			expect(loadedData).toEqual(testData);
		});

		it("should handle complex nested data", async () => {
			const complexData = {
				users: {
					"youtube:user1": {
						id: "youtube:user1",
						stats: {
							totalMessages: 50,
							favoriteEmotions: { happy: 10, excited: 5 },
						},
						achievements: [
							{ id: "first_comment", earnedAt: new Date().toISOString() },
						],
					},
				},
				config: {
					pointsPerMessage: 1,
					levelThresholds: [0, 100, 300, 600],
				},
			};

			await provider.save("complex-data", complexData);
			const loadedData = await provider.load("complex-data");

			expect(loadedData).toEqual(complexData);
		});

		it("should return null for non-existent keys", async () => {
			const result = await provider.load("non-existent-key");
			expect(result).toBeNull();
		});

		it("should handle empty data", async () => {
			const emptyData = {};
			await provider.save("empty-key", emptyData);
			const loadedData = await provider.load("empty-key");
			expect(loadedData).toEqual(emptyData);
		});
	});

	describe("remove", () => {
		it("should remove existing data", async () => {
			const testData = { test: "value" };
			await provider.save("test-key", testData);

			// Verify it exists
			const beforeRemove = await provider.load("test-key");
			expect(beforeRemove).toEqual(testData);

			// Remove it
			await provider.remove("test-key");

			// Verify it's gone
			const afterRemove = await provider.load("test-key");
			expect(afterRemove).toBeNull();
		});

		it("should not throw error when removing non-existent key", async () => {
			await expect(provider.remove("non-existent-key")).resolves.not.toThrow();
		});
	});

	describe("clear", () => {
		it("should clear all data", async () => {
			await provider.save("key1", { data: "value1" });
			await provider.save("key2", { data: "value2" });
			await provider.save("key3", { data: "value3" });

			await provider.clear();

			expect(await provider.load("key1")).toBeNull();
			expect(await provider.load("key2")).toBeNull();
			expect(await provider.load("key3")).toBeNull();
		});

		it("should not throw error when clearing empty storage", async () => {
			await expect(provider.clear()).resolves.not.toThrow();
		});
	});

	describe("getInfo", () => {
		it("should return correct storage info", async () => {
			const testData1 = { test: "value1" };
			const testData2 = { test: "value2", extra: "data" };

			await provider.save("key1", testData1);
			await provider.save("key2", testData2);

			const info = await provider.getStorageInfo();

			expect(info.keyCount).toBe(2);
			expect(info.used).toBeGreaterThan(0);
			expect(info.lastUpdated).toBeInstanceOf(Date);
		});

		it("should return zero for empty storage", async () => {
			const info = await provider.getStorageInfo();

			expect(info.keyCount).toBe(0);
			expect(info.used).toBe(0);
			expect(info.lastUpdated).toBeInstanceOf(Date);
		});
	});

	describe("configuration options", () => {
		it("should respect prettyJson option", async () => {
			const prettyProvider = new FileSystemStorageProvider({
				dataDir: testDataDir,
				prettyJson: true,
			});

			const uglyProvider = new FileSystemStorageProvider({
				dataDir: testDataDir,
				prettyJson: false,
			});

			const testData = { test: "value", nested: { data: "here" } };

			await prettyProvider.save("pretty-key", testData);
			await uglyProvider.save("ugly-key", testData);

			// Read files directly to check formatting
			const prettyContent = await fs.readFile(
				path.join(testDataDir, "pretty-key.json"),
				"utf8",
			);
			const uglyContent = await fs.readFile(
				path.join(testDataDir, "ugly-key.json"),
				"utf8",
			);

			expect(prettyContent).toContain("\n"); // Pretty JSON has newlines
			expect(uglyContent).not.toContain("\n"); // Ugly JSON is minified
		});

		it("should handle custom data directory", async () => {
			const customDir = "./custom-test-data";
			const customProvider = new FileSystemStorageProvider({
				dataDir: customDir,
				autoCreateDir: true,
			});

			const testData = { test: "custom-dir" };
			await customProvider.save("custom-key", testData);

			const loadedData = await customProvider.load("custom-key");
			expect(loadedData).toEqual(testData);

			// Verify file was created in custom directory
			const filePath = path.join(customDir, "custom-key.json");
			const fileExists = await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false);
			expect(fileExists).toBe(true);

			// Clean up custom directory
			await fs.rm(customDir, { recursive: true, force: true });
		});

		it("should create directory when autoCreateDir is true", async () => {
			const nonExistentDir = "./non-existent-dir";
			const autoCreateProvider = new FileSystemStorageProvider({
				dataDir: nonExistentDir,
				autoCreateDir: true,
			});

			const testData = { test: "auto-create" };
			await autoCreateProvider.save("auto-key", testData);

			const loadedData = await autoCreateProvider.load("auto-key");
			expect(loadedData).toEqual(testData);

			// Clean up
			await fs.rm(nonExistentDir, { recursive: true, force: true });
		});
	});

	describe("error handling", () => {
		it("should throw StorageError on save failure", async () => {
			// Create a provider with invalid directory permissions
			const invalidProvider = new FileSystemStorageProvider({
				dataDir: "/invalid/path/that/cannot/be/created",
				autoCreateDir: false,
			});

			await expect(
				invalidProvider.save("test", { data: "value" }),
			).rejects.toThrow(StorageError);
		});

		it("should throw StorageError on load failure for corrupted files", async () => {
			// Create a corrupted JSON file
			await fs.mkdir(testDataDir, { recursive: true });
			await fs.writeFile(
				path.join(testDataDir, "corrupted.json"),
				"invalid json content",
				"utf8",
			);

			await expect(provider.load("corrupted")).rejects.toThrow(StorageError);
		});

		it("should handle file name safety", async () => {
			const unsafeKeys = [
				"key/with/slashes",
				"key:with:colons",
				"key with spaces",
				"key<with>brackets",
				"key|with|pipes",
			];

			for (const key of unsafeKeys) {
				const testData = { test: `data for ${key}` };
				await provider.save(key, testData);
				const loadedData = await provider.load(key);
				expect(loadedData).toEqual(testData);
			}
		});
	});

	describe("performance", () => {
		it("should handle large data efficiently", async () => {
			const largeData = {
				users: {} as Record<string, unknown>,
			};

			// Generate 1000 users
			for (let i = 0; i < 1000; i++) {
				largeData.users[`user_${i}`] = {
					id: `user_${i}`,
					points: Math.floor(Math.random() * 1000),
					level: Math.floor(Math.random() * 10),
					achievements: [`achievement_${i % 10}`],
				};
			}

			const startTime = performance.now();
			await provider.save("large-data", largeData);
			const saveTime = performance.now() - startTime;

			const loadStartTime = performance.now();
			const loadedData = await provider.load("large-data");
			const loadTime = performance.now() - loadStartTime;

			expect(loadedData).toEqual(largeData);
			expect(saveTime).toBeLessThan(1000); // Should complete within 1 second
			expect(loadTime).toBeLessThan(1000); // Should complete within 1 second
		});
	});
});
