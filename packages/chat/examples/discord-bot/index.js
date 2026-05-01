#!/usr/bin/env node

const { ChatServiceFactory, runOnceText } = require('@aituber-onair/chat');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const DEFAULT_CHARACTER_NAME = 'ミコ';
const DEFAULT_CHARACTER_PROFILE =
  '明るく親しみやすいAIキャラクター。相手の話をよく聞き、短めの日本語で自然に返事をします。';
const DEFAULT_HISTORY_LIMIT = 12;
const DISCORD_MESSAGE_LIMIT = 1900;

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
    `あなたはDiscordに住んでいるAIキャラクター「${characterName}」です。`,
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

function getHistoryKey(message) {
  if (message.guildId) {
    return `${message.guildId}:${message.channelId}`;
  }

  return `dm:${message.author.id}`;
}

function stripBotMention(text, botUserId) {
  if (!botUserId) return text.trim();

  return text
    .replace(new RegExp(`<@!?${botUserId}>`, 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitDiscordMessage(text) {
  if (text.length <= DISCORD_MESSAGE_LIMIT) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > DISCORD_MESSAGE_LIMIT) {
    const splitAt = remaining.lastIndexOf('\n', DISCORD_MESSAGE_LIMIT);
    const index = splitAt > 0 ? splitAt : DISCORD_MESSAGE_LIMIT;
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

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('Missing DISCORD_BOT_TOKEN.');
  }

  const chat = createChatService();
  const history = new Map();
  const processing = new Set();
  const historyLimit = Number(
    process.env.BOT_HISTORY_LIMIT || DEFAULT_HISTORY_LIMIT,
  );
  const respondToAll = process.env.DISCORD_RESPOND_TO_ALL === 'true';

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Chat provider: ${process.env.CHAT_PROVIDER || 'openai'}`);
    console.log(
      respondToAll
        ? 'Responding to every non-bot message.'
        : 'Responding to mentions and direct messages.',
    );
    console.log(
      `Character: ${process.env.BOT_CHARACTER_NAME || DEFAULT_CHARACTER_NAME}`,
    );
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isDirectMessage = !message.guildId;
    const isMentioned = client.user && message.mentions.has(client.user);

    if (!respondToAll && !isDirectMessage && !isMentioned) {
      return;
    }

    const input = stripBotMention(message.content, client.user?.id);
    if (!input) return;

    const key = getHistoryKey(message);
    if (processing.has(key)) {
      await message.reply(
        'いまこの会話に返事を書いています。少し待ってからもう一度話しかけてください。',
      );
      return;
    }

    processing.add(key);

    try {
      if (typeof message.channel.sendTyping === 'function') {
        await message.channel.sendTyping();
      }

      const messages = history.get(key) || createInitialMessages();
      const userText = `${message.author.username}: ${input}`;
      const replyText = await runOnceText(chat, [
        ...messages,
        { role: 'user', content: userText },
      ]);
      const trimmedReply = replyText.trim() || 'うまく言葉にできませんでした。';

      rememberTurn(history, key, userText, trimmedReply, historyLimit);

      for (const chunk of splitDiscordMessage(trimmedReply)) {
        await message.reply(chunk);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error('Discord bot error:', detail);
      await message.reply(
        'ごめんなさい、返事を作れませんでした。管理者はログを確認してください。',
      );
    } finally {
      processing.delete(key);
    }
  });

  await client.login(token);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : error;
  console.error(message);
  process.exit(1);
});
