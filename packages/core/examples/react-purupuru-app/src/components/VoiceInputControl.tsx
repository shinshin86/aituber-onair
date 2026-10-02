import { useEffect, useId, useRef, useState } from 'react';
import {
  type CloudVoiceInputService,
  type VoiceInputMode,
  type VoiceInputPhase,
  type VoiceInputService,
  isCloudVoiceInputService,
  voiceInputServiceLabel,
} from '../lib/voiceInput';

interface VoiceInputControlProps {
  phase: VoiceInputPhase;
  /** Continuous mode is on and waiting for the reply to finish. */
  standby: boolean;
  micDisabled: boolean;
  onMicClick: () => void;
  mode: VoiceInputMode;
  onModeChange: (mode: VoiceInputMode) => void;
  service: VoiceInputService;
  onServiceChange: (service: VoiceInputService) => void;
  apiKeys: Record<CloudVoiceInputService, string>;
  onApiKeyChange: (service: CloudVoiceInputService, key: string) => void;
}

const MODE_OPTIONS: {
  value: VoiceInputMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'once',
    label: '一回だけ',
    description: '一度話すと送信して終わります',
  },
  {
    value: 'continuous',
    label: '継続して会話',
    description: '返答が終わると、また聞きます',
  },
];

const SERVICE_OPTIONS: {
  value: VoiceInputService;
  description: string;
}[] = [
  { value: 'browser', description: 'ブラウザの音声認識を使います' },
  { value: 'openai', description: 'OpenAI の API キーを使います' },
  { value: 'gemini', description: 'Gemini の API キーを使います' },
];

export function VoiceLevelBars() {
  return (
    <span className="voice-level-bars" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function VoiceSpinner() {
  return <span className="voice-spinner" aria-hidden="true" />;
}

function MicGlyph({
  phase,
  standby,
}: {
  phase: VoiceInputPhase;
  standby: boolean;
}) {
  if (phase === 'listening') return <VoiceLevelBars />;
  if (phase === 'connecting') {
    return (
      <span className="voice-mic-connecting">
        <span className="voice-mic-emoji">🎤</span>
        <VoiceSpinner />
      </span>
    );
  }
  return <span className="voice-mic-emoji">{standby ? '⏸' : '🎤'}</span>;
}

function MenuRadio({
  checked,
  label,
  description,
  onSelect,
}: {
  checked: boolean;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className={`voice-menu-item${checked ? ' is-selected' : ''}`}
      onClick={onSelect}
    >
      <span className="voice-menu-item-text">
        <span className="voice-menu-item-label">{label}</span>
        <span className="voice-menu-item-description">{description}</span>
      </span>
      <span className="voice-menu-item-check" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
    </button>
  );
}

/**
 * Split button: the left side toggles the microphone and the chevron opens
 * the listening options above the chat form.
 */
export function VoiceInputControl({
  phase,
  standby,
  micDisabled,
  onMicClick,
  mode,
  onModeChange,
  service,
  onServiceChange,
  apiKeys,
  onApiKeyChange,
}: VoiceInputControlProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const keyInputId = useId();
  const active = phase !== 'idle' || standby;

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const micLabel = active ? '音声入力を停止' : '音声入力';
  const optionsLabel = `音声入力の設定（${voiceInputServiceLabel(service)}）`;

  return (
    <div className="voice-input-control" ref={rootRef}>
      <div className="voice-split-button" data-phase={phase}>
        <button
          type="button"
          className="voice-split-mic"
          onClick={onMicClick}
          disabled={micDisabled}
          aria-label={micLabel}
          title={micLabel}
        >
          <MicGlyph phase={phase} standby={standby} />
        </button>
        <span className="voice-split-divider" aria-hidden="true" />
        <button
          type="button"
          className={`voice-split-options${menuOpen ? ' is-open' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="音声入力の設定"
          title={optionsLabel}
        >
          <span className="voice-split-chevron" aria-hidden="true" />
        </button>
      </div>

      {menuOpen && (
        <div className="voice-menu" role="menu" aria-label="音声入力の設定">
          <div className="voice-menu-section-label">聞き取り方</div>
          {MODE_OPTIONS.map((option) => (
            <MenuRadio
              key={option.value}
              checked={mode === option.value}
              label={option.label}
              description={option.description}
              onSelect={() => onModeChange(option.value)}
            />
          ))}

          <div className="voice-menu-divider" aria-hidden="true" />

          <div className="voice-menu-section-label">使うサービス</div>
          {SERVICE_OPTIONS.map((option) => (
            <div key={option.value}>
              <MenuRadio
                checked={service === option.value}
                label={voiceInputServiceLabel(option.value)}
                description={option.description}
                onSelect={() => onServiceChange(option.value)}
              />
              {service === option.value &&
                isCloudVoiceInputService(option.value) && (
                  <div className="voice-menu-key">
                    <div className="voice-menu-key-header">
                      <label htmlFor={keyInputId}>
                        {voiceInputServiceLabel(option.value)} の API キー
                      </label>
                      {apiKeys[option.value].trim() && (
                        <span className="voice-menu-key-saved">✓ 入力済み</span>
                      )}
                    </div>
                    <input
                      id={keyInputId}
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="ここに入力"
                      value={apiKeys[option.value]}
                      onChange={(event) =>
                        onApiKeyChange(
                          option.value as CloudVoiceInputService,
                          event.target.value,
                        )
                      }
                    />
                  </div>
                )}
            </div>
          ))}
          <p className="voice-menu-note">
            OpenAI と Gemini
            は聞き取り中に料金がかかります。キーはこのブラウザに保存され、LLM
            設定のキーと共通です。
          </p>
        </div>
      )}
    </div>
  );
}
