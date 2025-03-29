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
import { Message, MemoryStorage } from '../types';
import { textToScreenplay, screenplayToText } from '../utils/screenplay';
import { ChatServiceFactory } from '../services/chat/ChatServiceFactory';
import { ChatServiceOptions } from '../services/chat/providers/ChatServiceProvider';
import { MODEL_GEMINI_2_0_FLASH_LITE, MODEL_GPT_4O_MINI } from '../constants';
import { GeminiSummarizer } from '../services/chat/providers/gemini/GeminiSummarizer';

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

  /**
   * Constructor
   * @param options Configuration options
   */
  constructor(options: AITuberOnAirCoreOptions) {
    super();
    this.debug = options.debug || false;

    // Determine provider name (default is 'openai')
    const providerName = options.chatProvider || 'openai';

    // Build chat service options
    const chatServiceOptions: ChatServiceOptions = {
      apiKey: options.apiKey,
      model: options.model,
      ...options.providerOptions,
    };

    // Initialize ChatService
    this.chatService = ChatServiceFactory.createChatService(
      providerName,
      chatServiceOptions,
    );

    // Initialize MemoryManager (optional)
    if (options.memoryOptions && options.memoryOptions.enableSummarization) {
      let summarizer: Summarizer;

      if (providerName === 'gemini') {
        summarizer = new GeminiSummarizer(
          options.apiKey,
          options.model || MODEL_GEMINI_2_0_FLASH_LITE,
          options.memoryOptions.summaryPromptTemplate,
        );
      } else {
        summarizer = new OpenAISummarizer(
          options.apiKey,
          options.model || MODEL_GPT_4O_MINI,
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
   * Clear chat history
   */
  clearChatHistory(): void {
    this.chatProcessor.clearChatLog();
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
      await this.voiceService.speakText(screenplay.text, audioOptions);

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
   * Output debug log (only in debug mode)
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[AITuberOnAirCore]', ...args);
    }
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
