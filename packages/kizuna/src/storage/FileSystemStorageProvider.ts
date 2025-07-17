/**
 * FileSystemStorageProvider - Storage provider using file system
 *
 * Persists data using JSON files in Node.js environment
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	StorageProvider,
	type StorageInfo,
	StorageError,
	StorageErrorCode,
} from "./StorageProvider";

const DEFAULT_DATA_DIR = "./kizuna-data";

/**
 * FileSystemStorageProvider configuration
 */
export interface FileSystemStorageConfig {
	/** Path to data directory */
	dataDir: string;
	/** File encoding */
	encoding: "utf8" | "utf-8";
	/** Whether to format JSON */
	prettyJson: boolean;
	/** Whether to auto-create directory if it doesn't exist */
	autoCreateDir: boolean;
}

/**
 * FileSystemStorageProvider
 * Data persistence using file system in Node.js environment
 */
export class FileSystemStorageProvider extends StorageProvider {
	private config: FileSystemStorageConfig;

	constructor(config: Partial<FileSystemStorageConfig> = {}) {
		super();
		this.config = {
			dataDir: DEFAULT_DATA_DIR,
			encoding: "utf8",
			prettyJson: true,
			autoCreateDir: true,
			...config,
		};
	}

	/**
	 * Save data
	 */
	async save(key: string, data: unknown): Promise<void> {
		try {
			// Check and create directory
			if (this.config.autoCreateDir) {
				await this.ensureDirectoryExists();
			}

			const filePath = this.getFilePath(key);
			const jsonData = this.config.prettyJson
				? JSON.stringify(data, null, 2)
				: JSON.stringify(data);

			await fs.writeFile(filePath, jsonData, this.config.encoding);
		} catch (error) {
			throw new StorageError(
				`Failed to save data to file: ${error}`,
				StorageErrorCode.SAVE_ERROR,
				error,
			);
		}
	}

	/**
	 * Load data
	 */
	async load<T>(key: string): Promise<T | null> {
		try {
			const filePath = this.getFilePath(key);
			const jsonData = await fs.readFile(filePath, this.config.encoding);
			return JSON.parse(jsonData);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				// Return null if file doesn't exist
				return null;
			}
			throw new StorageError(
				`Failed to load data from file: ${error}`,
				StorageErrorCode.LOAD_ERROR,
				error,
			);
		}
	}

	/**
	 * Remove data
	 */
	async remove(key: string): Promise<void> {
		try {
			const filePath = this.getFilePath(key);
			await fs.unlink(filePath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				// Do nothing if file doesn't exist
				return;
			}
			throw new StorageError(
				`Failed to remove data file: ${error}`,
				StorageErrorCode.REMOVE_ERROR,
				error,
			);
		}
	}

	/**
	 * Clear storage
	 */
	async clear(): Promise<void> {
		try {
			const files = await fs.readdir(this.config.dataDir);
			const jsonFiles = files.filter((file) => file.endsWith(".json"));

			await Promise.all(
				jsonFiles.map((file: string) =>
					fs.unlink(path.join(this.config.dataDir, file)),
				),
			);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				// Do nothing if directory doesn't exist
				return;
			}
			throw new StorageError(
				`Failed to clear storage: ${error}`,
				StorageErrorCode.CLEAR_ERROR,
				error,
			);
		}
	}

	/**
	 * Get all keys
	 */
	async getAllKeys(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.config.dataDir);
			return files
				.filter((file: string) => file.endsWith(".json"))
				.map((file: string) => file.slice(0, -5)); // Remove .json extension
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				return [];
			}
			throw new StorageError(
				`Failed to get keys: ${error}`,
				StorageErrorCode.LOAD_ERROR,
				error as Error,
			);
		}
	}

	/**
	 * Check if storage is available
	 */
	isAvailable(): boolean {
		return typeof fs !== "undefined" && typeof path !== "undefined";
	}

	/**
	 * Check if data can be stored
	 */
	async canStore(data: unknown): Promise<boolean> {
		try {
			JSON.stringify(data);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get storage information
	 */
	async getStorageInfo(): Promise<StorageInfo> {
		try {
			let totalSize = 0;
			let itemCount = 0;

			try {
				const files = await fs.readdir(this.config.dataDir);
				const jsonFiles = files.filter((file: string) =>
					file.endsWith(".json"),
				);

				for (const file of jsonFiles) {
					const filePath = path.join(this.config.dataDir, file);
					const stats = await fs.stat(filePath);
					totalSize += stats.size;
					itemCount++;
				}
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") {
					// Return empty info if directory doesn't exist
					totalSize = 0;
					itemCount = 0;
				} else {
					throw error;
				}
			}

			return {
				used: totalSize,
				keyCount: itemCount,
				lastUpdated: new Date(),
			};
		} catch (error) {
			throw new StorageError(
				`Failed to get storage info: ${error}`,
				StorageErrorCode.INFO_ERROR,
				error,
			);
		}
	}

	/**
	 * Get file path
	 */
	private getFilePath(key: string): string {
		// Convert key to safe filename format
		const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
		return path.join(this.config.dataDir, `${safeKey}.json`);
	}

	/**
	 * Ensure directory exists and create if necessary
	 */
	private async ensureDirectoryExists(): Promise<void> {
		try {
			await fs.access(this.config.dataDir);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				await fs.mkdir(this.config.dataDir, { recursive: true });
			} else {
				throw error;
			}
		}
	}
}
