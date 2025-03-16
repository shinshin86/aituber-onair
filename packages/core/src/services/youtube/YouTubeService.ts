/**
 * YouTube comment type definition
 */
export interface YouTubeComment {
  /** User name */
  userName: string;
  /** User icon URL */
  userIconUrl: string;
  /** Comment content */
  userComment: string;
  /** Published time */
  publishedAt?: string;
}

/**
 * YouTube service settings options
 */
export interface YouTubeServiceOptions {
  /** YouTube Data API key */
  apiKey: string;
  /** Comment fetch interval (milliseconds) */
  fetchInterval?: number;
  /** Comment selection strategy ('random' or 'latest') */
  selectionStrategy?: 'random' | 'latest';
}

/**
 * YouTube service interface
 */
export interface YouTubeService {
  /**
   * Start watching live comments
   * @param liveId Live ID
   */
  startWatching(liveId: string): Promise<void>;

  /**
   * Stop watching live comments
   */
  stopWatching(): void;

  /**
   * Return whether currently fetching
   */
  isWatching(): boolean;

  /**
   * Set comment fetch interval
   * @param interval Interval in milliseconds
   */
  setFetchInterval(interval: number): void;

  /**
   * Set comment selection strategy
   * @param strategy Selection strategy ('random' or 'latest')
   */
  setSelectionStrategy(strategy: 'random' | 'latest'): void;

  /**
   * Fetch latest comments (for manual retrieval)
   * @param liveId Live ID
   * @returns Comments array
   */
  fetchLatestComments(liveId: string): Promise<YouTubeComment[]>;

  /**
   * Subscribe to comment reception event
   * @param callback Callback when comment is received
   */
  onComment(callback: (comment: YouTubeComment) => void): void;
}
