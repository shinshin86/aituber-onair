import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatServiceFactory,
  type ChatService,
  type ToolChatCompletion,
} from '@aituber-onair/chat';
import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
} from '../../src/core/AITuberOnAirCore';

const completion: ToolChatCompletion = {
  blocks: [{ type: 'text', text: 'Hello' }],
  stop_reason: 'end',
};

function createService() {
  return {
    provider: 'openai',
    getModel: vi.fn().mockReturnValue('gpt-4.1-mini'),
    getVisionModel: vi.fn().mockReturnValue('gpt-4.1-mini'),
    processChat: vi.fn(),
    processVisionChat: vi.fn(),
    chatOnce: vi.fn().mockResolvedValue(completion),
    visionChatOnce: vi.fn().mockResolvedValue(completion),
    dispose: vi.fn(),
  } satisfies ChatService;
}

function createCore() {
  return new AITuberOnAirCore({
    apiKey: 'test-key',
    model: 'gpt-4.1-mini',
    chatOptions: { systemPrompt: 'Be helpful.', responseLength: 'short' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AITuberOnAirCore.dispose', () => {
  beforeEach(() => {
    vi.spyOn(ChatServiceFactory, 'createChatService').mockImplementation(() =>
      createService(),
    );
  });

  it('disposes the chat service and removes event listeners once', () => {
    // Arrange
    const core = createCore();
    const service = vi.mocked(ChatServiceFactory.createChatService).mock
      .results[0].value;
    const listener = vi.fn();
    core.on(AITuberOnAirCoreEvent.PROCESSING_START, listener);

    // Act
    core.dispose();
    core.dispose();
    core.emit(AITuberOnAirCoreEvent.PROCESSING_START);

    // Assert
    expect(service.dispose).toHaveBeenCalledOnce();
    expect(listener).not.toHaveBeenCalled();
  });

  it('disposes a pending replacement service during processing', async () => {
    // Arrange
    const core = createCore();
    const factory = vi.mocked(ChatServiceFactory.createChatService);
    const activeService = factory.mock.results[0].value;
    let resolve!: (value: ToolChatCompletion) => void;
    activeService.chatOnce.mockReturnValueOnce(
      new Promise<ToolChatCompletion>((done) => {
        resolve = done;
      }),
    );
    const processing = core.processChat('Hello');
    await vi.waitFor(() =>
      expect(activeService.chatOnce).toHaveBeenCalledOnce(),
    );
    core.updateChatOptions({ responseLength: 'long' });
    const pendingService = factory.mock.results[1].value;

    // Act
    core.dispose();
    resolve(completion);
    await processing;

    // Assert
    expect(pendingService.dispose).toHaveBeenCalledOnce();
    expect(activeService.dispose).toHaveBeenCalledOnce();
  });

  it('stops speech playback', () => {
    // Arrange
    const core = createCore();
    const stop = vi.fn();
    (core as any).voiceService = { stop };

    // Act
    core.dispose();

    // Assert
    expect(stop).toHaveBeenCalledOnce();
  });
});
