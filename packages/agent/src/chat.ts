/** Creates an Agent backend backed by one isolated ChatService per Session. */
export { createChatServiceBackend } from './backends/chat/ChatServiceBackend.js';
/** Public configuration and feature contracts for the ChatService backend. */
export type * from './backends/chat/types.js';
