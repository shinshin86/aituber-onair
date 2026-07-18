import { ToolChatBlock, ToolChatCompletion } from '../types';
import { StreamTextAccumulator } from './streamTextAccumulator';

type ProcessChatFlowOptions<B = ToolChatBlock> = {
  hasTools: boolean;
  runWithoutTools: () => Promise<string | ToolChatCompletion<B>>;
  runWithTools: () => Promise<ToolChatCompletion<B>>;
  onCompleteResponse: (
    text: string,
    completion?: ToolChatCompletion<B>,
  ) => Promise<void>;
  toolErrorMessage: string;
  onToolBlocks?: (blocks: B[]) => void;
};

export async function processChatWithOptionalTools<B = ToolChatBlock>(
  options: ProcessChatFlowOptions<B>,
): Promise<void> {
  if (!options.hasTools) {
    const result = await options.runWithoutTools();
    if (typeof result === 'string') {
      await options.onCompleteResponse(result);
      return;
    }

    const full = StreamTextAccumulator.getFullText(
      result.blocks as ToolChatBlock[],
    );
    await options.onCompleteResponse(full, result);
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
    await options.onCompleteResponse(full, result);
    return;
  }

  throw new Error(options.toolErrorMessage);
}
