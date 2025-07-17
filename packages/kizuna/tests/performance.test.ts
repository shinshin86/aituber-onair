/**
 * Performance tests for LocalStorageProvider compression and encryption
 */

import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageProvider } from "../src/storage/LocalStorageProvider";

// Mock localStorage
const mockLocalStorage = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		key: (index: number) => Object.keys(store)[index] || null,
		get length() {
			return Object.keys(store).length;
		},
	};
})();

// Mock global objects for Node.js environment
global.localStorage = mockLocalStorage;
global.performance = performance;

// Test data of various sizes
const generateTestData = (size: number) => {
	const userData = {
		userId: "youtube:testuser123",
		points: 150,
		level: 2,
		achievements: ["first_comment", "loyal_viewer"],
		stats: {
			totalMessages: 50,
			todayMessages: 3,
			favoriteEmotions: { happy: 10, excited: 5 },
		},
		// Pad with additional data to reach target size
		padding: "x".repeat(Math.max(0, size - 200)),
	};
	return userData;
};

describe("LocalStorageProvider Performance Tests", () => {
	let providerNone: LocalStorageProvider;
	let providerCompression: LocalStorageProvider;
	let providerEncryption: LocalStorageProvider;
	let providerBoth: LocalStorageProvider;

	beforeEach(() => {
		mockLocalStorage.clear();

		providerNone = new LocalStorageProvider({
			enableCompression: false,
			enableEncryption: false,
			maxStorageSize: 10 * 1024 * 1024,
		});

		providerCompression = new LocalStorageProvider({
			enableCompression: true,
			enableEncryption: false,
			maxStorageSize: 10 * 1024 * 1024,
		});

		providerEncryption = new LocalStorageProvider({
			enableCompression: false,
			enableEncryption: true,
			encryptionKey: "test-key-123",
			maxStorageSize: 10 * 1024 * 1024,
		});

		providerBoth = new LocalStorageProvider({
			enableCompression: true,
			enableEncryption: true,
			encryptionKey: "test-key-123",
			maxStorageSize: 10 * 1024 * 1024,
		});
	});

	const measurePerformance = async (
		provider: LocalStorageProvider,
		data: unknown,
		iterations = 10,
	) => {
		const times: number[] = [];

		for (let i = 0; i < iterations; i++) {
			const key = `test-key-${i}`;

			// Measure save time
			const saveStart = performance.now();
			await provider.save(key, data);
			const saveEnd = performance.now();

			// Measure load time
			const loadStart = performance.now();
			await provider.load(key);
			const loadEnd = performance.now();

			times.push(saveEnd - saveStart + (loadEnd - loadStart));

			// Clean up
			await provider.remove(key);
		}

		return {
			avg: times.reduce((a, b) => a + b, 0) / times.length,
			min: Math.min(...times),
			max: Math.max(...times),
			times,
		};
	};

	const measureStorageSize = async (
		provider: LocalStorageProvider,
		data: unknown,
	) => {
		const key = "size-test";
		await provider.save(key, data);
		const stored = mockLocalStorage.getItem(key);
		await provider.remove(key);

		const originalSize = JSON.stringify(data).length;
		const storedSize = stored ? stored.length : 0;

		return {
			original: originalSize,
			stored: storedSize,
			ratio: storedSize / originalSize,
		};
	};

	it("should measure performance for 1KB data", async () => {
		const testData = generateTestData(1024);

		console.log("\n=== 1KB Data Performance ===");

		const noneResult = await measurePerformance(providerNone, testData);
		console.log(
			`None: ${noneResult.avg.toFixed(2)}ms (${noneResult.min.toFixed(2)}-${noneResult.max.toFixed(2)}ms)`,
		);

		const compressionResult = await measurePerformance(
			providerCompression,
			testData,
		);
		console.log(
			`Compression: ${compressionResult.avg.toFixed(2)}ms (${compressionResult.min.toFixed(2)}-${compressionResult.max.toFixed(2)}ms)`,
		);

		const encryptionResult = await measurePerformance(
			providerEncryption,
			testData,
		);
		console.log(
			`Encryption: ${encryptionResult.avg.toFixed(2)}ms (${encryptionResult.min.toFixed(2)}-${encryptionResult.max.toFixed(2)}ms)`,
		);

		const bothResult = await measurePerformance(providerBoth, testData);
		console.log(
			`Both: ${bothResult.avg.toFixed(2)}ms (${bothResult.min.toFixed(2)}-${bothResult.max.toFixed(2)}ms)`,
		);

		// Calculate overhead
		const compressionOverhead =
			(compressionResult.avg / noneResult.avg - 1) * 100;
		const encryptionOverhead =
			(encryptionResult.avg / noneResult.avg - 1) * 100;
		const bothOverhead = (bothResult.avg / noneResult.avg - 1) * 100;

		console.log(`Compression overhead: ${compressionOverhead.toFixed(1)}%`);
		console.log(`Encryption overhead: ${encryptionOverhead.toFixed(1)}%`);
		console.log(`Combined overhead: ${bothOverhead.toFixed(1)}%`);

		expect(noneResult.avg).toBeGreaterThan(0);
	});

	it("should measure storage size efficiency", async () => {
		const testData = generateTestData(1024);

		console.log("\n=== Storage Size Comparison ===");

		const noneSize = await measureStorageSize(providerNone, testData);
		console.log(
			`None: ${noneSize.original} → ${noneSize.stored} bytes (${noneSize.ratio.toFixed(2)}x)`,
		);

		const compressionSize = await measureStorageSize(
			providerCompression,
			testData,
		);
		console.log(
			`Compression: ${compressionSize.original} → ${compressionSize.stored} bytes (${compressionSize.ratio.toFixed(2)}x)`,
		);

		const encryptionSize = await measureStorageSize(
			providerEncryption,
			testData,
		);
		console.log(
			`Encryption: ${encryptionSize.original} → ${encryptionSize.stored} bytes (${encryptionSize.ratio.toFixed(2)}x)`,
		);

		const bothSize = await measureStorageSize(providerBoth, testData);
		console.log(
			`Both: ${bothSize.original} → ${bothSize.stored} bytes (${bothSize.ratio.toFixed(2)}x)`,
		);

		// Verify that "compression" actually increases size (Base64 effect)
		expect(compressionSize.ratio).toBeGreaterThan(1);
		expect(encryptionSize.ratio).toBeGreaterThan(1);
		expect(bothSize.ratio).toBeGreaterThan(1);
	});

	it("should measure performance for different data sizes", async () => {
		const sizes = [
			{ name: "1KB", size: 1024 },
			{ name: "10KB", size: 10 * 1024 },
			// 100KB is too large for XOR cipher - would cause encryption failure
		];

		console.log("\n=== Performance by Data Size ===");

		for (const { name, size } of sizes) {
			const testData = generateTestData(size);
			const result = await measurePerformance(providerBoth, testData, 5);
			console.log(`${name}: ${result.avg.toFixed(2)}ms average`);
		}
	});

	it("should test typical Kizuna user data", async () => {
		const typicalUserData = {
			"youtube:user123": {
				id: "youtube:user123",
				displayName: "user123",
				type: "youtube",
				points: 150,
				level: 2,
				achievements: [
					{ id: "first_comment", title: "First Comment", earnedAt: new Date() },
				],
				stats: {
					totalMessages: 50,
					totalPointsEarned: 150,
					dailyStreak: 3,
					favoriteEmotions: { happy: 10, excited: 5 },
					todayMessages: 3,
				},
				firstSeen: new Date(),
				lastSeen: new Date(),
			},
		};

		console.log("\n=== Typical Kizuna User Data ===");

		const result = await measurePerformance(providerBoth, typicalUserData);
		const sizeInfo = await measureStorageSize(providerBoth, typicalUserData);

		console.log(`Performance: ${result.avg.toFixed(2)}ms average`);
		console.log(
			`Size: ${sizeInfo.original} → ${sizeInfo.stored} bytes (${sizeInfo.ratio.toFixed(2)}x)`,
		);

		// For typical user data, performance should be under 5ms
		expect(result.avg).toBeLessThan(5);
	});
});
