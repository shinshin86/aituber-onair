export interface GasBushitsuSendOptions {
  endpoint: string;
  room: string;
  userName: string;
  /**
   * Custom fetch function. Defaults to `UrlFetchApp.fetch` when available.
   */
  fetchFn?: (url: string, params: GasFetchRequest) => unknown;
  /**
   * Additional HTTP headers to include in the request.
   */
  headers?: Record<string, string>;
  /**
   * HTTP method to use. Defaults to `post`.
   */
  method?: string;
  /**
   * Content type for the request payload. Defaults to `application/json`.
   */
  contentType?: string;
  /**
   * Allows overriding the payload structure.
   */
  payloadBuilder?: (
    input: GasPayloadBuilderInput,
  ) => string | Record<string, unknown>;
  /**
   * Whether to mute HTTP exceptions. Defaults to `true`.
   */
  muteHttpExceptions?: boolean;
}

export interface GasFetchRequest {
  method?: string;
  contentType?: string;
  headers?: Record<string, string>;
  payload?: string;
  muteHttpExceptions?: boolean;
}

export interface GasPayloadBuilderInput {
  text: string;
  mentionTo?: string;
  room: string;
  userName: string;
}

export interface GasBushitsuSendOnlyClient {
  sendMessage: (text: string, mentionTo?: string) => unknown;
}

export const createGasBushitsuMessageSender = (
  options: GasBushitsuSendOptions,
): GasBushitsuSendOnlyClient => {
  const {
    endpoint,
    room,
    userName,
    fetchFn,
    headers = {},
    method = 'post',
    contentType = 'application/json',
    payloadBuilder,
    muteHttpExceptions = true,
  } = options;

  if (!endpoint) {
    throw new Error('endpoint is required for the GAS message sender');
  }

  const resolveFetch = () => {
    if (fetchFn) {
      return fetchFn;
    }

    const urlFetchApp = (
      globalThis as {
        UrlFetchApp?: {
          fetch: (url: string, params: GasFetchRequest) => unknown;
        };
      }
    ).UrlFetchApp;

    if (urlFetchApp && typeof urlFetchApp.fetch === 'function') {
      return (url: string, params: GasFetchRequest) =>
        urlFetchApp.fetch(url, params);
    }

    throw new Error(
      'UrlFetchApp.fetch is not available. Provide a custom fetchFn in options.',
    );
  };

  const activeFetch = resolveFetch();

  const buildPayload = (input: GasPayloadBuilderInput) => {
    if (payloadBuilder) {
      const customPayload = payloadBuilder(input);
      return typeof customPayload === 'string'
        ? customPayload
        : JSON.stringify(customPayload);
    }

    return JSON.stringify({
      room: input.room,
      userName: input.userName,
      text: input.text,
      mentionTo: input.mentionTo,
    });
  };

  return {
    sendMessage: (text: string, mentionTo?: string) => {
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Cannot send an empty message');
      }

      const payload = buildPayload({ text, mentionTo, room, userName });

      return activeFetch(endpoint, {
        method,
        contentType,
        headers,
        payload,
        muteHttpExceptions,
      });
    },
  };
};
