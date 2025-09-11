/*** settings ***/
const DEFAULT_MODEL = 'gpt-4.1-nano';
const RESPONSE_LENGTH = 'long';

/*** helper functions ***/
function getApiKey_() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}

function createChat_({ model = DEFAULT_MODEL, responseLength = RESPONSE_LENGTH } = {}) {
  // Inject fetch polyfill for AITuberOnAirChat
  AITuberOnAirChat.installGASFetch();
  return AITuberOnAirChat.ChatServiceFactory.createChatService('openai', {
    apiKey: getApiKey_(),
    model,
    responseLength
  });
}

// Build prompt to format response into key points + thank you message
function buildPrompt_(formTitle, qaText) {
  return [
    `フォーム「${formTitle}」への回答を、担当者から回答者へ送る「お礼＋要点まとめ」メール下書きに整形してください。`,
    '出力要件：',
    '1) 箇条書きで要点3つ（30秒で読める簡潔さ）',
    '2) 続けて、丁寧な日本語の本文（2〜4段落）',
    '3) 過度な約束や断定は禁止。未確定事項は「確認します」と表現。',
    '',
    '--- 回答内容（Q&A） ---',
    qaText
  ].join('\n');
}

// ---- Main trigger: executed when form is submitted ----
async function autoReply_onFormSubmit(e) {
  const form = FormApp.getActiveForm();
  const resp = e.response; // FormResponse
  const email = resp.getRespondentEmail(); // Only available when "collect email" is enabled in form settings
  if (!email) { console.warn('No respondent email. Is "collect email" enabled?'); return; }

  // Convert responses to Q&A text format
  const qa = resp.getItemResponses()
    .map(ir => `Q: ${ir.getItem().getTitle()}\nA: ${String(ir.getResponse())}`)
    .join('\n\n')
    .slice(0, 8000); // Safety limit for text length

  // Query LLM (GAS is non-streaming, use runOnceText for single response)
  const chat = createChat_({});
  const text = await AITuberOnAirChat.runOnceText(chat, [
    { role: 'system', content: 'あなたは礼儀正しい日本語の秘書です。冗長表現を避け、具体的で読みやすい文面を作成します。' },
    { role: 'user', content: buildPrompt_(form.getTitle(), qa) }
  ]);

  // Create Gmail draft (plain text; use options with htmlBody if needed)
  const subject = `ご回答ありがとうございます - ${form.getTitle()}`;
  GmailApp.createDraft(email, subject, String(text)); // Create draft only, do not send
  console.log(`Draft created for: ${email}`);
}

// ---- Initial setup (trigger creation) ----
function setupTrigger_autoReply() {
  const form = FormApp.getActiveForm();
  // Prevent duplicates: delete existing triggers with same handler name
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoReply_onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  // Create installable trigger for form submission
  ScriptApp.newTrigger('autoReply_onFormSubmit').forForm(form).onFormSubmit().create();
  console.log('Installable onFormSubmit trigger created.');
}
