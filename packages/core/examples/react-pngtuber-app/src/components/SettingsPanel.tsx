import { useEffect, useMemo, useState } from 'react';
import type {
  ChatProviderOption,
  TTSEngineOption,
} from '../types/settings';
import type { AvatarImageKey, AvatarImageUrls } from './AvatarPanel';
import type { useSettings } from '../hooks/useSettings';

type SettingsHook = ReturnType<typeof useSettings>;

interface SettingsPanelProps extends SettingsHook {
  isProcessing: boolean;
  backgroundImageUrl: string | null;
  avatarImageUrls: AvatarImageUrls;
  onBackgroundImageChange: (file: File | null) => void;
  onAvatarImageChange: (key: AvatarImageKey, file: File | null) => void;
}

const PROVIDERS: { value: ChatProviderOption; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI-Compatible' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'zai', label: 'Z.ai' },
];

const TTS_ENGINES: { value: TTSEngineOption; label: string }[] = [
  { value: 'openai', label: 'OpenAI TTS' },
  { value: 'voicevox', label: 'VOICEVOX' },
  { value: 'voicepeak', label: 'VOICEPEAK' },
  { value: 'aivisSpeech', label: 'AivisSpeech' },
  { value: 'aivisCloud', label: 'Aivis Cloud' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'none', label: 'None' },
];

const OPENAI_SPEAKERS = [
  'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
];

const VOICEPEAK_SPEAKERS = [
  { id: 'f1', name: '日本人女性 1' },
  { id: 'f2', name: '日本人女性 2' },
  { id: 'f3', name: '日本人女性 3' },
  { id: 'm1', name: '日本人男性 1' },
  { id: 'm2', name: '日本人男性 2' },
  { id: 'm3', name: '日本人男性 3' },
  { id: 'c', name: '女の子' },
];

const AIVIS_CLOUD_PRESETS = [
  {
    id: 'kohaku',
    label: 'コハク',
    modelUuid: '22e8ed77-94fe-4ef2-871f-a86f94e9a579',
    speakerUuid: '',
    styleId: '',
  },
  {
    id: 'mao',
    label: 'まお',
    modelUuid: 'a59cb814-0083-4369-8542-f51a29e72af7',
    speakerUuid: '',
    styleId: '',
  },
] as const;

interface VoiceSpeaker {
  name: string;
  speaker_uuid: string;
  styles: { name: string; id: number }[];
}

interface MinimaxVoice {
  voice_id: string;
  voice_name: string;
}

type SectionKey = 'llm' | 'tts' | 'visual';

const AVATAR_IMAGE_FIELDS: { key: AvatarImageKey; label: string }[] = [
  { key: 'mouth_close_eyes_open', label: '口閉じ / 目開き' },
  { key: 'mouth_close_eyes_close', label: '口閉じ / 目閉じ' },
  { key: 'mouth_open_eyes_open', label: '口開き / 目開き' },
  { key: 'mouth_open_eyes_close', label: '口開き / 目閉じ' },
];

export function SettingsPanel({
  settings,
  availableModels,
  updateLLMProvider,
  updateLLMModel,
  updateLLMApiKey,
  updateLLMEndpoint,
  refreshOpenRouterDynamicFreeModels,
  isRefreshingOpenRouterFreeModels,
  openRouterRefreshError,
  updateOpenRouterMaxCandidates,
  updateTTSEngine,
  updateTTSSpeaker,
  updateVoicevoxApiUrl,
  updateVoicepeakApiUrl,
  updateAivisSpeechApiUrl,
  updateAivisCloudApiKey,
  updateAivisCloudModelUuid,
  updateAivisCloudSpeakerUuid,
  updateAivisCloudStyleId,
  updateMinimaxApiKey,
  updateMinimaxGroupId,
  getApiKeyForProvider,
  isProcessing,
  backgroundImageUrl,
  avatarImageUrls,
  onBackgroundImageChange,
  onAvatarImageChange,
}: SettingsPanelProps) {
  const disabled = isProcessing;
  const openRouterApiKey = getApiKeyForProvider('openrouter').trim();
  const openRouterDynamicFreeModels =
    settings.llm.openRouterDynamicFreeModels?.models || [];
  const openRouterFetchedAt =
    settings.llm.openRouterDynamicFreeModels?.fetchedAt || 0;
  const openRouterMaxCandidates =
    settings.llm.openRouterDynamicFreeModels?.maxCandidates || 1;

  const [voicevoxSpeakers, setVoicevoxSpeakers] = useState<VoiceSpeaker[]>([]);
  const [aivisSpeakers, setAivisSpeakers] = useState<VoiceSpeaker[]>([]);
  const [minimaxVoices, setMinimaxVoices] = useState<MinimaxVoice[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [isFetchingMinimaxVoices, setIsFetchingMinimaxVoices] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    llm: true,
    tts: true,
    visual: true,
  });

  const selectedAivisCloudPresetId = useMemo(() => {
    const matched = AIVIS_CLOUD_PRESETS.find((preset) =>
      preset.modelUuid === (settings.tts.aivisCloudModelUuid || '')
      && preset.speakerUuid === (settings.tts.aivisCloudSpeakerUuid || '')
      && preset.styleId === (settings.tts.aivisCloudStyleId || ''),
    );
    return matched?.id || AIVIS_CLOUD_PRESETS[0].id;
  }, [
    settings.tts.aivisCloudModelUuid,
    settings.tts.aivisCloudSpeakerUuid,
    settings.tts.aivisCloudStyleId,
  ]);

  // Fetch speaker list for VOICEVOX / AivisSpeech
  useEffect(() => {
    if (settings.tts.engine !== 'voicevox' && settings.tts.engine !== 'aivisSpeech') {
      return;
    }

    const controller = new AbortController();

    const fetchSpeakers = async () => {
      const isVoicevox = settings.tts.engine === 'voicevox';
      const baseUrl = isVoicevox
        ? settings.tts.voicevoxApiUrl || 'http://localhost:50021'
        : settings.tts.aivisSpeechApiUrl || 'http://localhost:10101';

      try {
        const response = await fetch(`${baseUrl}/speakers`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const speakers = (await response.json()) as VoiceSpeaker[];
        if (controller.signal.aborted) return;

        if (isVoicevox) {
          setVoicevoxSpeakers(speakers);
        } else {
          setAivisSpeakers(speakers);
        }
        setFetchError('');

        if (!settings.tts.speaker && speakers.length > 0) {
          const firstId = speakers[0]?.styles?.[0]?.id;
          if (firstId != null) updateTTSSpeaker(String(firstId));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        if (isVoicevox) {
          setVoicevoxSpeakers([]);
          setFetchError(`VOICEVOX接続エラー: ${message}`);
        } else {
          setAivisSpeakers([]);
          setFetchError(`AivisSpeech接続エラー: ${message}`);
        }
      }
    };

    void fetchSpeakers();

    return () => {
      controller.abort();
    };
  }, [
    settings.tts.engine,
    settings.tts.voicevoxApiUrl,
    settings.tts.aivisSpeechApiUrl,
    settings.tts.speaker,
    updateTTSSpeaker,
  ]);

  // Fetch MiniMax speaker list after API key is entered
  useEffect(() => {
    if (settings.tts.engine !== 'minimax') {
      return;
    }

    const apiKey = settings.tts.minimaxApiKey?.trim();
    if (!apiKey) {
      setMinimaxVoices([]);
      return;
    }

    const controller = new AbortController();

    const fetchMinimaxVoices = async () => {
      setIsFetchingMinimaxVoices(true);
      try {
        const response = await fetch('https://api.minimax.io/v1/query/tts_speakers', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          base_resp?: { status_code?: number; status_msg?: string };
          data?: { speakers?: MinimaxVoice[] };
        };
        if (controller.signal.aborted) return;

        if (payload.base_resp && payload.base_resp.status_code !== 0) {
          throw new Error(payload.base_resp.status_msg || 'MiniMax API error');
        }

        const voices = payload.data?.speakers || [];
        setMinimaxVoices(voices);
        setFetchError('');

        if (voices.length > 0 && !voices.some((voice) => voice.voice_id === settings.tts.speaker)) {
          updateTTSSpeaker(voices[0].voice_id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setMinimaxVoices([]);
        setFetchError(`MiniMax接続エラー: ${message}`);
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingMinimaxVoices(false);
        }
      }
    };

    void fetchMinimaxVoices();

    return () => {
      controller.abort();
    };
  }, [settings.tts.engine, settings.tts.minimaxApiKey, settings.tts.speaker, updateTTSSpeaker]);

  const handleAivisCloudPresetChange = (presetId: string) => {
    const preset = AIVIS_CLOUD_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    updateAivisCloudModelUuid(preset.modelUuid);
    updateAivisCloudSpeakerUuid(preset.speakerUuid);
    updateAivisCloudStyleId(preset.styleId);
    updateTTSSpeaker(preset.modelUuid);
  };

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="settings-panel">
      {/* LLM Section */}
      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('llm')}
          aria-expanded={expandedSections.llm}
        >
          <h3>LLM</h3>
          <span className={`settings-section-chevron${expandedSections.llm ? ' is-open' : ''}`}>
            ⌄
          </span>
        </button>

        {expandedSections.llm && (
          <>
            <div className="settings-field">
              <label htmlFor="llm-provider">Provider</label>
              <select
                id="llm-provider"
                value={settings.llm.provider}
                onChange={(e) => updateLLMProvider(e.target.value as ChatProviderOption)}
                disabled={disabled}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="llm-model">Model</label>
              {settings.llm.provider === 'openai-compatible' ? (
                <input
                  id="llm-model"
                  type="text"
                  value={settings.llm.model}
                  onChange={(e) => updateLLMModel(e.target.value)}
                  placeholder="local-model"
                  disabled={disabled}
                />
              ) : (
                <select
                  id="llm-model"
                  value={settings.llm.model}
                  onChange={(e) => updateLLMModel(e.target.value)}
                  disabled={disabled}
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            {settings.llm.provider === 'openrouter' && (
              <div className="settings-field">
                <label htmlFor="llm-apikey">
                  API Key ({settings.llm.provider})
                </label>
                <input
                  id="llm-apikey"
                  type="password"
                  value={getApiKeyForProvider(settings.llm.provider)}
                  onChange={(e) =>
                    updateLLMApiKey(settings.llm.provider, e.target.value)}
                  placeholder="XXX-..."
                  disabled={disabled}
                />
              </div>
            )}

            {settings.llm.provider === 'openrouter' && (
              <>
                <div className="settings-field">
                  <label htmlFor="openrouter-max-candidates">
                    Max candidates
                  </label>
                  <input
                    id="openrouter-max-candidates"
                    type="number"
                    min={1}
                    value={openRouterMaxCandidates}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      updateOpenRouterMaxCandidates(
                        Number.isFinite(parsed) ? parsed : 1,
                      );
                    }}
                    disabled={disabled || isRefreshingOpenRouterFreeModels}
                  />
                </div>
                <div className="settings-field">
                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={() => {
                      void refreshOpenRouterDynamicFreeModels();
                    }}
                    disabled={
                      disabled
                      || isRefreshingOpenRouterFreeModels
                      || !openRouterApiKey
                    }
                  >
                    {isRefreshingOpenRouterFreeModels
                      ? 'Fetching...'
                      : 'Fetch free models'}
                  </button>
                  {!openRouterApiKey && (
                    <p className="settings-field-hint">
                      Set OpenRouter API key to fetch free models.
                    </p>
                  )}
                  {openRouterRefreshError && (
                    <p className="settings-field-error">
                      {openRouterRefreshError}
                    </p>
                  )}
                  <p className="settings-field-hint">
                    Dynamic free models: {openRouterDynamicFreeModels.length}
                  </p>
                  {openRouterFetchedAt > 0 && (
                    <p className="settings-field-hint">
                      Last fetched: {new Date(openRouterFetchedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {settings.llm.provider === 'openai-compatible' && (
              <div className="settings-field">
                <label htmlFor="llm-endpoint">Endpoint URL</label>
                <input
                  id="llm-endpoint"
                  type="text"
                  value={settings.llm.endpoint || ''}
                  onChange={(e) => updateLLMEndpoint(e.target.value)}
                  placeholder="http://localhost:11434/v1/chat/completions"
                  disabled={disabled}
                />
              </div>
            )}

            {settings.llm.provider !== 'openrouter' && (
              <div className="settings-field">
                <label htmlFor="llm-apikey">
                  API Key ({settings.llm.provider})
                  {settings.llm.provider === 'openai-compatible'
                    ? ' - optional'
                    : ''}
                </label>
                <input
                  id="llm-apikey"
                  type="password"
                  value={getApiKeyForProvider(settings.llm.provider)}
                  onChange={(e) =>
                    updateLLMApiKey(settings.llm.provider, e.target.value)}
                  placeholder={
                    settings.llm.provider === 'openai-compatible'
                      ? 'optional'
                      : 'XXX-...'
                  }
                  disabled={disabled}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* TTS Section */}
      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('tts')}
          aria-expanded={expandedSections.tts}
        >
          <h3>TTS</h3>
          <span className={`settings-section-chevron${expandedSections.tts ? ' is-open' : ''}`}>
            ⌄
          </span>
        </button>

        {expandedSections.tts && (
          <>
            <div className="settings-field">
              <label htmlFor="tts-engine">Engine</label>
              <select
                id="tts-engine"
                value={settings.tts.engine}
                onChange={(e) => updateTTSEngine(e.target.value as TTSEngineOption)}
                disabled={disabled}
              >
                {TTS_ENGINES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {settings.tts.engine === 'openai' && (
              <div className="settings-field">
                <label htmlFor="tts-speaker">Speaker</label>
                <select
                  id="tts-speaker"
                  value={settings.tts.speaker}
                  onChange={(e) => updateTTSSpeaker(e.target.value)}
                  disabled={disabled}
                >
                  {OPENAI_SPEAKERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {settings.tts.engine === 'voicevox' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-voicevox-speaker">Speaker</label>
                  <select
                    id="tts-voicevox-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {voicevoxSpeakers.length > 0
                      ? voicevoxSpeakers.flatMap((sp) =>
                          (sp.styles || []).map((style) => (
                            <option key={`${sp.speaker_uuid}-${style.id}`} value={String(style.id)}>
                              {sp.name} - {style.name}
                            </option>
                          )),
                        )
                      : <option value="">サーバーから取得中...</option>
                    }
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-voicevox-url">API URL</label>
                  <input
                    id="tts-voicevox-url"
                    type="text"
                    value={settings.tts.voicevoxApiUrl || ''}
                    onChange={(e) => updateVoicevoxApiUrl(e.target.value)}
                    placeholder="http://localhost:50021"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'voicepeak' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-voicepeak-speaker">Speaker</label>
                  <select
                    id="tts-voicepeak-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {VOICEPEAK_SPEAKERS.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-voicepeak-url">API URL</label>
                  <input
                    id="tts-voicepeak-url"
                    type="text"
                    value={settings.tts.voicepeakApiUrl || ''}
                    onChange={(e) => updateVoicepeakApiUrl(e.target.value)}
                    placeholder="http://localhost:20202"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'aivisSpeech' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-aivis-speaker">Speaker</label>
                  <select
                    id="tts-aivis-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled}
                  >
                    {aivisSpeakers.length > 0
                      ? aivisSpeakers.flatMap((sp) =>
                          (sp.styles || []).map((style) => (
                            <option key={`${sp.speaker_uuid}-${style.id}`} value={String(style.id)}>
                              {sp.name} - {style.name}
                            </option>
                          )),
                        )
                      : <option value="">サーバーから取得中...</option>
                    }
                  </select>
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-aivis-url">API URL</label>
                  <input
                    id="tts-aivis-url"
                    type="text"
                    value={settings.tts.aivisSpeechApiUrl || ''}
                    onChange={(e) => updateAivisSpeechApiUrl(e.target.value)}
                    placeholder="http://localhost:10101"
                    disabled={disabled}
                  />
                </div>
              </>
            )}

            {settings.tts.engine === 'minimax' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-apikey">API Key</label>
                  <input
                    id="tts-minimax-apikey"
                    type="password"
                    value={settings.tts.minimaxApiKey || ''}
                    onChange={(e) => updateMinimaxApiKey(e.target.value)}
                    placeholder="MiniMax API Key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-groupid">Group ID</label>
                  <input
                    id="tts-minimax-groupid"
                    type="text"
                    value={settings.tts.minimaxGroupId || ''}
                    onChange={(e) => updateMinimaxGroupId(e.target.value)}
                    placeholder="MiniMax Group ID"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-minimax-speaker">Speaker (Endpoint: global 固定)</label>
                  <select
                    id="tts-minimax-speaker"
                    value={settings.tts.speaker}
                    onChange={(e) => updateTTSSpeaker(e.target.value)}
                    disabled={disabled || !settings.tts.minimaxApiKey || minimaxVoices.length === 0}
                  >
                    {!settings.tts.minimaxApiKey && (
                      <option value="">APIキーを入力すると一覧を取得します</option>
                    )}
                    {settings.tts.minimaxApiKey && isFetchingMinimaxVoices && (
                      <option value="">スピーカー一覧を取得中...</option>
                    )}
                    {settings.tts.minimaxApiKey && !isFetchingMinimaxVoices && minimaxVoices.length === 0 && (
                      <option value="">一覧を取得できませんでした</option>
                    )}
                    {minimaxVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.voice_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {settings.tts.engine === 'aivisCloud' && (
              <>
                <div className="settings-field">
                  <label htmlFor="tts-aiviscloud-apikey">API Key</label>
                  <input
                    id="tts-aiviscloud-apikey"
                    type="password"
                    value={settings.tts.aivisCloudApiKey || ''}
                    onChange={(e) => updateAivisCloudApiKey(e.target.value)}
                    placeholder="Aivis Cloud API Key"
                    disabled={disabled}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="tts-aiviscloud-preset">Voice</label>
                  <select
                    id="tts-aiviscloud-preset"
                    value={selectedAivisCloudPresetId}
                    onChange={(e) => handleAivisCloudPresetChange(e.target.value)}
                    disabled={disabled}
                  >
                    {AIVIS_CLOUD_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {fetchError && (
              settings.tts.engine === 'voicevox'
              || settings.tts.engine === 'aivisSpeech'
              || settings.tts.engine === 'minimax'
            ) && (
              <div style={{ color: '#e94560', fontSize: '0.75rem', marginTop: 4 }}>
                {fetchError}
              </div>
            )}
          </>
        )}
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => toggleSection('visual')}
          aria-expanded={expandedSections.visual}
        >
          <h3>Visual</h3>
          <span className={`settings-section-chevron${expandedSections.visual ? ' is-open' : ''}`}>
            ⌄
          </span>
        </button>

        {expandedSections.visual && (
          <>
            <div className="settings-field">
              <label htmlFor="background-image">背景画像</label>
              <div className="settings-file-picker-row">
                <input
                  id="background-image"
                  className="settings-file-input-hidden"
                  type="file"
                  accept="image/*"
                  disabled={disabled}
                  onChange={(e) => {
                    onBackgroundImageChange(e.target.files?.[0] ?? null);
                    e.currentTarget.value = '';
                  }}
                />
                <label
                  htmlFor="background-image"
                  className={`settings-file-trigger${disabled ? ' is-disabled' : ''}`}
                >
                  画像を選択
                </label>
                <span className="settings-file-hint">PNG / JPG</span>
              </div>
              <div className="settings-file-actions">
                <span className="settings-file-status">
                  {backgroundImageUrl ? '設定済み' : '未設定'}
                </span>
                {backgroundImageUrl && (
                  <button
                    type="button"
                    className="settings-clear-button"
                    onClick={() => onBackgroundImageChange(null)}
                    disabled={disabled}
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {AVATAR_IMAGE_FIELDS.map((field) => (
              <div className="settings-field" key={field.key}>
                <label htmlFor={`avatar-image-${field.key}`}>{field.label}</label>
                <div className="settings-file-picker-row">
                  <input
                    id={`avatar-image-${field.key}`}
                    className="settings-file-input-hidden"
                    type="file"
                    accept="image/*"
                    disabled={disabled}
                    onChange={(e) => {
                      onAvatarImageChange(field.key, e.target.files?.[0] ?? null);
                      e.currentTarget.value = '';
                    }}
                  />
                  <label
                    htmlFor={`avatar-image-${field.key}`}
                    className={`settings-file-trigger${disabled ? ' is-disabled' : ''}`}
                  >
                    画像を選択
                  </label>
                  <span className="settings-file-hint">PNG / JPG</span>
                </div>
                <div className="settings-file-actions">
                  <span className="settings-file-status">
                    {avatarImageUrls[field.key] ? '設定済み' : '未設定'}
                  </span>
                  {avatarImageUrls[field.key] && (
                    <button
                      type="button"
                      className="settings-clear-button"
                      onClick={() => onAvatarImageChange(field.key, null)}
                      disabled={disabled}
                    >
                      クリア
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
