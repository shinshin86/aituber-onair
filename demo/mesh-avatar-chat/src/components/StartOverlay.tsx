import { useState } from 'react';

interface StartOverlayProps {
  onStart: () => void;
}

const STEPS = [
  {
    title: 'ミコの声を準備します',
    detail:
      '「はじめる」で、piper-plus のミコの声のモデル（38MB）と日本語の読み上げ辞書（約100MB）をブラウザに読み込みます。合計で約160MB です。',
  },
  {
    title: '準備できたら、ミコが挨拶します',
    detail: '会話も声も口の動きも、ぜんぶブラウザの中で動きます。',
  },
  {
    title: '待てないときは、ブラウザ標準の声で',
    detail:
      'Web Speech API ですぐ話せますが、口の動きは合いません。準備ができたらミコの声に切り替わります。',
  },
];

interface Tech {
  id: string;
  name: string;
  summary: string;
  code: string;
}

const TECH: Tech[] = [
  {
    id: 'core',
    name: '@aituber-onair/core',
    summary: 'LLM と会話し、返答の感情タグを取り出す',
    code: `const core = new AITuberOnAirCore({
  chatProvider: 'gemini-nano',
  chatOptions: { systemPrompt },
});
core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, ({ screenplay }) => {
  speak(screenplay.text, screenplay.emotion); // 'happy' など
});
await core.processChat('自己紹介して');`,
  },
  {
    id: 'voice',
    name: '@aituber-onair/voice',
    summary: 'Web Speech も piper-plus も同じ形で呼ぶ',
    code: `const piper = new PiperPlusEngine();
piper.setAssets({
  basePath: '/piper/',
  modelFile: 'sample-voice-v1.onnx',
  modelConfigFile: 'sample-voice-v1.onnx.json',
  voiceFile: 'mei_normal.htsvoice',
});
const wav = await piper.fetchAudio({ style: 'talk', message: 'こんにちは' }, '');`,
  },
  {
    id: 'mesh',
    name: 'mesh-avatar',
    summary: '一枚のイラストをメッシュ変形で動かす',
    code: `const avatar = await loadMeshAvatar(canvas, '/avatar/miko-qipao.mavatar');
avatar.setSpeaking(true);
avatar.setVoiceLevel(0.6); // 音量に合わせて口が動く
avatar.setEmotion('happy'); // 表情とモーション`,
  },
  {
    id: 'nano',
    name: 'Gemini Nano',
    summary: 'Chrome 内蔵の LLM。キーもサーバーも不要',
    code: `const session = await LanguageModel.create({
  expectedInputs: [{ type: 'text', languages: ['ja'] }],
});
const reply = await session.prompt('自己紹介して');`,
  },
];

/** First screen. The tap that starts the demo also unlocks audio playback. */
export function StartOverlay({ onStart }: StartOverlayProps) {
  const [active, setActive] = useState<Tech | null>(null);

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-title"
    >
      <div className="overlay-card">
        <p className="overlay-eyebrow">AITuber OnAir</p>
        <h1 id="start-title">ミコと話してみよう</h1>
        <p className="overlay-text">
          Chrome 内蔵の Gemini Nano と piper-plus
          を組み合わせると、サーバーなしでブラウザだけで完結する AITuber・AI
          キャラクターのチャット体験を提供できます。
          <br />
          このページはその実例で、会話も声も口の動きも、ぜんぶブラウザの中で動いています。
        </p>

        <ol className="steps" aria-label="声の流れ">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="step"
              style={{ animationDelay: `${0.2 + index * 0.25}s` }}
            >
              <span className="step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="step-body">
                <strong>{step.title}</strong>
                <span>{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <button type="button" className="start" onClick={onStart}>
          はじめる
        </button>

        <section className="tech" aria-label="使っている技術">
          <p className="tech-heading">
            使っている技術（触れるとコード例が出ます）
          </p>
          <ul className="tech-list" onMouseLeave={() => setActive(null)}>
            {TECH.map((tech, index) => (
              <li key={tech.id}>
                <button
                  type="button"
                  className={`tech-chip${active?.id === tech.id ? ' tech-chip-active' : ''}`}
                  style={{ animationDelay: `${1.0 + index * 0.1}s` }}
                  onMouseEnter={() => setActive(tech)}
                  onFocus={() => setActive(tech)}
                  onClick={() => setActive(tech)}
                  aria-pressed={active?.id === tech.id}
                >
                  <code>{tech.name}</code>
                  <span>{tech.summary}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="tech-code" aria-live="polite">
            {active ? (
              <pre key={active.id} className="code-pop">
                <code>{active.code}</code>
              </pre>
            ) : (
              <p className="tech-hint">
                どのパーツがどこを担当しているか、数行のコードで見られます。
              </p>
            )}
          </div>
        </section>

        <p className="overlay-note">
          音が出ます。会話はこのブラウザの中だけで処理されます。
        </p>
      </div>
    </div>
  );
}
