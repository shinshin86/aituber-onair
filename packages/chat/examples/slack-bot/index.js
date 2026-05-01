#!/usr/bin/env node

const { ChatServiceFactory, runOnceText } = require('@aituber-onair/chat');
const { App } = require('@slack/bolt');

const DEFAULT_CHARACTER_NAME = 'ミコ';
const DEFAULT_CHARACTER_PROFILE =
  '明るく親しみやすいAIキャラクター。相手の話をよく聞き、短めの日本語で自然に返事をします。';
const DEFAULT_HISTORY_LIMIT = 12;
const SLACK_MESSAGE_LIMIT = 3500;

function getProviderApiKey(provider) {
  const keys = {
    openai: process.env.OPENAI_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    zai: process.env.ZAI_API_KEY,
    xai: process.env.XAI_API_KEY,
    kimi: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY,
  };

  return process.env.CHAT_API_KEY || keys[provider];
}

function createChatService() {
  const provider = process.env.CHAT_PROVIDER || 'openai';
  const model = process.env.CHAT_MODEL;
  const apiKey =
    getProviderApiKey(provider) ||
    (provider === 'openai-compatible' ? 'dummy-key' : undefined);

  if (!apiKey) {
    throw new Error(
      `Missing API key. Set CHAT_API_KEY or the provider-specific key for ${provider}.`,
    );
  }

  const options = {
    apiKey,
    responseLength: process.env.CHAT_RESPONSE_LENGTH || 'short',
  };

  if (model) {
    options.model = model;
  }

  if (provider === 'openai-compatible') {
    const endpoint =
      process.env.CHAT_ENDPOINT || process.env.OPENAI_COMPAT_ENDPOINT;

    if (!endpoint) {
      throw new Error(
        'Missing endpoint. Set CHAT_ENDPOINT for openai-compatible provider.',
      );
    }

    options.endpoint = endpoint;
  }

  return ChatServiceFactory.createChatService(provider, options);
}

function buildSystemPrompt() {
  if (process.env.BOT_SYSTEM_PROMPT) {
    return process.env.BOT_SYSTEM_PROMPT;
  }

  const characterName =
    process.env.BOT_CHARACTER_NAME || DEFAULT_CHARACTER_NAME;
  const characterProfile =
    process.env.BOT_CHARACTER_PROFILE || DEFAULT_CHARACTER_PROFILE;

  return [
    `あなたはSlackに住んでいるAIキャラクター「${characterName}」です。`,
    `キャラクター設定: ${characterProfile}`,
    'ユーザーとは自然な日本語で会話してください。',
    '返答は短く、親しみやすく、会話の流れに合う内容にしてください。',
    '必要以上に自分をAIやBotとして説明しないでください。',
    '相手の名前や直近の会話履歴が分かる場合は、それを踏まえて返答してください。',
  ].join('\n');
}

function createInitialMessages() {
  return [{ role: 'system', content: buildSystemPrompt() }];
}

function stripSlackMentions(text) {
  return text
    .replace(/<@[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getHistoryKey(event) {
  return `${event.channel}:${event.thread_ts || event.ts}`;
}

function splitSlackMessage(text) {
  if (text.length <= SLACK_MESSAGE_LIMIT) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > SLACK_MESSAGE_LIMIT) {
    const splitAt = remaining.lastIndexOf('\n', SLACK_MESSAGE_LIMIT);
    const index = splitAt > 0 ? splitAt : SLACK_MESSAGE_LIMIT;
    chunks.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function rememberTurn(history, key, userText, assistantText, limit) {
  const messages = history.get(key) || createInitialMessages();

  messages.push({ role: 'user', content: userText });
  messages.push({ role: 'assistant', content: assistantText });

  const systemMessage = messages[0];
  const recentMessages = messages.slice(1).slice(limit * -2);
  history.set(key, [systemMessage, ...recentMessages]);
}

async function handleSlackMessage({
  event,
  say,
  chat,
  history,
  processing,
  historyLimit,
}) {
  if (event.bot_id || event.subtype) return;

  const input = stripSlackMentions(event.text || '');
  if (!input) return;

  const key = getHistoryKey(event);
  const threadTs = event.thread_ts || event.ts;

  if (processing.has(key)) {
    await say({
      text: 'いまこのスレッドに返事を書いています。少し待ってからもう一度話しかけてください。',
      thread_ts: threadTs,
    });
    return;
  }

  processing.add(key);

  try {
    const messages = history.get(key) || createInitialMessages();
    const userLabel = 'Slackユーザー';
    const userText = `${userLabel}: ${input}`;
    const replyText = await runOnceText(chat, [
      ...messages,
      { role: 'user', content: userText },
    ]);
    const trimmedReply = replyText.trim() || 'うまく言葉にできませんでした。';

    rememberTurn(history, key, userText, trimmedReply, historyLimit);

    for (const chunk of splitSlackMessage(trimmedReply)) {
      await say({ text: chunk, thread_ts: threadTs });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Slack bot error:', detail);
    await say({
      text: 'ごめんなさい、返事を作れませんでした。管理者はログを確認してください。',
      thread_ts: threadTs,
    });
  } finally {
    processing.delete(key);
  }
}

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;

  if (!token) {
    throw new Error('Missing SLACK_BOT_TOKEN.');
  }
  if (!appToken) {
    throw new Error('Missing SLACK_APP_TOKEN for Socket Mode.');
  }

  const chat = createChatService();
  const history = new Map();
  const processing = new Set();
  const historyLimit = Number(
    process.env.BOT_HISTORY_LIMIT || DEFAULT_HISTORY_LIMIT,
  );
  const respondToDirectMessages =
    process.env.SLACK_RESPOND_TO_DIRECT_MESSAGES !== 'false';

  const app = new App({
    token,
    appToken,
    socketMode: true,
  });

  app.event('app_mention', async ({ event, say }) => {
    await handleSlackMessage({
      event,
      say,
      chat,
      history,
      processing,
      historyLimit,
    });
  });

  app.message(async ({ message, say }) => {
    if (!respondToDirectMessages) return;
    if (message.channel_type !== 'im') return;

    await handleSlackMessage({
      event: message,
      say,
      chat,
      history,
      processing,
      historyLimit,
    });
  });

  await app.start();
  console.log('Slack bot is running in Socket Mode.');
  console.log(`Chat provider: ${process.env.CHAT_PROVIDER || 'openai'}`);
  console.log(
    `Character: ${process.env.BOT_CHARACTER_NAME || DEFAULT_CHARACTER_NAME}`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : error;
  console.error(message);
  process.exit(1);
});
