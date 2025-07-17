/**
 * LocalStorageProvider - Storage provider using LocalStorage
 *
 * Persists data using browser's LocalStorage
 */

import {
	StorageProvider,
	type StorageInfo,
	StorageError,
	StorageErrorCode,
} from "./StorageProvider";

/**
 * LocalStorageProvider configuration
 */
export interface LocalStorageConfig {
	/** Whether to enable compression */
	enableCompression: boolean;
	/** Whether to enable encryption */
	enableEncryption: boolean;
	/** Encryption key (when enableEncryption=true) */
	encryptionKey?: string;
	/** Maximum storage size (bytes, 0 for unlimited) */
	maxStorageSize: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LocalStorageConfig = {
	enableCompression: false,
	enableEncryption: false,
	maxStorageSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Storage provider using LocalStorage
 */
export class LocalStorageProvider extends StorageProvider {
	private config: LocalStorageConfig;

	constructor(config: Partial<LocalStorageConfig> = {}) {
		super();
		this.config = { ...DEFAULT_CONFIG, ...config };

		if (!this.isAvailable()) {
			throw new StorageError(
				"LocalStorage is not available",
				StorageErrorCode.NOT_AVAILABLE,
			);
		}
	}

	/**
	 * Save data
	 */
	async save(key: string, data: unknown): Promise<void> {
		this.validateKey(key);

		try {
			const serializedData = this.serialize(data);
			const processedData = await this.processDataForStorage(serializedData);

			// Size check
			if (!(await this.canStore(processedData))) {
				throw new StorageError(
					"Storage quota exceeded",
					StorageErrorCode.QUOTA_EXCEEDED,
				);
			}

			localStorage.setItem(key, processedData);
		} catch (error) {
			if (error instanceof StorageError) {
				throw error;
			}

			// Handle quota exceeded error
			if (error instanceof Error && error.name === "QuotaExceededError") {
				throw new StorageError(
					"Storage quota exceeded",
					StorageErrorCode.QUOTA_EXCEEDED,
					error,
				);
			}

			throw new StorageError(
				`Failed to save data: ${error instanceof Error ? error.message : String(error)}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Load data
	 */
	async load<T>(key: string): Promise<T | null> {
		this.validateKey(key);

		try {
			const rawData = localStorage.getItem(key);

			if (rawData === null) {
				return null;
			}

			const processedData = await this.processDataFromStorage(rawData);
			return this.deserialize<T>(processedData);
		} catch (error) {
			throw new StorageError(
				`Failed to load data: ${error instanceof Error ? error.message : String(error)}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error instanceof Error ? error : undefined,
			);
		}
	}

	/**
	 * Remove data
	 */
	async remove(key: string): Promise<void> {
		this.validateKey(key);

		try {
			localStorage.removeItem(key);
		} catch (error) {
			throw new StorageError(
				`Failed to remove data: ${error.message}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error,
			);
		}
	}

	/**
	 * Get all keys starting with specified prefix
	 */
	async getAllKeys(keyPrefix?: string): Promise<string[]> {
		try {
			const keys: string[] = [];

			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key) {
					if (keyPrefix) {
						if (key.startsWith(keyPrefix)) {
							keys.push(key);
						}
					} else {
						keys.push(key);
					}
				}
			}

			return keys;
		} catch (error) {
			throw new StorageError(
				`Failed to get all keys: ${error.message}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error,
			);
		}
	}

	/**
	 * Clear storage with specified prefix
	 */
	async clear(keyPrefix?: string): Promise<void> {
		try {
			const keys = await this.getAllKeys(keyPrefix);

			for (const key of keys) {
				await this.remove(key);
			}
		} catch (error) {
			throw new StorageError(
				`Failed to clear storage: ${error.message}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error,
			);
		}
	}

	/**
	 * Check if LocalStorage is available
	 */
	isAvailable(): boolean {
		try {
			if (typeof localStorage === "undefined") {
				return false;
			}

			// Write test
			const testKey = "__kizuna_test__";
			localStorage.setItem(testKey, "test");
			localStorage.removeItem(testKey);

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if data can be stored
	 */
	async canStore(data: unknown): Promise<boolean> {
		try {
			const serializedData =
				typeof data === "string" ? data : this.serialize(data);
			const processedData = await this.processDataForStorage(serializedData);
			const dataSize = this.getDataSize(processedData);

			// Maximum size check
			if (
				this.config.maxStorageSize > 0 &&
				dataSize > this.config.maxStorageSize
			) {
				return false;
			}

			// Actual storage test
			const testKey = "__kizuna_size_test__";
			try {
				localStorage.setItem(testKey, processedData);
				localStorage.removeItem(testKey);
				return true;
			} catch {
				return false;
			}
		} catch {
			return false;
		}
	}

	/**
	 * Get storage information
	 */
	async getStorageInfo(): Promise<StorageInfo> {
		try {
			const keys = await this.getAllKeys();
			let totalUsed = 0;

			// Calculate usage
			for (const key of keys) {
				const data = localStorage.getItem(key);
				if (data) {
					totalUsed += this.getDataSize(data);
				}
			}

			// Estimate LocalStorage total capacity (typically 5-10MB)
			let estimatedTotal: number | undefined;
			try {
				// Capacity test with large data
				const testData = "x".repeat(1024 * 1024); // 1MB
				let testSize = 0;
				const testKey = "__capacity_test__";

				for (let i = 0; i < 20; i++) {
					// Test up to 20MB
					try {
						localStorage.setItem(testKey, testData.repeat(i + 1));
						testSize = (i + 1) * 1024 * 1024;
					} catch {
						break;
					}
				}

				localStorage.removeItem(testKey);
				estimatedTotal = testSize + totalUsed;
			} catch {
				// undefined if test fails
			}

			return {
				used: totalUsed,
				available: estimatedTotal ? estimatedTotal - totalUsed : undefined,
				total: estimatedTotal,
				keyCount: keys.length,
				lastUpdated: new Date(),
			};
		} catch (error) {
			throw new StorageError(
				`Failed to get storage info: ${error.message}`,
				StorageErrorCode.UNKNOWN_ERROR,
				error,
			);
		}
	}

	// ============================================================================
	// Private methods
	// ============================================================================

	/**
	 * Process data for storage (compression/encryption)
	 */
	private async processDataForStorage(data: string): Promise<string> {
		let processedData = data;

		// Compression
		if (this.config.enableCompression) {
			processedData = await this.compressData(processedData);
		}

		// Encryption
		if (this.config.enableEncryption && this.config.encryptionKey) {
			processedData = await this.encryptData(
				processedData,
				this.config.encryptionKey,
			);
		}

		return processedData;
	}

	/**
	 * Process data from storage (decryption/decompression)
	 */
	private async processDataFromStorage(data: string): Promise<string> {
		let processedData = data;

		// Decryption
		if (this.config.enableEncryption && this.config.encryptionKey) {
			processedData = await this.decryptData(
				processedData,
				this.config.encryptionKey,
			);
		}

		// Decompression
		if (this.config.enableCompression) {
			processedData = await this.decompressData(processedData);
		}

		return processedData;
	}

	/**
	 * Compress data (simple implementation)
	 */
	private async compressData(data: string): Promise<string> {
		// In actual implementation, use libraries like LZ-string or pako
		// Here we use simple Base64 encoding only
		try {
			return btoa(unescape(encodeURIComponent(data)));
		} catch (error) {
			throw new StorageError(
				"Compression failed",
				StorageErrorCode.SERIALIZATION_ERROR,
				error,
			);
		}
	}

	/**
	 * Decompress data
	 */
	private async decompressData(data: string): Promise<string> {
		try {
			return decodeURIComponent(escape(atob(data)));
		} catch (error) {
			throw new StorageError(
				"Decompression failed",
				StorageErrorCode.SERIALIZATION_ERROR,
				error,
			);
		}
	}

	/**
	 * Encrypt data (simple implementation)
	 */
	private async encryptData(data: string, key: string): Promise<string> {
		// In actual implementation, use Web Crypto API or Crypto-JS
		// Here we implement simple XOR encryption
		try {
			const keyBytes = new TextEncoder().encode(key);
			const dataBytes = new TextEncoder().encode(data);
			const encryptedBytes = new Uint8Array(dataBytes.length);

			for (let i = 0; i < dataBytes.length; i++) {
				const dataByte = dataBytes[i] ?? 0;
				const keyByte = keyBytes[i % keyBytes.length] ?? 0;
				encryptedBytes[i] = dataByte ^ keyByte;
			}

			return btoa(String.fromCharCode(...encryptedBytes));
		} catch (error) {
			throw new StorageError(
				"Encryption failed",
				StorageErrorCode.SERIALIZATION_ERROR,
				error,
			);
		}
	}

	/**
	 * Decrypt data
	 */
	private async decryptData(data: string, key: string): Promise<string> {
		try {
			const keyBytes = new TextEncoder().encode(key);
			const encryptedBytes = new Uint8Array(
				atob(data)
					.split("")
					.map((char) => char.charCodeAt(0)),
			);
			const decryptedBytes = new Uint8Array(encryptedBytes.length);

			for (let i = 0; i < encryptedBytes.length; i++) {
				const encryptedByte = encryptedBytes[i] ?? 0;
				const keyByte = keyBytes[i % keyBytes.length] ?? 0;
				decryptedBytes[i] = encryptedByte ^ keyByte;
			}

			return new TextDecoder().decode(decryptedBytes);
		} catch (error) {
			throw new StorageError(
				"Decryption failed",
				StorageErrorCode.SERIALIZATION_ERROR,
				error,
			);
		}
	}
}
