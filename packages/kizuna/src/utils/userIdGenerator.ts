/**
 * Utilities for user ID generation and parsing
 */

import type { UserType, ChatType } from "../types";

/**
 * Generate user ID from platform and username
 *
 * @param platform Platform (ChatType)
 * @param userName Username
 * @param isOwner Whether owner
 * @returns Generated user ID
 */
export function generateUserId(
	platform: ChatType,
	userName: string,
	isOwner = false,
): string {
	// Fixed ID for owner
	if (isOwner || platform === "chatForm") {
		return "owner:default";
	}

	// Platform-specific prefix
	const platformPrefix = getPlatformPrefix(platform);

	// Sanitize username
	const sanitizedName = sanitizeUserName(userName);

	return `${platformPrefix}:${sanitizedName}`;
}

/**
 * Parse user ID to get platform and username
 *
 * @param userId User ID
 * @returns Parse result
 */
export function parseUserId(userId: string): {
	platform: UserType;
	userName: string;
	isOwner: boolean;
} {
	const parts = userId.split(":");

	if (parts.length < 2) {
		throw new Error(`Invalid user ID format: ${userId}`);
	}

	const [platformStr, ...userNameParts] = parts;
	const userName = userNameParts.join(":"); // Handle cases where ':' is included

	// Convert platform to UserType
	const platform = platformStrToUserType(platformStr || "unknown");
	const isOwner = platform === "owner";

	return {
		platform,
		userName,
		isOwner,
	};
}

/**
 * Get platform prefix from ChatType
 */
function getPlatformPrefix(platform: ChatType): string {
	switch (platform) {
		case "chatForm":
			return "owner";
		case "youtube":
			return "youtube";
		case "twitch":
			return "twitch";
		case "websocket":
			return "websocket";
		case "vision":
			return "vision";
		case "textFile":
			return "file";
		case "configAdvice":
			return "system";
		default:
			return "unknown";
	}
}

/**
 * Convert platform string to UserType
 */
function platformStrToUserType(platformStr: string): UserType {
	switch (platformStr) {
		case "owner":
			return "owner";
		case "youtube":
			return "youtube";
		case "twitch":
			return "twitch";
		case "websocket":
		case "vision":
		case "file":
		case "system":
		case "unknown":
			return "websocket"; // Treat as WebSocket type
		default:
			return "websocket";
	}
}

/**
 * Sanitize username
 */
function sanitizeUserName(userName: string): string {
	// Default name for empty strings
	if (!userName || userName.trim() === "") {
		return "anonymous";
	}

	// Replace special characters and limit length
	return userName
		.trim()
		.replace(/[^\w\-_.]/g, "_") // Replace non-alphanumeric, hyphen, underscore, period
		.substring(0, 50) // Maximum 50 characters
		.toLowerCase(); // Convert to lowercase
}

/**
 * Check user ID validity
 */
export function isValidUserId(userId: string): boolean {
	try {
		parseUserId(userId);
		return true;
	} catch {
		return false;
	}
}

/**
 * Generate anonymous user ID
 */
export function generateAnonymousUserId(platform: ChatType): string {
	const timestamp = Date.now();
	const randomSuffix = Math.random().toString(36).substring(2, 8);
	return generateUserId(platform, `anon_${timestamp}_${randomSuffix}`);
}

/**
 * Get display username
 */
export function getDisplayName(userId: string): string {
	try {
		const parsed = parseUserId(userId);

		if (parsed.isOwner) {
			return "Owner";
		}

		// Convert underscores to spaces
		return parsed.userName
			.replace(/_/g, " ")
			.replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize first letters
	} catch {
		return "Unknown User";
	}
}
