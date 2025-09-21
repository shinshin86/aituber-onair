import { BushitsuClient } from '../client/BushitsuClient';
import type { BushitsuClientOptions } from '../client/types';
import {
  createWebSocketTransport,
  type WebSocketFactory,
  type WebSocketLike,
} from '../transports/webSocketTransport';

export interface NodeBushitsuClientOptions extends BushitsuClientOptions {
  /**
   * Custom WebSocket factory for advanced scenarios.
   * When provided, `webSocketImpl` is ignored.
   */
  createWebSocket?: WebSocketFactory;
  /**
   * WebSocket constructor (e.g. from the `ws` package).
   * If omitted, `globalThis.WebSocket` will be used.
   */
  webSocketImpl?: new (
    url: string,
  ) => WebSocketLike;
}

export const createNodeBushitsuClient = (
  options: NodeBushitsuClientOptions,
): BushitsuClient => {
  const { createWebSocket, webSocketImpl, ...rest } = options;

  const clientOptions: BushitsuClientOptions = { ...rest };

  const factory: WebSocketFactory =
    createWebSocket ??
    ((url: string) => {
      const Impl =
        webSocketImpl ??
        (globalThis as { WebSocket?: new (url: string) => WebSocketLike })
          .WebSocket;

      if (!Impl) {
        throw new Error(
          'No WebSocket implementation found. Provide webSocketImpl ' +
            'or createWebSocket.',
        );
      }

      return new Impl(url);
    });

  const transport = createWebSocketTransport(factory);

  return new BushitsuClient(clientOptions, { transport });
};
