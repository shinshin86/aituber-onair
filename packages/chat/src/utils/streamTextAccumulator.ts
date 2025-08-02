import { ToolChatBlock } from '../types';

/**
 * Utility class for accumulating text in streaming chat responses
 */
export class StreamTextAccumulator {
  /**
   * Append text to the blocks array, merging with the last block if it's a text block
   * @param blocks Array of chat blocks
   * @param text Text to append
   */
  static append(blocks: ToolChatBlock[], text: string): void {
    if (!text) return;

    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.type === 'text') {
      lastBlock.text += text;
    } else {
      blocks.push({ type: 'text', text });
    }
  }

  /**
   * Get the full concatenated text from all text blocks
   * @param blocks Array of chat blocks
   * @returns Concatenated text from all text blocks
   */
  static getFullText(blocks: ToolChatBlock[]): string {
    return blocks
      .filter(
        (block): block is { type: 'text'; text: string } =>
          block.type === 'text',
      )
      .map((block) => block.text)
      .join('');
  }

  /**
   * Add a text block without merging
   * @param blocks Array of chat blocks
   * @param text Text to add as a new block
   */
  static addTextBlock(blocks: ToolChatBlock[], text: string): void {
    if (!text) return;
    blocks.push({ type: 'text', text });
  }
}
