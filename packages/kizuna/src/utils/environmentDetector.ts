/**
 * Environment detection utility
 * Detects browser and Node.js environments
 */

/**
 * Detect current execution environment
 */
export function detectEnvironment(): "browser" | "node" {
	// Detect browser environment by window object existence
	if (
		typeof window !== "undefined" &&
		typeof window.localStorage !== "undefined"
	) {
		return "browser";
	}

	// Detect Node.js environment by process object existence
	if (
		typeof process !== "undefined" &&
		process.versions &&
		process.versions.node
	) {
		return "node";
	}

	// Default to Node.js environment
	return "node";
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
	return detectEnvironment() === "browser";
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
	return detectEnvironment() === "node";
}
