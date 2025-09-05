/**
 * Google Apps Script example for @aituber-onair/chat using UMD bundle.
 * Requires: aituber-onair-chat.min.js loaded as a script file (e.g., lib.js).
 */

async function testChat() {
  // Install fetch backed by UrlFetchApp
  AITuberOnAirChat.installGASFetch();

  const chat = AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
    apiKey:
      PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'),
    model: AITuberOnAirChat.MODEL_GPT_4_1_NANO,
  });

  const text = await AITuberOnAirChat.runOnceText(chat, [
    { role: 'user', content: 'Hello from GAS!' },
  ]);

  Logger.log(text);
}
