import { useState } from 'react';
import { RESET_VIEW_EVENT } from '../hooks/useAvatarViewGesture';
import type { MeshAvatarMotionInfo } from '../meshAvatar/createMeshAvatar.js';

export interface MeshAvatarOptions {
  autoIdle: boolean;
  autoMotion: boolean;
  swayGain: number;
}

const PREVIEW_EMOTIONS = [
  { tag: 'neutral', label: 'ふつう', hint: '表情を変えずに話す' },
  {
    tag: 'happy',
    label: '喜び',
    hint: '目を細めて頬を染め、うなずきながら話す',
  },
  { tag: 'surprised', label: '驚き', hint: '目を見開き、身を引いてから話す' },
  { tag: 'sad', label: '悲しみ', hint: '困り眉で目を伏せ、ため息をついて話す' },
  { tag: 'angry', label: '怒り', hint: '眉をつり上げ、首を振ってから話す' },
  {
    tag: 'relaxed',
    label: '安らぎ',
    hint: '目元をゆるめ、ゆらゆら揺れながら話す',
  },
] as const;

const KANA_SAMPLES = [
  { label: 'あいうえお', text: 'あ、い、う、え、お。' },
  { label: '発声練習', text: 'あえいうえおあお、かけきくけこかこ。' },
  {
    label: '自己紹介',
    text: 'はじめまして！きょうからはいしんをはじめます。よろしくおねがいします！',
  },
  {
    label: 'ゆっくり',
    text: 'あーーー、いーーー、うーーー、えーーー、おーーー。',
  },
];

const MOTION_HINTS: Record<string, string> = {
  nod: '2回うなずいて微笑む',
  tilt: '首をかしげて上目づかい',
  think: '上を見て、指で顎をとんとん',
  giggle: '目を細めてくすっと笑う',
  surprise: '身を引いて目を見開く',
  shy: '顔をそむけて頬を染める',
  no: '目を閉じて首を横に振る',
  wink: '顔を傾けてウインク',
  greet: '目を閉じておじぎ',
  lookAround: '目が先に動き、顔と体が左右を見回す',
  glance: '横をちらっと見て戻る',
  sway: '体と頭がゆったり揺れる',
  sigh: '深く吸って、長く息を吐く',
  doze: 'うとうとして、はっと起きる',
  stretch: '首を左右に倒して伸ばす',
  lean: '身を乗り出してのぞきこむ',
  hum: '鼻歌のようにリズムを取る',
  tap: '考えながら指で顎を叩く',
  readNote: '手元の原稿にちらっと目を落とす',
  waiting: '体重を移しながらそわそわ',
  spaceOut: '視線がそれてぼんやりする',
};

interface AvatarSettingsPanelProps {
  options: MeshAvatarOptions;
  onOptionsChange: (options: MeshAvatarOptions) => void;
  motions: MeshAvatarMotionInfo[];
  playingMotion: string | null;
  onPlayMotion: (id: string) => void;
  previewEmotion: string | null;
  onPreviewSpeech: (emotion: string) => void;
  onSpeakKana: (text: string) => void;
}

function ActionRow({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={`mesh-action${active ? ' is-active' : ''}`}
        aria-pressed={active}
        onClick={onClick}
      >
        <span className="mesh-action-icon" aria-hidden="true">
          {active ? '●' : '▶'}
        </span>
        <span className="mesh-action-text">
          <span className="mesh-action-label">{label}</span>
          {hint && <span className="mesh-action-hint">{hint}</span>}
        </span>
        {active && <span className="mesh-action-state">再生中</span>}
      </button>
    </li>
  );
}

export function AvatarSettingsPanel({
  options,
  onOptionsChange,
  motions,
  playingMotion,
  onPlayMotion,
  previewEmotion,
  onPreviewSpeech,
  onSpeakKana,
}: AvatarSettingsPanelProps) {
  const [kanaText, setKanaText] = useState(
    'こんにちは、きょうもいっしょにおしゃべりしようね！',
  );
  const set = (patch: Partial<MeshAvatarOptions>) =>
    onOptionsChange({ ...options, ...patch });

  const motionGroups = [
    {
      title: 'リアクション',
      help: 'クリックすると1回再生します。',
      items: motions.filter((motion) => !motion.idle),
    },
    {
      title: 'アイドルモーション',
      help: '待機中の小さな動きです。クリックで1回再生します。',
      items: motions.filter((motion) => motion.idle),
    },
  ];

  return (
    <div className="settings-panel avatar-settings-panel">
      <section className="settings-section">
        <h3>待機中の動き</h3>
        <label className="mesh-toggle">
          <input
            type="checkbox"
            checked={options.autoIdle}
            onChange={(event) => set({ autoIdle: event.target.checked })}
          />
          <span>
            <span className="mesh-action-label">
              アイドルモーションを自動で再生
            </span>
            <span className="mesh-action-hint">5〜10秒おきにランダム</span>
          </span>
        </label>
        <label className="mesh-toggle">
          <input
            type="checkbox"
            checked={options.autoMotion}
            onChange={(event) => set({ autoMotion: event.target.checked })}
          />
          <span>
            <span className="mesh-action-label">リアクションも自動で再生</span>
            <span className="mesh-action-hint">15〜25秒おきにランダム</span>
          </span>
        </label>
        <div className="mesh-slider">
          <label htmlFor="mesh-sway">
            <span className="mesh-action-label">髪・髪飾りの揺れやすさ</span>
            <output htmlFor="mesh-sway">×{options.swayGain.toFixed(2)}</output>
          </label>
          <input
            id="mesh-sway"
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={options.swayGain}
            onChange={(event) => set({ swayGain: Number(event.target.value) })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h3>表示位置と大きさ</h3>
        <p className="mesh-section-help">
          チャットの空いている所で、マウスはホイールで拡大・縮小、ドラッグで移動、ダブルクリックで元に戻します。タッチ操作では、2本指のピンチで拡大・縮小、1本指で移動します。
        </p>
        <ul className="mesh-action-list">
          <ActionRow
            label="表示位置をリセット"
            hint="大きさと位置を最初の状態に戻す"
            active={false}
            onClick={() => window.dispatchEvent(new Event(RESET_VIEW_EVENT))}
          />
        </ul>
      </section>

      <section className="settings-section">
        <h3>話し方のプレビュー</h3>
        <p className="mesh-section-help">
          APIキーやTTSの設定なしで、感情ごとの話している間の動き（口パク・うなずき・表情）を約3秒再生します。
        </p>
        <ul className="mesh-action-list">
          {PREVIEW_EMOTIONS.map((emotion) => (
            <ActionRow
              key={emotion.tag}
              label={emotion.label}
              hint={emotion.hint}
              active={previewEmotion === emotion.tag}
              onClick={() => onPreviewSpeech(emotion.tag)}
            />
          ))}
        </ul>
      </section>

      <section className="settings-section">
        <h3>口の形（あいうえお）</h3>
        <p className="mesh-section-help">
          ひらがな・カタカナを1文字ずつ母音の口の形で動かします（音声なし）。口パクの見た目の確認用です。
        </p>
        <ul className="mesh-action-list">
          {KANA_SAMPLES.map((sample) => (
            <ActionRow
              key={sample.label}
              label={sample.label}
              hint={sample.text}
              active={false}
              onClick={() => {
                setKanaText(sample.text);
                onSpeakKana(sample.text);
              }}
            />
          ))}
        </ul>
        <form
          className="mesh-kana-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSpeakKana(kanaText);
          }}
        >
          <input
            type="text"
            value={kanaText}
            onChange={(event) => setKanaText(event.target.value)}
            aria-label="話させるひらがな・カタカナ"
          />
          <button type="submit" className="mesh-kana-submit">
            話す
          </button>
        </form>
      </section>

      {motionGroups.map((group) => (
        <section className="settings-section" key={group.title}>
          <h3>
            {group.title}
            <span className="mesh-count">{group.items.length}</span>
          </h3>
          <p className="mesh-section-help">{group.help}</p>
          <ul className="mesh-action-list">
            {group.items.map((motion) => (
              <ActionRow
                key={motion.id}
                label={motion.label}
                hint={MOTION_HINTS[motion.id]}
                active={playingMotion === motion.id}
                onClick={() => onPlayMotion(motion.id)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
