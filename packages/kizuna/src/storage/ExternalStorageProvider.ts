/**
 * ExternalStorageProvider - Storage provider with dependency injection
 *
 * Allows users to provide their own file system implementation
 * for Node.js, Deno, or any other environment
 */

import {
	StorageProvider,
	type StorageInfo,
	StorageError,
	StorageErrorCode,
} from "./StorageProvider";

/**
 * External storage adapter interface
 * Users implement this interface to provide file system operations
 */
export interface ExternalStorageAdapter {
	/**
	 * Read file contents as string
	 */
	readFile(filePath: string): Promise<string>;

	/**
	 * Write string data to file
	 */
	writeFile(filePath: string, data: string): Promise<void>;

	/**
	 * Delete a file
	 */
	deleteFile(filePath: string): Promise<void>;

	/**
	 * List files in a directory
	 */
	listFiles(dirPath: string): Promise<string[]>;

	/**
	 * Ensure directory exists (create if necessary)
	 */
	ensureDir(dirPath: string): Promise<void>;

	/**
	 * Check if file or directory exists
	 */
	exists(path: string): Promise<boolean>;

	/**
	 * Get file stats (size, etc.)
	 */
	getFileStats?(filePath: string): Promise<{ size: number }>;

	/**
	 * Join path components
	 */
	joinPath(...components: string[]): string;
}

/**
 * ExternalStorageProvider configuration
 */
export interface ExternalStorageConfig {
	/** Path to data directory */
	dataDir: string;
	/** File encoding */
	encoding?: "utf8" | "utf-8";
	/** Whether to format JSON */
	prettyJson?: boolean;
	/** Whether to auto-create directory if it doesn't exist */
	autoCreateDir?: boolean;
}

const DEFAULT_DATA_DIR = "./kizuna-data";

/**
 * ExternalStorageProvider
 * Data persistence using external file system adapter
 */
export class ExternalStorageProvider extends StorageProvider {
	private config: Required<ExternalStorageConfig>;

	constructor(
		private adapter: ExternalStorageAdapter,
		config: Partial<ExternalStorageConfig> = {},
	) {
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

			await this.adapter.writeFile(filePath, jsonData);
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
			if (!(await this.adapter.exists(filePath))) {
				return null;
			}

			const jsonData = await this.adapter.readFile(filePath);
			return JSON.parse(jsonData);
		} catch (error) {
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
			if (await this.adapter.exists(filePath)) {
				await this.adapter.deleteFile(filePath);
			}
		} catch (error) {
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
			if (!(await this.adapter.exists(this.config.dataDir))) {
				return;
			}

			const files = await this.adapter.listFiles(this.config.dataDir);
			const jsonFiles = files.filter((file: string) => file.endsWith(".json"));

			await Promise.all(
				jsonFiles.map((file: string) =>
					this.adapter.deleteFile(
						this.adapter.joinPath(this.config.dataDir, file),
					),
				),
			);
		} catch (error) {
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
			if (!(await this.adapter.exists(this.config.dataDir))) {
				return [];
			}

			const files = await this.adapter.listFiles(this.config.dataDir);
			return files
				.filter((file: string) => file.endsWith(".json"))
				.map((file: string) => file.slice(0, -5)); // Remove .json extension
		} catch (error) {
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
		return this.adapter !== null && typeof this.adapter === "object";
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

			if (await this.adapter.exists(this.config.dataDir)) {
				const files = await this.adapter.listFiles(this.config.dataDir);
				const jsonFiles = files.filter((file: string) =>
					file.endsWith(".json"),
				);

				if (this.adapter.getFileStats) {
					for (const file of jsonFiles) {
						const filePath = this.adapter.joinPath(this.config.dataDir, file);
						const stats = await this.adapter.getFileStats(filePath);
						totalSize += stats.size;
						itemCount++;
					}
				} else {
					// Fallback: estimate size from file contents
					for (const file of jsonFiles) {
						const filePath = this.adapter.joinPath(this.config.dataDir, file);
						const content = await this.adapter.readFile(filePath);
						totalSize += new Blob([content]).size;
						itemCount++;
					}
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
		return this.adapter.joinPath(this.config.dataDir, `${safeKey}.json`);
	}

	/**
	 * Ensure directory exists and create if necessary
	 */
	private async ensureDirectoryExists(): Promise<void> {
		if (!(await this.adapter.exists(this.config.dataDir))) {
			await this.adapter.ensureDir(this.config.dataDir);
		}
	}
}
