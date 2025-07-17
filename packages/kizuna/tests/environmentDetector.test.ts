/**
 * Environment detector tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	detectEnvironment,
	isBrowser,
	isNode,
} from "../src/utils/environmentDetector";

describe("environmentDetector", () => {
	// Store original globals
	const originalWindow = (global as Record<string, unknown>).window;
	const originalProcess = (global as Record<string, unknown>).process;

	afterEach(() => {
		// Restore original globals
		(global as Record<string, unknown>).window = originalWindow;
		(global as Record<string, unknown>).process = originalProcess;
	});

	describe("detectEnvironment", () => {
		it("should detect browser environment", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).process = undefined;

			const result = detectEnvironment();
			expect(result).toBe("browser");
		});

		it("should detect Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const result = detectEnvironment();
			expect(result).toBe("node");
		});

		it("should default to node when environment is unclear", () => {
			// Remove both window and process
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = undefined;

			const result = detectEnvironment();
			expect(result).toBe("node");
		});

		it("should detect browser even when process exists (e.g., webpack)", () => {
			// Mock browser environment with process (webpack scenario)
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const result = detectEnvironment();
			expect(result).toBe("browser");
		});

		it("should detect node when window exists but localStorage is missing", () => {
			// Mock incomplete browser environment
			(global as Record<string, unknown>).window = {}; // No localStorage
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const result = detectEnvironment();
			expect(result).toBe("node");
		});
	});

	describe("isBrowser", () => {
		it("should return true in browser environment", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).process = undefined;

			const result = isBrowser();
			expect(result).toBe(true);
		});

		it("should return false in Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const result = isBrowser();
			expect(result).toBe(false);
		});
	});

	describe("isNode", () => {
		it("should return true in Node.js environment", () => {
			// Mock Node.js environment
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			const result = isNode();
			expect(result).toBe(true);
		});

		it("should return false in browser environment", () => {
			// Mock browser environment
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).process = undefined;

			const result = isNode();
			expect(result).toBe(false);
		});

		it("should return true by default when environment is unclear", () => {
			// Remove both window and process
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = undefined;

			const result = isNode();
			expect(result).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle undefined window", () => {
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					node: "18.0.0",
				},
			};

			expect(detectEnvironment()).toBe("node");
			expect(isBrowser()).toBe(false);
			expect(isNode()).toBe(true);
		});

		it("should handle undefined process", () => {
			(global as Record<string, unknown>).window = {
				localStorage: {
					getItem: () => null,
					setItem: () => {},
					removeItem: () => {},
					clear: () => {},
				},
			};
			(global as Record<string, unknown>).process = undefined;

			expect(detectEnvironment()).toBe("browser");
			expect(isBrowser()).toBe(true);
			expect(isNode()).toBe(false);
		});

		it("should handle process without versions", () => {
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {}; // No versions property

			expect(detectEnvironment()).toBe("node");
			expect(isBrowser()).toBe(false);
			expect(isNode()).toBe(true);
		});

		it("should handle process with versions but no node version", () => {
			(global as Record<string, unknown>).window = undefined;
			(global as Record<string, unknown>).process = {
				versions: {
					// No node property
					v8: "10.0.0",
				},
			};

			expect(detectEnvironment()).toBe("node");
			expect(isBrowser()).toBe(false);
			expect(isNode()).toBe(true);
		});
	});

	describe("real environment detection", () => {
		it("should detect actual Node.js environment", () => {
			// In actual Node.js environment (test runner)
			// This test should pass when run in Node.js
			const actualEnvironment = detectEnvironment();
			const actualIsNode = isNode();
			const actualIsBrowser = isBrowser();

			// In vitest (Node.js), this should be true
			expect(actualEnvironment).toBe("node");
			expect(actualIsNode).toBe(true);
			expect(actualIsBrowser).toBe(false);
		});
	});
});
