import { createGasBushitsuMessageSender } from '@aituber-onair/bushitsu-client/gas';

declare const PropertiesService: {
  getScriptProperties(): {
    getProperty(key: string): string | null;
  };
};

declare const Logger: { log: (message: string) => void };

declare const UrlFetchApp: {
  fetch: (url: string, params: unknown) => unknown;
};

interface ScriptConfig {
  endpoint: string;
  room: string;
  userName: string;
}

const loadConfig = (): ScriptConfig => {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('BUSHITSU_ENDPOINT');
  const room = props.getProperty('BUSHITSU_ROOM') ?? 'lobby';
  const userName = props.getProperty('BUSHITSU_USER_NAME') ?? 'GAS Bot';

  if (!endpoint) {
    throw new Error('Set BUSHITSU_ENDPOINT in script properties.');
  }

  return { endpoint, room, userName };
};

const createSender = () => {
  const { endpoint, room, userName } = loadConfig();

  return createGasBushitsuMessageSender({
    endpoint,
    room,
    userName,
    fetchFn: (url, params) => UrlFetchApp.fetch(url, params),
  });
};

export function sendHello() {
  const sender = createSender();
  sender.sendMessage('Hello from Google Apps Script!');
  Logger.log('Message sent.');
}

export function sendWithCustomPayload() {
  const { endpoint, room, userName } = loadConfig();

  const sender = createGasBushitsuMessageSender({
    endpoint,
    room,
    userName,
    fetchFn: (url, params) => UrlFetchApp.fetch(url, params),
    payloadBuilder: ({ text, userName: user, room: targetRoom }) => ({
      channel: targetRoom,
      displayName: user,
      body: text,
    }),
  });

  sender.sendMessage('Custom payload example');
  Logger.log('Custom payload sent.');
}
