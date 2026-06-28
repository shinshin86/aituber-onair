import type { VisionSupportLevel } from '../services/providers/ChatServiceProvider';

export interface ChatProviderCapabilities {
  provider: string;
  models: string[];
  defaultModel?: string;
  text: boolean;
  streaming: boolean;
  vision: VisionSupportLevel;
  tools: boolean;
  mcp: boolean;
  jsonMode: boolean;
  responseLength: boolean;
  reasoningEffort: string[];
}
