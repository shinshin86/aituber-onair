import { EventEmitter } from './EventEmitter';
import { ChatProcessor, ChatProcessorOptions } from './ChatProcessor';
import { MemoryManager, MemoryOptions, Summarizer } from './MemoryManager';
import { ChatService } from '../services/chat/ChatService';
import { OpenAISummarizer } from '../services/chat/providers/openai/OpenAISummarizer';
import {
  VoiceService,
  VoiceServiceOptions,
  AudioPlayOptions,
} from '../services/voice/VoiceService';
import { VoiceEngineAdapter } from '../services/voice/VoiceEngineAdapter';
import { Message, MemoryStorage, MCPServerConfig } from '../types';
import { textToScreenplay, screenplayToText } from '../utils/screenplay';
import { ChatServiceFactory } from '../services/chat/ChatServiceFactory';
import { ChatServiceOptions } from '../services/chat/providers/ChatServiceProvider';
import { GeminiSummarizer } from '../services/chat/providers/gemini/GeminiSummarizer';
import { ClaudeSummarizer } from '../services/chat/providers/claude/ClaudeSummarizer';
import { ToolExecutor } from './ToolExecutor';
import {
  ToolDefinition,
  ToolUseBlock,
  ToolResultBlock,
} from '../types/toolChat';

/**
 * Setting options for AITuberOnAirCore
 */
export interface AITuberOnAirCoreOptions {
  /** AI provider name */
  chatProvider?: string;
  /** AI API key */
  apiKey: string;
  /** AI model name (default is provider's default model) */
  model?: string;
  /** ChatProcessor options */
  chatOptions: Omit<ChatProcessorOptions, 'useMemory'>;
  /** Memory options (disabled by default) */
  memoryOptions?: MemoryOptions;
  /** Memory storage for persistence (optional) */
  memoryStorage?: MemoryStorage;
  /** Voice service options */
  voiceOptions?: VoiceServiceOptions;
  /** Debug mode */
  debug?: boolean;
  /** ChatService provider-specific options (optional) */
  providerOptions?: Record<string, any>;
  /** Tools */
  tools?: {
    definition: ToolDefinition;
    handler: (input: any) => Promise<any>;
  }[];
  /** MCP servers configuration (Claude only) */
  mcpServers?: MCPServerConfig[];
}

/**
 * Event types for AITuberOnAirCore
 */
export enum AITuberOnAirCoreEvent {
  /** Processing started */
  PROCESSING_START = 'processingStart',
  /** Processing ended */
  PROCESSING_END = 'processingEnd',
  /** Assistant (partial) response */
  ASSISTANT_PARTIAL = 'assistantPartial',
  /** Assistant response completed */
  ASSISTANT_RESPONSE = 'assistantResponse',
  /** Speech started */
  SPEECH_START = 'speechStart',
  /** Speech ended */
  SPEECH_END = 'speechEnd',
  /** Error occurred */
  ERROR = 'error',
  /** Tool use */
  TOOL_USE = 'toolUse',
  /** Tool result */
  TOOL_RESULT = 'toolResult',
  /** Chat history set */
  CHAT_HISTORY_SET = 'chatHistorySet',
  /** Chat history cleared */
  CHAT_HISTORY_CLEARED = 'chatHistoryCleared',
  /** Memory created */
  MEMORY_CREATED = 'memoryCreated',
  /** Memory removed */
  MEMORY_REMOVED = 'memoryRemoved',
  /** Memory loaded */
  MEMORY_LOADED = 'memoryLoaded',
  /** Memory saved */
  MEMORY_SAVED = 'memorySaved',
  /** Storage cleared */
  STORAGE_CLEARED = 'storageCleared',
}

/**
 * AITuberOnAirCore is a core class that integrates the main features of AITuber
 * - Chat processing (ChatService, ChatProcessor)
 * - Speech synthesis (VoiceService)
 * - Memory management (MemoryManager)
 */
export class AITuberOnAirCore extends EventEmitter {
  private chatService: ChatService;
  private chatProcessor: ChatProcessor;
  private memoryManager?: MemoryManager;
  private voiceService?: VoiceService;
  private isProcessing: boolean = false;
  private debug: boolean;
  private toolExecutor: ToolExecutor = new ToolExecutor();
  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: AITuberOnAirCoreOptions) {
    super();
    this.debug = options.debug || false;

    // Determine provider name (default is 'openai')
    const providerName = options.chatProvider || 'openai';

    // Register tools
    options.tools?.forEach((t) =>
      this.toolExecutor.register(t.definition, t.handler),
    );

    // Build chat service options
    const chatServiceOptions: ChatServiceOptions = {
      apiKey: options.apiKey,
      model: options.model,
      ...options.providerOptions,
      tools: this.toolExecutor.listDefinitions(),
    };

    // Add MCP servers for providers that support remote MCP
    if (
      (providerName === 'claude' || providerName === 'openai') &&
      options.mcpServers
    ) {
      (chatServiceOptions as any).mcpServers = options.mcpServers;
    }

    // Initialize ChatService
    this.chatService = ChatServiceFactory.createChatService(
      providerName,
      chatServiceOptions,
    );

    // Initialize MemoryManager (optional)
    if (options.memoryOptions?.enableSummarization) {
      let summarizer: Summarizer;

      if (providerName === 'gemini') {
        summarizer = new GeminiSummarizer(
          options.apiKey,
          options.model,
          options.memoryOptions.summaryPromptTemplate,
        );
      } else if (providerName === 'claude') {
        summarizer = new ClaudeSummarizer(
          options.apiKey,
          options.model,
          options.memoryOptions.summaryPromptTemplate,
        );
      } else {
        summarizer = new OpenAISummarizer(
          options.apiKey,
          options.model,
          options.memoryOptions.summaryPromptTemplate,
        );
      }

      this.memoryManager = new MemoryManager(
        options.memoryOptions,
        summarizer,
        options.memoryStorage,
      );
    }

    // Initialize ChatProcessor
    this.chatProcessor = new ChatProcessor(
      this.chatService,
      {
        ...options.chatOptions,
        useMemory: !!this.memoryManager,
      },
      this.memoryManager,
      this.handleToolUse.bind(this),
    );

    // Forward events
    this.setupEventForwarding();

    // Initialize VoiceService (optional)
    if (options.voiceOptions) {
      this.voiceService = new VoiceEngineAdapter(options.voiceOptions);
    }

    this.log('AITuberOnAirCore initialized');
  }

  /**
   * Process text chat
   * @param text User input text
   * @returns Success or failure of processing
   */
  async processChat(text: string): Promise<boolean> {
    if (this.isProcessing) {
      this.log('Already processing another chat');
      return false;
    }

    try {
      this.isProcessing = true;
      this.emit(AITuberOnAirCoreEvent.PROCESSING_START, { text });

      // Process text chat
      await this.chatProcessor.processTextChat(text);

      return true;
    } catch (error) {
      this.log('Error in processChat:', error);
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
      return false;
    } finally {
      this.isProcessing = false;
      this.emit(AITuberOnAirCoreEvent.PROCESSING_END);
    }
  }

  /**
   * Process image-based chat
   * @param imageDataUrl Image data URL
   * @param visionPrompt Custom prompt for describing the image (optional)
   * @returns Success or failure of processing
   */
  async processVisionChat(
    imageDataUrl: string,
    visionPrompt?: string,
  ): Promise<boolean> {
    if (this.isProcessing) {
      this.log('Already processing another chat');
      return false;
    }

    try {
      this.isProcessing = true;
      this.emit(AITuberOnAirCoreEvent.PROCESSING_START, { type: 'vision' });

      // Update vision prompt if provided
      if (visionPrompt) {
        this.chatProcessor.updateOptions({ visionPrompt });
      }

      // Process image in ChatProcessor
      await this.chatProcessor.processVisionChat(imageDataUrl);

      return true;
    } catch (error) {
      this.log('Error in processVisionChat:', error);
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
      return false;
    } finally {
      this.isProcessing = false;
      this.emit(AITuberOnAirCoreEvent.PROCESSING_END);
    }
  }

  /**
   * Stop speech playback
   */
  stopSpeech(): void {
    if (this.voiceService) {
      this.voiceService.stop();
      this.emit(AITuberOnAirCoreEvent.SPEECH_END);
    }
  }

  /**
   * Get chat history
   */
  getChatHistory(): Message[] {
    return this.chatProcessor.getChatLog();
  }

  /**
   * Set chat history from external source
   * @param messages Message array to set as chat history
   */
  setChatHistory(messages: Message[]): void {
    this.chatProcessor.setChatLog(messages);
    this.emit(AITuberOnAirCoreEvent.CHAT_HISTORY_SET, messages);
  }

  /**
   * Clear chat history
   */
  clearChatHistory(): void {
    this.chatProcessor.clearChatLog();
    this.emit(AITuberOnAirCoreEvent.CHAT_HISTORY_CLEARED);
    if (this.memoryManager) {
      this.memoryManager.clearAllMemories();
    }
  }

  /**
   * Update voice service
   * @param options New voice service options
   */
  updateVoiceService(options: VoiceServiceOptions): void {
    if (this.voiceService) {
      this.voiceService.updateOptions(options);
    } else {
      this.voiceService = new VoiceEngineAdapter(options);
    }
  }

  /**
   * Speak text with custom voice options
   * @param text Text to speak
   * @param options Speech options
   * @returns Promise that resolves when speech is complete
   */
  async speakTextWithOptions(
    text: string,
    options?: {
      enableAnimation?: boolean;
      temporaryVoiceOptions?: Partial<VoiceServiceOptions>;
      audioElementId?: string;
    },
  ): Promise<void> {
    if (!this.voiceService) {
      this.log('Voice service is not initialized');
      return;
    }

    this.log(`Speaking text with options: ${JSON.stringify(options)}`);

    // Store the original voice options
    let originalVoiceOptions: Partial<VoiceServiceOptions> | undefined;

    try {
      // Apply temporary voice options if provided
      if (options?.temporaryVoiceOptions) {
        // We'll save what we're currently using and restore it later
        originalVoiceOptions = {
          speaker: (this.voiceService as any).options?.speaker,
          engineType: (this.voiceService as any).options?.engineType,
          apiKey: (this.voiceService as any).options?.apiKey,
        };

        // Apply temporary options
        this.voiceService.updateOptions(options.temporaryVoiceOptions);
      }

      // Set up audio options
      const audioOptions: AudioPlayOptions = {
        enableAnimation: options?.enableAnimation,
        audioElementId: options?.audioElementId,
      };

      const screenplay = textToScreenplay(text);

      // generate raw text(text with emotion tags)
      const rawText = screenplayToText(screenplay);

      // pass screenplay object as event data
      this.emit(AITuberOnAirCoreEvent.SPEECH_START, { screenplay, rawText });

      // Play the audio
      await this.voiceService.speakText(rawText, audioOptions);

      // Speech end event
      this.emit(AITuberOnAirCoreEvent.SPEECH_END);
    } catch (error) {
      this.log('Error in speakTextWithOptions:', error);
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
    } finally {
      // Restore original options if they were changed
      if (originalVoiceOptions && this.voiceService) {
        this.voiceService.updateOptions(originalVoiceOptions);
      }
    }
  }

  /**
   * Setup forwarding of ChatProcessor events
   */
  private setupEventForwarding(): void {
    this.chatProcessor.on('processingStart', (data) => {
      this.emit(AITuberOnAirCoreEvent.PROCESSING_START, data);
    });

    this.chatProcessor.on('processingEnd', () => {
      this.emit(AITuberOnAirCoreEvent.PROCESSING_END);
    });

    this.chatProcessor.on('assistantPartialResponse', (text) => {
      this.emit(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, text);
    });

    this.chatProcessor.on('assistantResponse', async (data) => {
      const { message, screenplay } = data;

      // Generate the raw text with emotion tags using utility function
      const rawText = screenplayToText(screenplay);

      // Fire assistant response event
      this.emit(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, {
        message,
        screenplay,
        rawText,
      });

      // Speech synthesis and playback (if VoiceService exists)
      if (this.voiceService) {
        try {
          this.emit(AITuberOnAirCoreEvent.SPEECH_START, screenplay);

          await this.voiceService.speak(screenplay, {
            enableAnimation: true,
          });

          this.emit(AITuberOnAirCoreEvent.SPEECH_END);
        } catch (error) {
          this.log('Error in speech synthesis:', error);
          this.emit(AITuberOnAirCoreEvent.ERROR, error);
        }
      }
    });

    this.chatProcessor.on('error', (error) => {
      this.emit(AITuberOnAirCoreEvent.ERROR, error);
    });

    if (this.memoryManager) {
      this.memoryManager.on('error', (error) => {
        this.emit(AITuberOnAirCoreEvent.ERROR, error);
      });
    }
  }

  /**
   * Handle tool use
   * @param blocks Tool use blocks
   * @returns Tool result blocks
   */
  private async handleToolUse(
    blocks: ToolUseBlock[],
  ): Promise<ToolResultBlock[]> {
    this.emit(AITuberOnAirCoreEvent.TOOL_USE, blocks);

    const results = await this.toolExecutor.run(blocks);

    this.emit(AITuberOnAirCoreEvent.TOOL_RESULT, results);
    return results;
  }

  /**
   * Output debug log (only in debug mode)
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[AITuberOnAirCore]', ...args);
    }
  }

  /**
   * Generate new content based on the system prompt and the provided message history (one-shot).
   * The provided message history is used only for this generation and does not affect the internal chat history.
   * This is ideal for generating standalone content like blog posts, reports, or summaries from existing conversations.
   *
   * @param prompt The system prompt to guide the content generation
   * @param messageHistory The message history to use as context
   * @returns The generated content as a string
   */
  async generateOneShotContentFromHistory(
    prompt: string,
    messageHistory: Message[],
  ): Promise<string> {
    const messages: Message[] = [{ role: 'system', content: prompt }];
    messages.push(...messageHistory);

    const result = await this.chatService.chatOnce(messages, false, () => {});
    return result.blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
  }

  /**
   * Check if memory functionality is enabled
   */
  isMemoryEnabled(): boolean {
    return !!this.memoryManager;
  }

  /**
   * Remove all event listeners
   */
  offAll(): void {
    this.removeAllListeners();
  }

  /**
   * Get current provider information
   * @returns Provider information object
   */
  getProviderInfo(): { name: string; model?: string } {
    // Safe method to get internal information without depending on specific provider implementation
    // If only available in specific provider implementations, cast to any type
    const provider = (this.chatService as any).provider;
    const model = (this.chatService as any).model;

    return {
      name: provider ? provider : 'unknown',
      model: model ? model : undefined,
    };
  }

  /**
   * Get list of available providers
   * @returns Array of available provider names
   */
  static getAvailableProviders(): string[] {
    return ChatServiceFactory.getAvailableProviders();
  }

  /**
   * Get list of models supported by the specified provider
   * @param providerName Provider name
   * @returns Array of supported models
   */
  static getSupportedModels(providerName: string): string[] {
    return ChatServiceFactory.getSupportedModels(providerName);
  }
}
