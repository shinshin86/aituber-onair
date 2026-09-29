/** Creates the Node.js Cursor CLI ACP backend over local JSONL stdio. */
export { createCursorAcpBackend } from './backends/cursor/CursorAcpBackend.js';
/** ACP protocol version verified by this package. */
export { CURSOR_ACP_PROTOCOL_VERSION } from './backends/cursor/protocol.js';
/** Public configuration, feature, Session, and backend contracts for Cursor ACP. */
export type * from './backends/cursor/types.js';
