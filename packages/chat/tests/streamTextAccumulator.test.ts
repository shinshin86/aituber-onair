import { describe, it, expect } from 'vitest';
import { StreamTextAccumulator } from '../src/utils/streamTextAccumulator';
import type { ToolChatBlock } from '../src/types';

describe('StreamTextAccumulator', () => {
  describe('append', () => {
    it('should append text to empty blocks array', () => {
      const blocks: ToolChatBlock[] = [];
      StreamTextAccumulator.append(blocks, 'Hello');

      expect(blocks).toEqual([{ type: 'text', text: 'Hello' }]);
    });

    it('should merge text with last text block', () => {
      const blocks: ToolChatBlock[] = [{ type: 'text', text: 'Hello' }];
      StreamTextAccumulator.append(blocks, ' world');

      expect(blocks).toEqual([{ type: 'text', text: 'Hello world' }]);
    });

    it('should create new text block when last block is not text', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'text', text: 'Hello' },
        { type: 'tool-use', name: 'test', params: {}, id: '123' },
      ];
      StreamTextAccumulator.append(blocks, ' world');

      expect(blocks).toEqual([
        { type: 'text', text: 'Hello' },
        { type: 'tool-use', name: 'test', params: {}, id: '123' },
        { type: 'text', text: ' world' },
      ]);
    });

    it('should not append empty text', () => {
      const blocks: ToolChatBlock[] = [];
      StreamTextAccumulator.append(blocks, '');

      expect(blocks).toEqual([]);
    });

    it('should handle multiple appends', () => {
      const blocks: ToolChatBlock[] = [];
      StreamTextAccumulator.append(blocks, 'Hello');
      StreamTextAccumulator.append(blocks, ' ');
      StreamTextAccumulator.append(blocks, 'world');
      StreamTextAccumulator.append(blocks, '!');

      expect(blocks).toEqual([{ type: 'text', text: 'Hello world!' }]);
    });

    it('should handle appending after tool blocks', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'text', text: 'Before tool' },
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
        { type: 'tool-result', content: 'result1', id: '1' },
      ];

      StreamTextAccumulator.append(blocks, 'After tool');

      expect(blocks).toEqual([
        { type: 'text', text: 'Before tool' },
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
        { type: 'tool-result', content: 'result1', id: '1' },
        { type: 'text', text: 'After tool' },
      ]);
    });
  });

  describe('getFullText', () => {
    it('should concatenate all text blocks', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' ' },
        { type: 'text', text: 'world' },
      ];

      const fullText = StreamTextAccumulator.getFullText(blocks);
      expect(fullText).toBe('Hello world');
    });

    it('should ignore non-text blocks', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'text', text: 'Before' },
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
        { type: 'text', text: ' middle' },
        { type: 'tool-result', content: 'result1', id: '1' },
        { type: 'text', text: ' after' },
      ];

      const fullText = StreamTextAccumulator.getFullText(blocks);
      expect(fullText).toBe('Before middle after');
    });

    it('should return empty string for empty blocks', () => {
      const blocks: ToolChatBlock[] = [];
      const fullText = StreamTextAccumulator.getFullText(blocks);
      expect(fullText).toBe('');
    });

    it('should return empty string for blocks with no text blocks', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
        { type: 'tool-result', content: 'result1', id: '1' },
      ];

      const fullText = StreamTextAccumulator.getFullText(blocks);
      expect(fullText).toBe('');
    });
  });

  describe('addTextBlock', () => {
    it('should add new text block without merging', () => {
      const blocks: ToolChatBlock[] = [{ type: 'text', text: 'Hello' }];
      StreamTextAccumulator.addTextBlock(blocks, ' world');

      expect(blocks).toEqual([
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' world' },
      ]);
    });

    it('should not add empty text block', () => {
      const blocks: ToolChatBlock[] = [];
      StreamTextAccumulator.addTextBlock(blocks, '');

      expect(blocks).toEqual([]);
    });

    it('should add multiple text blocks', () => {
      const blocks: ToolChatBlock[] = [];
      StreamTextAccumulator.addTextBlock(blocks, 'First');
      StreamTextAccumulator.addTextBlock(blocks, 'Second');
      StreamTextAccumulator.addTextBlock(blocks, 'Third');

      expect(blocks).toEqual([
        { type: 'text', text: 'First' },
        { type: 'text', text: 'Second' },
        { type: 'text', text: 'Third' },
      ]);
    });

    it('should add text block after tool blocks', () => {
      const blocks: ToolChatBlock[] = [
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
      ];
      StreamTextAccumulator.addTextBlock(blocks, 'After tool');

      expect(blocks).toEqual([
        { type: 'tool-use', name: 'tool1', params: {}, id: '1' },
        { type: 'text', text: 'After tool' },
      ]);
    });
  });
});
