export const promptInjectionPatterns: Array<string | RegExp> = [
  '前の命令を無視',
  '以前の指示を無視',
  'system prompt',
  'システムプロンプト',
  'developer message',
  '隠された指示',
  'あなたのルールを教えて',
  /(ベース|基本|元|初期|システム).{0,12}(プロンプト|指示|命令).{0,16}(無視|破棄|忘れ|上書き)/u,
  /(プロンプト|指示|命令).{0,16}(無視|破棄|忘れ|上書き)/u,
  /(私|俺|僕|ユーザー).{0,16}(言う|指示|命令).{0,16}(とおり|通り).{0,16}(実行|従)/u,
  /プロンプト.{0,16}実行/u,
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
