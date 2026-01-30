import { ToolChatBlock, ToolChatCompletion } from '../types';
import { StreamTextAccumulator } from './streamTextAccumulator';

type ProcessChatFlowOptions<B = ToolChatBlock> = {
  hasTools: boolean;
  runWithoutTools: () => Promise<string>;
  runWithTools: () => Promise<ToolChatCompletion<B>>;
  onCompleteResponse: (text: string) => Promise<void>;
  toolErrorMessage: string;
  onToolBlocks?: (blocks: B[]) => void;
};

export async function processChatWithOptionalTools<B = ToolChatBlock>(
  options: ProcessChatFlowOptions<B>,
): Promise<void> {
  if (!options.hasTools) {
    const full = await options.runWithoutTools();
    await options.onCompleteResponse(full);
    return;
  }

  const result = await options.runWithTools();
  if (options.onToolBlocks) {
    options.onToolBlocks(result.blocks);
  }

  if (result.stop_reason === 'end') {
    const full = StreamTextAccumulator.getFullText(
      result.blocks as ToolChatBlock[],
    );
    await options.onCompleteResponse(full);
    return;
  }

  throw new Error(options.toolErrorMessage);
}
