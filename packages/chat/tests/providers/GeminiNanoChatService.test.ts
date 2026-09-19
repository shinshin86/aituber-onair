import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiNanoChatService } from '../../src/services/providers/geminiNano/GeminiNanoChatService';
import { MAX_TOKENS_BY_LENGTH } from '../../src/constants/chat';
import type { Message } from '../../src/types';

// Mock LanguageModel API
const mockPrompt = vi.fn();
const mockDestroy = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({
  prompt: mockPrompt,
  destroy: mockDestroy,
});
const mockAvailability = vi.fn().mockResolvedValue('available');

const mockLanguageModel = {
  availability: mockAvailability,
  create: mockCreate,
};

const createReadableStream = (chunks: string[]) =>
  new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });

describe('GeminiNanoChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).LanguageModel = mockLanguageModel;
  });

  afterEach(() => {
    (globalThis as any).LanguageModel = undefined;
  });

  it('should return gemini-nano as model name', () => {
    const service = new GeminiNanoChatService();
    expect(service.getModel()).toBe('gemini-nano');
    expect(service.getVisionModel()).toBe('gemini-nano');
  });

  describe('processChat', () => {
    it('should create a session and return a response', async () => {
      mockPrompt.mockResolvedValue('Hello from Nano!');

      const service = new GeminiNanoChatService();
      const messages: Message[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ];

      const onPartial = vi.fn();
      const onComplete = vi.fn().mockResolvedValue(undefined);

      await service.processChat(messages, onPartial, onComplete);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          initialPrompts: [{ role: 'system', content: 'You are helpful.' }],
          expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
          expectedOutputs: [{ type: 'text', languages: ['ja'] }],
        }),
      );
      expect(mockAvailability).toHaveBeenCalledWith({
        expectedInputs: [{ type: 'text', languages: ['ja', 'en'] }],
        expectedOutputs: [{ type: 'text', languages: ['ja'] }],
      });
      expect(mockPrompt).toHaveBeenCalledWith('Hi');
      expect(mockDestroy).toHaveBeenCalledTimes(1);
      expect(onPartial).toHaveBeenCalledWith('Hello from Nano!');
      expect(onComplete).toHaveBeenCalledWith('Hello from Nano!');
    });

    it('should recreate session for every request', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService();

      await service.processChat(
        [
          { role: 'system', content: 'Prompt A' },
          { role: 'user', content: 'Hi' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      await service.processChat(
        [
          { role: 'system', content: 'Prompt A' },
          { role: 'user', content: 'Hi again' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockDestroy).toHaveBeenCalledTimes(2);
    });

    it('should stream delta chunks and complete with the full response', async () => {
      const promptStreaming = vi.fn(() => createReadableStream(['Hel', 'lo']));
      mockCreate.mockResolvedValueOnce({
        prompt: mockPrompt,
        promptStreaming,
        destroy: mockDestroy,
      });

      const service = new GeminiNanoChatService();
      const onPartial = vi.fn();
      const onComplete = vi.fn().mockResolvedValue(undefined);

      await service.processChat(
        [{ role: 'user', content: 'Hi' }],
        onPartial,
        onComplete,
      );

      expect(promptStreaming).toHaveBeenCalledWith('Hi');
      expect(onPartial).toHaveBeenNthCalledWith(1, 'Hel');
      expect(onPartial).toHaveBeenNthCalledWith(2, 'lo');
      expect(onComplete).toHaveBeenCalledWith('Hello');
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should normalize cumulative stream chunks into deltas', async () => {
      const promptStreaming = vi.fn(() =>
        createReadableStream(['Hel', 'Hello']),
      );
      mockCreate.mockResolvedValueOnce({
        prompt: mockPrompt,
        promptStreaming,
        destroy: mockDestroy,
      });

      const service = new GeminiNanoChatService();
      const onPartial = vi.fn();
      const onComplete = vi.fn().mockResolvedValue(undefined);

      await service.processChat(
        [{ role: 'user', content: 'Hi' }],
        onPartial,
        onComplete,
      );

      expect(onPartial).toHaveBeenNthCalledWith(1, 'Hel');
      expect(onPartial).toHaveBeenNthCalledWith(2, 'lo');
      expect(onComplete).toHaveBeenCalledWith('Hello');
    });

    it('should lock delta mode after a non-cumulative chunk', async () => {
      const promptStreaming = vi.fn(() =>
        createReadableStream(['a', 'b', 'ab']),
      );
      mockCreate.mockResolvedValueOnce({
        prompt: mockPrompt,
        promptStreaming,
        destroy: mockDestroy,
      });

      const service = new GeminiNanoChatService();
      const onPartial = vi.fn();
      const onComplete = vi.fn().mockResolvedValue(undefined);

      await service.processChat(
        [{ role: 'user', content: 'Hi' }],
        onPartial,
        onComplete,
      );

      expect(onPartial).toHaveBeenNthCalledWith(1, 'a');
      expect(onPartial).toHaveBeenNthCalledWith(2, 'b');
      expect(onPartial).toHaveBeenNthCalledWith(3, 'ab');
      expect(onComplete).toHaveBeenCalledWith('abab');
    });

    it('should destroy the session and propagate stream errors', async () => {
      const promptStreaming = vi.fn(
        () =>
          new ReadableStream<string>({
            start(controller) {
              controller.enqueue('Hello');
              controller.error(new Error('stream failed'));
            },
          }),
      );
      mockCreate.mockResolvedValueOnce({
        prompt: mockPrompt,
        promptStreaming,
        destroy: mockDestroy,
      });

      const service = new GeminiNanoChatService();
      await expect(
        service.processChat(
          [{ role: 'user', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('stream failed');

      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('should preserve conversation history roles in initial prompts', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService();
      const messages: Message[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ];

      await service.processChat(
        messages,
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.initialPrompts).toEqual([
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ]);
      expect(mockPrompt).toHaveBeenCalledWith('Q2');
    });

    it('should place configured examples after the system prompt', async () => {
      mockPrompt.mockResolvedValue('Response');

      const service = new GeminiNanoChatService({
        initialPrompts: [
          { role: 'user', content: 'Example question' },
          { role: 'assistant', content: 'Short example answer.' },
          { role: 'system', content: 'Use a friendly tone.' },
        ],
      });

      await service.processChat(
        [
          { role: 'system', content: 'You are a character.' },
          { role: 'user', content: 'Current question' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.initialPrompts).toEqual([
        {
          role: 'system',
          content: 'You are a character.\n\nUse a friendly tone.',
        },
        { role: 'user', content: 'Example question' },
        { role: 'assistant', content: 'Short example answer.' },
      ]);
    });
  });

  describe('persistent session mode', () => {
    const turn = async (
      service: GeminiNanoChatService,
      messages: Message[],
    ) => {
      const onComplete = vi.fn().mockResolvedValue(undefined);
      await service.processChat(messages, vi.fn(), onComplete);
      return onComplete;
    };

    it('reuses one cloned session and sends only new user text', async () => {
      const liveSession = {
        prompt: vi
          .fn()
          .mockResolvedValueOnce('A1')
          .mockResolvedValueOnce('A2')
          .mockResolvedValueOnce('A3'),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(liveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
        { role: 'assistant', content: 'A2' },
        { role: 'user', content: 'Q3' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.clone).toHaveBeenCalledTimes(1);
      expect(liveSession.prompt).toHaveBeenNthCalledWith(1, 'Q1');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(2, 'Q2');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(3, 'Q3');
      expect(mockAvailability).toHaveBeenCalledTimes(1);
    });

    it('reuses the live session when callers pass only a history suffix', async () => {
      const liveSession = {
        prompt: vi.fn(),
        destroy: vi.fn(),
      };
      liveSession.prompt
        .mockResolvedValueOnce('A1')
        .mockResolvedValueOnce('A2')
        .mockResolvedValueOnce('A3')
        .mockResolvedValueOnce('A4')
        .mockResolvedValueOnce('A5');
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(liveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      const histories: Message[][] = [
        [{ role: 'user', content: 'Q1' }],
        [
          { role: 'user', content: 'Q1' },
          { role: 'assistant', content: 'A1' },
          { role: 'user', content: 'Q2' },
        ],
        [
          { role: 'user', content: 'Q2' },
          { role: 'assistant', content: 'A2' },
          { role: 'user', content: 'Q3' },
        ],
        [
          { role: 'user', content: 'Q3' },
          { role: 'assistant', content: 'A3' },
          { role: 'user', content: 'Q4' },
        ],
        [
          { role: 'user', content: 'Q4' },
          { role: 'assistant', content: 'A4' },
          { role: 'user', content: 'Q5' },
        ],
      ];
      for (const messages of histories) await turn(service, messages);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.clone).toHaveBeenCalledTimes(1);
      expect(liveSession.prompt).toHaveBeenNthCalledWith(1, 'Q1');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(2, 'Q2');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(3, 'Q3');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(4, 'Q4');
      expect(liveSession.prompt).toHaveBeenNthCalledWith(5, 'Q5');
    });

    it('starts a fresh clone when non-empty consumed history is cleared', async () => {
      const firstLiveSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const secondLiveSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi
          .fn()
          .mockResolvedValueOnce(firstLiveSession)
          .mockResolvedValueOnce(secondLiveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [{ role: 'user', content: 'Q2' }]);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.clone).toHaveBeenCalledTimes(2);
      expect(firstLiveSession.destroy).toHaveBeenCalledTimes(1);
      expect(secondLiveSession.prompt).toHaveBeenCalledWith('Q2');
    });

    it('continues reusing after the service-level history cap', async () => {
      const liveSession = {
        prompt: vi.fn(),
        destroy: vi.fn(),
      };
      for (let turnNumber = 1; turnNumber <= 12; turnNumber += 1) {
        liveSession.prompt.mockResolvedValueOnce(`A${turnNumber}`);
      }
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(liveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      const transcript: Message[] = [];
      for (let turnNumber = 1; turnNumber <= 12; turnNumber += 1) {
        const history = transcript.slice();
        history.push({ role: 'user', content: `Q${turnNumber}` });
        await turn(service, history);
        transcript.push(
          { role: 'user', content: `Q${turnNumber}` },
          { role: 'assistant', content: `A${turnNumber}` },
        );
      }

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.clone).toHaveBeenCalledTimes(1);
      expect(liveSession.prompt).toHaveBeenCalledTimes(12);
      expect(liveSession.prompt).toHaveBeenLastCalledWith('Q12');
    });

    it('falls back to the base session when clone is unavailable', async () => {
      const baseSession = {
        prompt: vi.fn().mockResolvedValueOnce('A1').mockResolvedValueOnce('A2'),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.prompt).toHaveBeenNthCalledWith(1, 'Q1');
      expect(baseSession.prompt).toHaveBeenNthCalledWith(2, 'Q2');
    });

    it('keeps the rebuilt no-clone session key for following turns', async () => {
      const firstBaseSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const rebuiltBaseSession = {
        prompt: vi.fn().mockResolvedValueOnce('A2').mockResolvedValueOnce('A3'),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(firstBaseSession)
        .mockResolvedValueOnce(rebuiltBaseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [
        { role: 'user', content: 'Edited Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);
      await turn(service, [
        { role: 'user', content: 'Edited Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
        { role: 'assistant', content: 'A2' },
        { role: 'user', content: 'Q3' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(rebuiltBaseSession.prompt).toHaveBeenNthCalledWith(1, 'Q2');
      expect(rebuiltBaseSession.prompt).toHaveBeenNthCalledWith(2, 'Q3');
    });

    it('starts a fresh no-clone session for a new conversation', async () => {
      const firstBaseSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const secondBaseSession = {
        prompt: vi.fn().mockResolvedValue('B1'),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(firstBaseSession)
        .mockResolvedValueOnce(secondBaseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Conversation A' }]);
      await turn(service, [{ role: 'user', content: 'Conversation B' }]);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(firstBaseSession.destroy).toHaveBeenCalledTimes(1);
      expect(mockCreate.mock.calls[1][0].initialPrompts).toBeUndefined();
      expect(secondBaseSession.prompt).toHaveBeenCalledWith('Conversation B');
    });

    it('destroys a failed live turn before the caller retries', async () => {
      const firstLiveSession = {
        prompt: vi
          .fn()
          .mockResolvedValueOnce('A1')
          .mockRejectedValueOnce(new Error('aborted')),
        destroy: vi.fn(),
      };
      const retryLiveSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(firstLiveSession),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(baseSession)
        .mockResolvedValueOnce(retryLiveSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await expect(
        service.processChat(
          [
            { role: 'user', content: 'Q1' },
            { role: 'assistant', content: 'A1' },
            { role: 'user', content: 'Q2' },
          ],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('aborted');
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(baseSession.clone).toHaveBeenCalledTimes(1);
      expect(firstLiveSession.destroy).toHaveBeenCalledTimes(1);
      expect(baseSession.destroy).not.toHaveBeenCalled();
      expect(retryLiveSession.prompt).toHaveBeenCalledTimes(1);
      expect(retryLiveSession.prompt).toHaveBeenCalledWith('Q2');
      expect(mockCreate.mock.calls[1][0].initialPrompts).toEqual([
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ]);
    });

    it('rebuilds the live session when history diverges but reuses the base', async () => {
      const liveSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const rebuiltSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(liveSession),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(baseSession)
        .mockResolvedValueOnce(rebuiltSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [
        { role: 'user', content: 'Edited Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(liveSession.destroy).toHaveBeenCalledTimes(1);
      expect(baseSession.destroy).not.toHaveBeenCalled();
      expect(rebuiltSession.prompt).toHaveBeenCalledWith('Q2');
      expect(mockCreate.mock.calls[1][0].initialPrompts).toEqual([
        { role: 'user', content: 'Edited Q1' },
        { role: 'assistant', content: 'A1' },
      ]);
    });

    it('rebuilds the base session when the system prompt changes', async () => {
      const firstLiveSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const rebuiltSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const firstBaseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(firstLiveSession),
        destroy: vi.fn(),
      };
      const secondBaseSession = {
        prompt: mockPrompt,
        clone: vi.fn(),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(firstBaseSession)
        .mockResolvedValueOnce(secondBaseSession)
        .mockResolvedValueOnce(rebuiltSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [
        { role: 'system', content: 'System A' },
        { role: 'user', content: 'Q1' },
      ]);
      await turn(service, [
        { role: 'system', content: 'System B' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(firstLiveSession.destroy).toHaveBeenCalledTimes(1);
      expect(firstBaseSession.destroy).toHaveBeenCalledTimes(1);
      expect(mockCreate.mock.calls[1][0].initialPrompts).toEqual([
        { role: 'system', content: 'System B' },
      ]);
      expect(secondBaseSession.clone).not.toHaveBeenCalled();
      expect(rebuiltSession.prompt).toHaveBeenCalledWith('Q2');
    });

    it('retries quota errors with a fresh session and records only consumed turns', async () => {
      const firstLiveSession = {
        prompt: vi
          .fn()
          .mockResolvedValueOnce('A1')
          .mockRejectedValueOnce({ name: 'QuotaExceededError' }),
        destroy: vi.fn(),
      };
      const retryLiveSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi
          .fn()
          .mockResolvedValueOnce(firstLiveSession)
          .mockResolvedValueOnce(retryLiveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
      ]);
      await turn(service, [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
        { role: 'user', content: 'Q2' },
        { role: 'assistant', content: 'A2' },
        { role: 'user', content: 'Q3' },
      ]);

      expect(firstLiveSession.destroy).toHaveBeenCalledTimes(1);
      expect(retryLiveSession.prompt).toHaveBeenCalledWith('Q2');
      expect(retryLiveSession.prompt).toHaveBeenCalledWith('Q3');
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(baseSession.clone).toHaveBeenCalledTimes(2);
    });

    it('keeps a persistent streaming session alive until dispose', async () => {
      const liveSession = {
        prompt: mockPrompt,
        promptStreaming: vi.fn(() => createReadableStream(['A', '1'])),
        destroy: vi.fn(),
      };
      const baseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(liveSession),
        destroy: vi.fn(),
      };
      mockCreate.mockResolvedValueOnce(baseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await service.processChat(
        [{ role: 'user', content: 'Q1' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(liveSession.destroy).not.toHaveBeenCalled();
      service.dispose();
      expect(liveSession.destroy).toHaveBeenCalledTimes(1);
      expect(baseSession.destroy).toHaveBeenCalledTimes(1);
    });

    it('makes dispose idempotent and allows the next call to create sessions', async () => {
      const firstLiveSession = {
        prompt: vi.fn().mockResolvedValue('A1'),
        destroy: vi.fn(),
      };
      const secondLiveSession = {
        prompt: vi.fn().mockResolvedValue('A2'),
        destroy: vi.fn(),
      };
      const firstBaseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(firstLiveSession),
        destroy: vi.fn(),
      };
      const secondBaseSession = {
        prompt: mockPrompt,
        clone: vi.fn().mockResolvedValue(secondLiveSession),
        destroy: vi.fn(),
      };
      mockCreate
        .mockResolvedValueOnce(firstBaseSession)
        .mockResolvedValueOnce(secondBaseSession);

      const service = new GeminiNanoChatService({
        sessionMode: 'persistent',
      });
      await turn(service, [{ role: 'user', content: 'Q1' }]);
      service.dispose();
      service.dispose();
      await turn(service, [{ role: 'user', content: 'Q2' }]);

      expect(firstLiveSession.destroy).toHaveBeenCalledTimes(1);
      expect(firstBaseSession.destroy).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(secondLiveSession.prompt).toHaveBeenCalledWith('Q2');
    });
  });

  describe('processVisionChat', () => {
    it('should throw error', async () => {
      const service = new GeminiNanoChatService();
      await expect(
        service.processVisionChat(
          [],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('Gemini Nano does not support vision');
    });
  });

  describe('chatOnce', () => {
    it('should return ToolChatCompletion with text block', async () => {
      mockPrompt.mockResolvedValue('Answer');

      const service = new GeminiNanoChatService();
      const result = await service.chatOnce(
        [{ role: 'user', content: 'Question' }],
        false,
      );

      expect(result).toEqual({
        blocks: [{ type: 'text', text: 'Answer' }],
        stop_reason: 'end',
      });
    });

    it('should use promptStreaming when stream is enabled', async () => {
      const promptStreaming = vi.fn(() => createReadableStream(['Hel', 'lo']));
      mockCreate.mockResolvedValueOnce({
        prompt: mockPrompt,
        promptStreaming,
        destroy: mockDestroy,
      });

      const service = new GeminiNanoChatService();
      const onPartial = vi.fn();
      const result = await service.chatOnce(
        [{ role: 'user', content: 'Question' }],
        true,
        onPartial,
      );

      expect(promptStreaming).toHaveBeenCalledWith('Question');
      expect(onPartial).toHaveBeenNthCalledWith(1, 'Hel');
      expect(onPartial).toHaveBeenNthCalledWith(2, 'lo');
      expect(result.blocks).toEqual([{ type: 'text', text: 'Hello' }]);
    });
  });

  describe('visionChatOnce', () => {
    it('should throw error', async () => {
      const service = new GeminiNanoChatService();
      await expect(service.visionChatOnce([])).rejects.toThrow(
        'Gemini Nano does not support vision',
      );
    });
  });

  describe('environment check', () => {
    it('should throw when LanguageModel is not available', async () => {
      (globalThis as any).LanguageModel = undefined;

      const service = new GeminiNanoChatService();
      await expect(
        service.processChat(
          [{ role: 'user', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('Gemini Nano is not available');
    });

    it('should throw when LanguageModel availability is unsupported', async () => {
      mockAvailability.mockResolvedValueOnce('unavailable');

      const service = new GeminiNanoChatService();
      await expect(
        service.processChat(
          [{ role: 'user', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('LanguageModel.availability() returned "unavailable"');

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should throw before session creation when no user message exists', async () => {
      const service = new GeminiNanoChatService();

      await expect(
        service.processChat(
          [{ role: 'assistant', content: 'Hi' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        ),
      ).rejects.toThrow('No user message found in the provided messages.');

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('custom languages', () => {
    it('should use provided languages in session creation', async () => {
      mockPrompt.mockResolvedValue('Hello');

      const service = new GeminiNanoChatService({
        expectedInputLanguages: ['en'],
        expectedOutputLanguages: ['en'],
      });

      await service.processChat(
        [{ role: 'user', content: 'Hi' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        }),
      );
    });
  });

  describe('responseLength', () => {
    it('should inject concrete short-response rules into the system prompt', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });

      await service.processChat(
        [
          { role: 'system', content: 'あなたは親切です。' },
          { role: 'user', content: '要約して' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain('あなたは親切です。');
      expect(systemPrompt).toContain(
        'Reply in no more than two concise sentences',
      );
      expect(systemPrompt).toContain('Do not use a preamble');
      expect(systemPrompt).toMatch(/within approximately 100 tokens/);
    });

    it('should inject only the length instruction when system prompt is empty', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });

      await service.processChat(
        [{ role: 'user', content: '要約して' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain(
        `within approximately ${MAX_TOKENS_BY_LENGTH.short} tokens`,
      );
      expect(systemPrompt).toContain(
        'Reply in no more than two concise sentences',
      );
      expect(systemPrompt.startsWith('\n\n')).toBe(false);
    });

    it.each([
      ['veryShort', 'no more than one concise sentence', 40],
      ['short', 'no more than two concise sentences', 100],
      ['medium', 'no more than three concise sentences', 200],
      ['long', 'no more than five sentences', 300],
      ['veryLong', 'no more than ten sentences', 1000],
    ] as const)(
      'should apply the %s sentence profile',
      async (responseLength, sentenceRule, maxTokens) => {
        mockPrompt.mockResolvedValue('回答');

        const service = new GeminiNanoChatService({ responseLength });

        await service.processChat(
          [{ role: 'user', content: '説明して' }],
          vi.fn(),
          vi.fn().mockResolvedValue(undefined),
        );

        const createCall = mockCreate.mock.calls[0][0];
        const systemPrompt = createCall.initialPrompts[0].content as string;
        expect(systemPrompt).toContain(sentenceRule);
        expect(systemPrompt).toContain(
          `within approximately ${maxTokens} tokens`,
        );
      },
    );

    it('should leave sentence count unrestricted for deep responses', async () => {
      mockPrompt.mockResolvedValue('詳細な回答');

      const service = new GeminiNanoChatService({
        responseLength: 'deep',
      });

      await service.processChat(
        [{ role: 'user', content: '詳しく説明して' }],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toContain(
        'No sentence-count limit applies at this level',
      );
      expect(systemPrompt).toContain(
        `within approximately ${MAX_TOKENS_BY_LENGTH.deep} tokens`,
      );
    });

    it('should keep the length instruction in the leading system prompt', async () => {
      mockPrompt.mockResolvedValue('短い回答');

      const service = new GeminiNanoChatService({
        responseLength: 'short',
      });
      const messages: Message[] = [
        { role: 'system', content: 'あなたは親切です。' },
        { role: 'user', content: '最初の質問' },
        { role: 'assistant', content: '最初の回答' },
        { role: 'user', content: '次の質問' },
      ];

      await service.processChat(
        messages,
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      const baseIndex = systemPrompt.indexOf('あなたは親切です。');
      const lengthIndex = systemPrompt.indexOf(
        `within approximately ${MAX_TOKENS_BY_LENGTH.short} tokens`,
      );

      expect(baseIndex).toBeGreaterThanOrEqual(0);
      expect(lengthIndex).toBeGreaterThan(baseIndex);
      expect(createCall.initialPrompts.slice(1)).toEqual([
        { role: 'user', content: '最初の質問' },
        { role: 'assistant', content: '最初の回答' },
      ]);
    });

    it('should not inject a token budget when responseLength is unset', async () => {
      mockPrompt.mockResolvedValue('通常回答');

      const service = new GeminiNanoChatService();

      await service.processChat(
        [
          { role: 'system', content: 'あなたは親切です。' },
          { role: 'user', content: '要約して' },
        ],
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      const createCall = mockCreate.mock.calls[0][0];
      const systemPrompt = createCall.initialPrompts[0].content as string;
      expect(systemPrompt).toBe('あなたは親切です。');
      expect(systemPrompt).not.toMatch(/within approximately \d+ tokens/);
    });
  });
});
