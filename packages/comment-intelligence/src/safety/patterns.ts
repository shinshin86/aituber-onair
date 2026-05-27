export const promptInjectionPatterns: Array<string | RegExp> = [
  '前の命令を無視',
  '以前の指示を無視',
  'ベースプロンプトは無視',
  '私の言うとおりにプロンプトを実行',
  'system prompt',
  'システムプロンプト',
  'developer message',
  '隠された指示',
  'あなたのルールを教えて',
  /プロンプト.*無視/u,
  /プロンプト.*実行/u,
  'ignore previous',
  'ignore all previous',
  'reveal your prompt',
  'reveal your system prompt',
  'show your system',
];

export const urlPatterns: RegExp[] = [
  /https?:\/\/\S+/i,
  /www\.[^\s]+/i,
  /\b[a-z0-9-]+\.(?:com|net|org|jp|io|dev|app)(?:\/[^\s]*)?\b/i,
];

export const personalInfoPatterns: Array<string | RegExp> = [
  '住所',
  '電話番号',
  '本名',
  '個人情報',
  /phone number/i,
  /address/i,
  /real name/i,
];

export const harassmentPatterns: Array<string | RegExp> = [
  '死ね',
  '消えろ',
  'ばか',
  'バカ',
  /kill yourself/i,
  /idiot/i,
  /stupid/i,
];

export const sexualPatterns: Array<string | RegExp> = [
  '性的',
  'エロ',
  /sexual/i,
  /nude/i,
];

export const violencePatterns: Array<string | RegExp> = [
  '殺す',
  '殴る',
  /violence/i,
  /attack/i,
];
