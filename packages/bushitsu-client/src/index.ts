// Core client
export { BushitsuClient } from './client/BushitsuClient.js';

// React hooks
export { useBushitsuClient } from './hooks/useBushitsuClient.js';
export { useBushitsuInitiative } from './hooks/useBushitsuInitiative.js';

// Environment bindings
export {
  createNodeBushitsuClient,
  type NodeBushitsuClientOptions,
} from './node/index.js';
export {
  createGasBushitsuMessageSender,
  type GasBushitsuSendOptions,
  type GasBushitsuSendOnlyClient,
  type GasPayloadBuilderInput,
} from './gas/index.js';

// Transport utilities (for advanced usage)
export {
  createWebSocketTransport,
  createBrowserWebSocketTransport,
  type WebSocketFactory,
  type WebSocketLike,
} from './transports/webSocketTransport.js';
export {
  type BushitsuTransport,
  type BushitsuTransportHandlers,
  type BushitsuTransportMessageEvent,
  type BushitsuTransportCloseEvent,
  BushitsuTransportReadyState,
} from './core/transport.js';

// Constants
export * from './client/constants.js';

// Types
export * from './types.js';

// Re-export client types for convenience
export type { BushitsuMessage, BushitsuClientOptions } from './client/types.js';
