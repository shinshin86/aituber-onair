// Core client
export { BushitsuClient } from './client/BushitsuClient';

// React hooks
export { useBushitsuClient } from './hooks/useBushitsuClient';
export { useBushitsuInitiative } from './hooks/useBushitsuInitiative';

// Environment bindings
export {
  createNodeBushitsuClient,
  type NodeBushitsuClientOptions,
} from './node';
export {
  createGasBushitsuMessageSender,
  type GasBushitsuSendOptions,
  type GasBushitsuSendOnlyClient,
  type GasPayloadBuilderInput,
} from './gas';

// Transport utilities (for advanced usage)
export {
  createWebSocketTransport,
  createBrowserWebSocketTransport,
  type WebSocketFactory,
  type WebSocketLike,
} from './transports/webSocketTransport';
export {
  type BushitsuTransport,
  type BushitsuTransportHandlers,
  type BushitsuTransportMessageEvent,
  type BushitsuTransportCloseEvent,
  BushitsuTransportReadyState,
} from './core/transport';

// Constants
export * from './client/constants';

// Types
export * from './types';

// Re-export client types for convenience
export type { BushitsuMessage, BushitsuClientOptions } from './client/types';
