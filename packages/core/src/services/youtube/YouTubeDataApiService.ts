import { ENDPOINT_YOUTUBE_API } from '../../constants';
import { EventEmitter } from '../../core/EventEmitter';
import {
  YouTubeService,
  YouTubeServiceOptions,
  YouTubeComment,
} from './YouTubeService';

/**
 * YouTube Data API implementation using YouTube service
 */
export class YouTubeDataApiService
  extends EventEmitter
  implements YouTubeService
{
  private options: YouTubeServiceOptions;
  private isWatchingLive: boolean = false;
  private watchingIntervalId: number | null = null;
  private nextPageToken: string = '';
  private currentLiveId: string = '';

  /**
   * Constructor
   * @param options Service settings options
   */
  constructor(options: YouTubeServiceOptions) {
    super();
    this.options = {
      apiKey: options.apiKey,
      fetchInterval: options.fetchInterval || 20000, // デフォルト20秒
      selectionStrategy: options.selectionStrategy || 'random',
    };
  }

  /**
   * Start watching live comments
   * @param liveId Live ID
   */
  async startWatching(liveId: string): Promise<void> {
    if (this.isWatchingLive) {
      this.stopWatching();
    }

    this.isWatchingLive = true;
    this.nextPageToken = '';
    this.currentLiveId = liveId;

    try {
      // Get live chat ID
      const liveChatId = await this.getLiveChatId(liveId);

      if (!liveChatId) {
        console.error('Could not get live chat ID');
        this.isWatchingLive = false;
        this.emit('error', new Error('Could not get live chat ID'));
        return;
      }

      // Get comments periodically
      this.watchingIntervalId = window.setInterval(async () => {
        try {
          await this.fetchAndProcessComments(liveChatId);
        } catch (error) {
          console.error('Error fetching comments:', error);
          this.emit('error', error);
        }
      }, this.options.fetchInterval);

      this.emit('watchingStarted', liveId);
    } catch (error) {
      console.error('Error starting live monitoring:', error);
      this.isWatchingLive = false;
      this.emit('error', error);
    }
  }

  /**
   * Stop watching live comments
   */
  stopWatching(): void {
    if (this.watchingIntervalId) {
      window.clearInterval(this.watchingIntervalId);
      this.watchingIntervalId = null;
    }
    this.isWatchingLive = false;
    this.nextPageToken = '';
    this.currentLiveId = '';
    this.emit('watchingStopped');
  }

  /**
   * Return whether currently fetching
   */
  isWatching(): boolean {
    return this.isWatchingLive;
  }

  /**
   * Set comment fetch interval
   * @param interval Interval in milliseconds
   */
  setFetchInterval(interval: number): void {
    this.options.fetchInterval = interval;

    // If currently watching, update interval
    if (this.isWatchingLive && this.watchingIntervalId && this.currentLiveId) {
      window.clearInterval(this.watchingIntervalId);
      this.watchingIntervalId = window.setInterval(async () => {
        try {
          const liveChatId = await this.getLiveChatId(this.currentLiveId);
          if (liveChatId) {
            await this.fetchAndProcessComments(liveChatId);
          }
        } catch (error) {
          console.error('Error fetching comments:', error);
          this.emit('error', error);
        }
      }, interval);
    }
  }

  /**
   * Set comment selection strategy
   * @param strategy Selection strategy ('random' or 'latest')
   */
  setSelectionStrategy(strategy: 'random' | 'latest'): void {
    this.options.selectionStrategy = strategy;
  }

  /**
   * Fetch latest comments (for manual retrieval)
   * @param liveId Live ID
   * @returns Comments array
   */
  async fetchLatestComments(liveId: string): Promise<YouTubeComment[]> {
    try {
      const liveChatId = await this.getLiveChatId(liveId);
      if (!liveChatId) {
        return [];
      }

      return await this.retrieveLiveComments(liveChatId, false);
    } catch (error) {
      console.error('Error fetching comments:', error);
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Subscribe to comment reception event
   * @param callback Callback when comment is received
   */
  onComment(callback: (comment: YouTubeComment) => void): void {
    this.on('comment', callback);
  }

  /**
   * Get live chat ID
   * @param liveId Live ID
   * @returns Live chat ID
   */
  private async getLiveChatId(liveId: string): Promise<string> {
    try {
      const params = {
        part: 'liveStreamingDetails',
        id: liveId,
        key: this.options.apiKey,
      };

      const query = new URLSearchParams(params);
      const response = await fetch(`${ENDPOINT_YOUTUBE_API}/videos?${query}`, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const json = await response.json();

      if (!json.items || json.items.length === 0) {
        console.warn('Live broadcast information not found:', json);
        return '';
      }

      const liveStreamingDetails = json.items[0].liveStreamingDetails;
      if (!liveStreamingDetails || !liveStreamingDetails.activeLiveChatId) {
        console.warn('Live chat ID not found:', json.items[0]);
        return '';
      }

      return liveStreamingDetails.activeLiveChatId;
    } catch (error) {
      console.error('Error fetching live chat ID:', error);
      this.emit('error', error);
      return '';
    }
  }

  /**
   * Fetch live comments
   * @param liveChatId Live chat ID
   * @param usePageToken Whether to use page token
   * @returns Comments array
   */
  private async retrieveLiveComments(
    liveChatId: string,
    usePageToken: boolean = true,
  ): Promise<YouTubeComment[]> {
    try {
      let url =
        `${ENDPOINT_YOUTUBE_API}/liveChat/messages?liveChatId=` +
        liveChatId +
        '&part=authorDetails%2Csnippet&key=' +
        this.options.apiKey;

      if (usePageToken && this.nextPageToken) {
        url += '&pageToken=' + this.nextPageToken;
      }

      const response = await fetch(url, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const json = await response.json();

      if (json.error) {
        console.error('YouTube API error:', json.error);
        this.emit(
          'error',
          new Error(json.error.message || 'YouTube API error'),
        );
        return [];
      }

      // Save next page token
      if (json.nextPageToken) {
        this.nextPageToken = json.nextPageToken;
      }

      if (!json.items || json.items.length === 0) {
        return [];
      }

      // Extract comment information
      const comments: YouTubeComment[] = json.items
        .map((item: any) => ({
          userName: item.authorDetails.displayName,
          userIconUrl: item.authorDetails.profileImageUrl,
          userComment:
            item.snippet.textMessageDetails?.messageText ||
            item.snippet.superChatDetails?.userComment ||
            '',
          publishedAt: item.snippet.publishedAt,
        }))
        .filter((comment: YouTubeComment) => comment.userComment !== '');

      return comments;
    } catch (error) {
      console.error('Error fetching live comments:', error);
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Fetch and process comments
   * @param liveChatId Live chat ID
   */
  private async fetchAndProcessComments(liveChatId: string): Promise<void> {
    try {
      const comments = await this.retrieveLiveComments(liveChatId);

      if (comments.length === 0) {
        return;
      }

      // Select comment based on selection strategy
      let selectedComment: YouTubeComment;

      if (this.options.selectionStrategy === 'random') {
        // Random selection
        selectedComment = comments[Math.floor(Math.random() * comments.length)];
      } else {
        // Latest comment selection
        selectedComment = comments[comments.length - 1];
      }

      // Emit comment event
      this.emit('comment', selectedComment);
    } catch (error) {
      console.error('Error processing comments:', error);
      this.emit('error', error);
    }
  }
}
