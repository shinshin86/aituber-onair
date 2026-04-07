import type {
  MinimaxAudioFormat,
  MinimaxModel,
  XaiBitRate,
  XaiCodec,
  XaiSampleRate,
} from '@aituber-onair/voice';
import {
  MINIMAX_MODELS,
  SLIDER_CONFIG,
  type AivisCloudBooleanOption,
  type AivisCloudOutputChannelOption,
  type AivisCloudOutputFormatOption,
  type AivisCloudOutputSamplingRateOption,
  type DefaultBooleanOption,
  type EngineType,
  type LocalOutputSamplingRateOption,
  type OutputStereoOption,
  type VoicePeakEmotionOption,
} from '../constants';
import { CollapsibleCard } from './CollapsibleCard';
import { NumberSliderField } from './NumberSliderField';

interface StringField {
  value: string;
  onChange: (nextValue: string) => void;
}

interface SelectField<T extends string> {
  value: T;
  onChange: (nextValue: T) => void;
}

interface EngineParametersProps {
  engine: EngineType;
  openai: {
    speed: StringField;
  };
  xai: {
    language: StringField;
    codec: SelectField<XaiCodec>;
    sampleRate: SelectField<`${XaiSampleRate}`>;
    bitRate: SelectField<`${XaiBitRate}`>;
  };
  geminiTts: {
    model: SelectField<string>;
    languageCode: StringField;
    prompt: StringField;
    models: Record<string, string>;
  };
  openaiCompatible: {
    model: StringField;
    speed: StringField;
  };
  voicevox: {
    speedScale: StringField;
    pitchScale: StringField;
    intonationScale: StringField;
    volumeScale: StringField;
    prePhonemeLength: StringField;
    postPhonemeLength: StringField;
    pauseLength: StringField;
    pauseLengthScale: StringField;
    outputSamplingRate: SelectField<LocalOutputSamplingRateOption>;
    outputStereo: SelectField<OutputStereoOption>;
    enableKatakanaEnglish: SelectField<DefaultBooleanOption>;
    enableInterrogativeUpspeak: SelectField<DefaultBooleanOption>;
    coreVersion: StringField;
  };
  voicepeak: {
    emotion: SelectField<VoicePeakEmotionOption>;
    speed: StringField;
    pitch: StringField;
  };
  aivisCloud: {
    modelUuid: StringField;
    speakerUuid: StringField;
    styleId: StringField;
    styleName: StringField;
    useSsml: SelectField<AivisCloudBooleanOption>;
    language: StringField;
    speakingRate: StringField;
    emotionalIntensity: StringField;
    tempoDynamics: StringField;
    pitch: StringField;
    volume: StringField;
    leadingSilence: StringField;
    trailingSilence: StringField;
    lineBreakSilence: StringField;
    outputFormat: SelectField<AivisCloudOutputFormatOption>;
    outputBitrate: StringField;
    outputSamplingRate: SelectField<AivisCloudOutputSamplingRateOption>;
    outputChannels: SelectField<AivisCloudOutputChannelOption>;
    userDictionaryUuid: StringField;
    enableBillingLogs: SelectField<AivisCloudBooleanOption>;
  };
  aivisSpeech: {
    speedScale: StringField;
    pitchScale: StringField;
    intonationScale: StringField;
    tempoDynamicsScale: StringField;
    volumeScale: StringField;
    prePhonemeLength: StringField;
    postPhonemeLength: StringField;
    pauseLength: StringField;
    pauseLengthScale: StringField;
    outputSamplingRate: SelectField<LocalOutputSamplingRateOption>;
    outputStereo: SelectField<OutputStereoOption>;
  };
  minimax: {
    model: SelectField<MinimaxModel>;
    languageBoost: StringField;
    speed: StringField;
    volume: StringField;
    pitch: StringField;
    sampleRate: StringField;
    bitrate: StringField;
    audioFormat: SelectField<MinimaxAudioFormat>;
    audioChannel: SelectField<'1' | '2'>;
  };
  piperPlus: {
    speed: StringField;
    noiseScale: StringField;
  };
}

export function EngineParameters({
  engine,
  openai,
  xai,
  geminiTts,
  openaiCompatible,
  voicevox,
  voicepeak,
  aivisCloud,
  aivisSpeech,
  minimax,
  piperPlus,
}: EngineParametersProps) {
  return (
    <>
      {engine === 'openai' && (
        <CollapsibleCard
          className="parameter-card openai-card"
          title="OpenAI TTS パラメータ"
          description="現在のOpenAI TTSでは音声速度のみ数値指定が可能です。未入力の場合は既定値 1.0 が使用されます。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">話速</div>
            <NumberSliderField
              id="openaiSpeed"
              label="Speed (0.25 - 4.0)"
              value={openai.speed.value}
              onChange={openai.speed.onChange}
              config={SLIDER_CONFIG.openaiSpeed}
              placeholder="例: 1.25（標準は 1.0）"
            />
          </div>

          <p className="parameter-card__note">
            モデルや声色は `speaker` の指定で切り替えられます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'xai' && (
        <CollapsibleCard
          className="parameter-card openai-card"
          title="xAI TTS パラメータ"
          description="xAI の `/v1/tts` エンドポイント向け設定です。voice は上部の Speaker で選択し、ここでは言語と出力形式を調整できます。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">言語</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="xaiLanguage">Language</label>
                <input
                  id="xaiLanguage"
                  type="text"
                  value={xai.language.value}
                  onChange={(e) => xai.language.onChange(e.target.value)}
                  placeholder="例: auto, ja, en"
                />
              </div>
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">出力フォーマット</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="xaiCodec">Codec</label>
                <select
                  id="xaiCodec"
                  value={xai.codec.value}
                  onChange={(e) =>
                    xai.codec.onChange(e.target.value as XaiCodec)
                  }
                >
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="pcm">PCM</option>
                  <option value="mulaw">Mu-law</option>
                  <option value="alaw">A-law</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="xaiSampleRate">Sample Rate</label>
                <select
                  id="xaiSampleRate"
                  value={xai.sampleRate.value}
                  onChange={(e) =>
                    xai.sampleRate.onChange(
                      e.target.value as `${XaiSampleRate}`,
                    )
                  }
                >
                  <option value="8000">8,000 Hz</option>
                  <option value="16000">16,000 Hz</option>
                  <option value="22050">22,050 Hz</option>
                  <option value="24000">24,000 Hz</option>
                  <option value="44100">44,100 Hz</option>
                  <option value="48000">48,000 Hz</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="xaiBitRate">MP3 Bit Rate</label>
                <select
                  id="xaiBitRate"
                  value={xai.bitRate.value}
                  onChange={(e) =>
                    xai.bitRate.onChange(e.target.value as `${XaiBitRate}`)
                  }
                  disabled={xai.codec.value !== 'mp3'}
                >
                  <option value="32000">32 kbps</option>
                  <option value="64000">64 kbps</option>
                  <option value="96000">96 kbps</option>
                  <option value="128000">128 kbps</option>
                  <option value="192000">192 kbps</option>
                </select>
              </div>
            </div>
          </div>

          <p className="parameter-card__note">
            `bit_rate` は MP3 出力時のみ送信されます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'geminiTts' && (
        <>
          <div className="form-group">
            <label htmlFor="geminiTtsModel">Model:</label>
            <select
              id="geminiTtsModel"
              value={geminiTts.model.value}
              onChange={(e) => geminiTts.model.onChange(e.target.value)}
            >
              {Object.entries(geminiTts.models).map(([modelId, desc]) => (
                <option key={modelId} value={modelId}>
                  {modelId} — {desc}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="geminiTtsLanguageCode">Language Code:</label>
            <input
              id="geminiTtsLanguageCode"
              type="text"
              value={geminiTts.languageCode.value}
              onChange={(e) => geminiTts.languageCode.onChange(e.target.value)}
              placeholder="ja-JP"
            />
          </div>
          <div className="form-group">
            <label htmlFor="geminiTtsPrompt">Style Prompt (optional):</label>
            <input
              id="geminiTtsPrompt"
              type="text"
              value={geminiTts.prompt.value}
              onChange={(e) => geminiTts.prompt.onChange(e.target.value)}
              placeholder="Speak in a cheerful tone"
            />
          </div>
        </>
      )}

      {engine === 'openaiCompatible' && (
        <CollapsibleCard
          className="parameter-card openai-card"
          title="OpenAI互換 TTS パラメータ"
          description="`/v1/audio/speech` 互換のセルフホスト / ローカルTTSエンドポイント向けです。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">モデル・話速</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="openaiCompatibleModel">Model</label>
                <input
                  id="openaiCompatibleModel"
                  type="text"
                  value={openaiCompatible.model.value}
                  onChange={(e) =>
                    openaiCompatible.model.onChange(e.target.value)
                  }
                  placeholder="例: your-model-id"
                />
              </div>
              <NumberSliderField
                id="openaiCompatibleSpeed"
                label="Speed (0.25 - 4.0)"
                value={openaiCompatible.speed.value}
                onChange={openaiCompatible.speed.onChange}
                config={SLIDER_CONFIG.openaiSpeed}
                placeholder="例: 1.10（標準は 1.0）"
              />
            </div>
          </div>

          <p className="parameter-card__note">
            Speaker を空欄にすると `voice` は送信されません。API URL の既定値は
            `http://localhost:8880/v1/audio/speech` です。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'voicevox' && (
        <CollapsibleCard
          className="parameter-card voicevox-card"
          title="VOICEVOX パラメータ"
          description="テキストから生成される音声の質感を細かく調整できます。未入力のフィールドは API の既定値のまま使用されます。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">話速・ピッチ</div>
            <div className="parameter-grid">
              <NumberSliderField
                id="voicevoxSpeedScale"
                label="Speed Scale"
                value={voicevox.speedScale.value}
                onChange={voicevox.speedScale.onChange}
                config={SLIDER_CONFIG.voicevoxSpeedScale}
                placeholder="例: 1.10（標準は 1.0）"
              />
              <NumberSliderField
                id="voicevoxPitchScale"
                label="Pitch Scale"
                value={voicevox.pitchScale.value}
                onChange={voicevox.pitchScale.onChange}
                config={SLIDER_CONFIG.voicevoxPitchScale}
                placeholder="例: 0.15（標準は 0.0）"
              />
              <NumberSliderField
                id="voicevoxIntonationScale"
                label="Intonation Scale"
                value={voicevox.intonationScale.value}
                onChange={voicevox.intonationScale.onChange}
                config={SLIDER_CONFIG.voicevoxIntonationScale}
                placeholder="例: 1.20（標準は 1.0）"
              />
              <NumberSliderField
                id="voicevoxVolumeScale"
                label="Volume Scale"
                value={voicevox.volumeScale.value}
                onChange={voicevox.volumeScale.onChange}
                config={SLIDER_CONFIG.voicevoxVolumeScale}
                placeholder="例: 0.95（標準は 1.0）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">無音コントロール</div>
            <div className="parameter-grid">
              <NumberSliderField
                id="voicevoxPrePhonemeLength"
                label="Pre-phoneme Length (sec)"
                value={voicevox.prePhonemeLength.value}
                onChange={voicevox.prePhonemeLength.onChange}
                config={SLIDER_CONFIG.voicevoxPrePhonemeLength}
                placeholder="例: 0.12"
              />
              <NumberSliderField
                id="voicevoxPostPhonemeLength"
                label="Post-phoneme Length (sec)"
                value={voicevox.postPhonemeLength.value}
                onChange={voicevox.postPhonemeLength.onChange}
                config={SLIDER_CONFIG.voicevoxPostPhonemeLength}
                placeholder="例: 0.08"
              />
              <NumberSliderField
                id="voicevoxPauseLength"
                label="Pause Length (sec)"
                value={voicevox.pauseLength.value}
                onChange={voicevox.pauseLength.onChange}
                config={SLIDER_CONFIG.voicevoxPauseLength}
                placeholder="例: 0.5（空欄で自動）"
              />
              <NumberSliderField
                id="voicevoxPauseLengthScale"
                label="Pause Length Scale"
                value={voicevox.pauseLengthScale.value}
                onChange={voicevox.pauseLengthScale.onChange}
                config={SLIDER_CONFIG.voicevoxPauseLengthScale}
                placeholder="例: 1.1（標準は 1.0）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">出力フォーマット</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="voicevoxOutputSamplingRate">
                  Output Sampling Rate
                </label>
                <select
                  id="voicevoxOutputSamplingRate"
                  value={voicevox.outputSamplingRate.value}
                  onChange={(e) =>
                    voicevox.outputSamplingRate.onChange(
                      e.target.value as LocalOutputSamplingRateOption,
                    )
                  }
                >
                  <option value="default">API既定値を使用</option>
                  <option value="8000">8,000 Hz</option>
                  <option value="11025">11,025 Hz</option>
                  <option value="16000">16,000 Hz</option>
                  <option value="22050">22,050 Hz</option>
                  <option value="24000">24,000 Hz</option>
                  <option value="44100">44,100 Hz</option>
                  <option value="48000">48,000 Hz</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="voicevoxOutputStereo">Output Stereo</label>
                <select
                  id="voicevoxOutputStereo"
                  value={voicevox.outputStereo.value}
                  onChange={(e) =>
                    voicevox.outputStereo.onChange(
                      e.target.value as OutputStereoOption,
                    )
                  }
                >
                  <option value="default">API既定値を使用</option>
                  <option value="mono">モノラル（false）</option>
                  <option value="stereo">ステレオ（true）</option>
                </select>
              </div>
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">クエリオプション</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="voicevoxEnableKatakanaEnglish">
                  Katakana English
                </label>
                <select
                  id="voicevoxEnableKatakanaEnglish"
                  value={voicevox.enableKatakanaEnglish.value}
                  onChange={(e) =>
                    voicevox.enableKatakanaEnglish.onChange(
                      e.target.value as DefaultBooleanOption,
                    )
                  }
                >
                  <option value="default">API既定値（true）</option>
                  <option value="true">有効</option>
                  <option value="false">無効</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="voicevoxEnableInterrogativeUpspeak">
                  Interrogative Upspeak
                </label>
                <select
                  id="voicevoxEnableInterrogativeUpspeak"
                  value={voicevox.enableInterrogativeUpspeak.value}
                  onChange={(e) =>
                    voicevox.enableInterrogativeUpspeak.onChange(
                      e.target.value as DefaultBooleanOption,
                    )
                  }
                >
                  <option value="default">API既定値（true）</option>
                  <option value="true">有効</option>
                  <option value="false">無効</option>
                </select>
              </div>
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">その他</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label htmlFor="voicevoxCoreVersion">Core Version</label>
                <input
                  id="voicevoxCoreVersion"
                  type="text"
                  value={voicevox.coreVersion.value}
                  onChange={(e) =>
                    voicevox.coreVersion.onChange(e.target.value)
                  }
                  placeholder="例: 0.15.0（任意指定）"
                />
              </div>
            </div>
          </div>

          <p className="parameter-card__note">
            サンプリングレートは 8,000 / 11,025 / 16,000 / 22,050 / 24,000 /
            44,100 / 48,000 Hz
            をサポート。未入力の場合はエンジンの既定値が適用されます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'voicepeak' && (
        <CollapsibleCard
          className="parameter-card voicepeak-card"
          title="VOICEPEAK パラメータ"
          description="vpeakserver を利用してローカルの VOICEPEAK と連携します。未指定の項目は サーバー側の推奨値が適用されます。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">感情・ピッチ</div>
            <div className="parameter-grid">
              <div className="form-group">
                <label htmlFor="voicepeakEmotion">Emotion Override</label>
                <select
                  id="voicepeakEmotion"
                  value={voicepeak.emotion.value}
                  onChange={(e) =>
                    voicepeak.emotion.onChange(
                      e.target.value as VoicePeakEmotionOption,
                    )
                  }
                >
                  <option value="neutral">neutral</option>
                  <option value="happy">happy</option>
                  <option value="fun">fun</option>
                  <option value="angry">angry</option>
                  <option value="sad">sad</option>
                  <option value="surprised">surprised</option>
                </select>
              </div>
              <NumberSliderField
                id="voicepeakSpeed"
                label="Speed (50-200)"
                value={voicepeak.speed.value}
                onChange={voicepeak.speed.onChange}
                config={SLIDER_CONFIG.voicepeakSpeed}
                placeholder="整数のみ（未入力で既定値）"
              />
              <NumberSliderField
                id="voicepeakPitch"
                label="Pitch (-300〜300)"
                value={voicepeak.pitch.value}
                onChange={voicepeak.pitch.onChange}
                config={SLIDER_CONFIG.voicepeakPitch}
                placeholder="整数のみ（未入力で既定値）"
              />
            </div>
          </div>

          <p className="parameter-card__note">
            Emotion で選んだ値がそのまま vpeakserver に送信されます （初期値は
            neutral）。Speed と Pitch を空欄にすると vpeakserver
            の初期値が利用されます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'aivisCloud' && (
        <CollapsibleCard
          className="parameter-card aiviscloud-card"
          title="Aivis Cloud パラメータ"
          description="クラウド版 Aivis のモデル・話者・出力条件を細かく指定できます。空欄や「API既定値」はサービス側のデフォルト設定が利用されます。"
        >
          <div className="parameter-grid parameter-grid--two parameter-card__grid">
            <div className="form-group">
              <label htmlFor="aivisCloudModelUuid">Model UUID (override)</label>
              <input
                id="aivisCloudModelUuid"
                type="text"
                value={aivisCloud.modelUuid.value}
                onChange={(e) => aivisCloud.modelUuid.onChange(e.target.value)}
                placeholder="空欄なら選択中のモデルを使用"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">話者・スタイル</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="aivisCloudSpeakerUuid">Speaker UUID</label>
                <input
                  id="aivisCloudSpeakerUuid"
                  type="text"
                  value={aivisCloud.speakerUuid.value}
                  onChange={(e) =>
                    aivisCloud.speakerUuid.onChange(e.target.value)
                  }
                  placeholder="複数話者モデルで指定 (任意)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudStyleId">Style ID (0-31)</label>
                <input
                  id="aivisCloudStyleId"
                  type="number"
                  min="0"
                  max="31"
                  step="1"
                  value={aivisCloud.styleId.value}
                  onChange={(e) => aivisCloud.styleId.onChange(e.target.value)}
                  placeholder="スタイルIDを使用する場合"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudStyleName">Style Name</label>
                <input
                  id="aivisCloudStyleName"
                  type="text"
                  value={aivisCloud.styleName.value}
                  onChange={(e) =>
                    aivisCloud.styleName.onChange(e.target.value)
                  }
                  placeholder="スタイル名を直接指定 (IDと併用不可)"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudUseSsml">Use SSML</label>
                <select
                  id="aivisCloudUseSsml"
                  value={aivisCloud.useSsml.value}
                  onChange={(e) =>
                    aivisCloud.useSsml.onChange(
                      e.target.value as AivisCloudBooleanOption,
                    )
                  }
                >
                  <option value="default">API既定値（true）</option>
                  <option value="true">有効</option>
                  <option value="false">無効</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudLanguage">Language</label>
                <input
                  id="aivisCloudLanguage"
                  type="text"
                  value={aivisCloud.language.value}
                  onChange={(e) => aivisCloud.language.onChange(e.target.value)}
                  placeholder="例: ja （現状日本語のみ）"
                />
              </div>
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">話速・感情</div>
            <div className="parameter-grid parameter-grid--two">
              <NumberSliderField
                id="aivisCloudSpeakingRate"
                label="Speaking Rate"
                value={aivisCloud.speakingRate.value}
                onChange={aivisCloud.speakingRate.onChange}
                config={SLIDER_CONFIG.aivisCloudSpeakingRate}
                placeholder="例: 1.05 （0.5〜1.5）"
              />
              <NumberSliderField
                id="aivisCloudEmotionalIntensity"
                label="Emotional Intensity"
                value={aivisCloud.emotionalIntensity.value}
                onChange={aivisCloud.emotionalIntensity.onChange}
                config={SLIDER_CONFIG.aivisCloudEmotionalIntensity}
                placeholder="例: 1.2 （0.0〜2.0）"
              />
              <NumberSliderField
                id="aivisCloudTempoDynamics"
                label="Tempo Dynamics"
                value={aivisCloud.tempoDynamics.value}
                onChange={aivisCloud.tempoDynamics.onChange}
                config={SLIDER_CONFIG.aivisCloudTempoDynamics}
                placeholder="話速の緩急（0.0〜2.0）"
              />
              <NumberSliderField
                id="aivisCloudPitch"
                label="Pitch"
                value={aivisCloud.pitch.value}
                onChange={aivisCloud.pitch.onChange}
                config={SLIDER_CONFIG.aivisCloudPitch}
                placeholder="例: 0.10 （-1.0〜1.0）"
              />
              <NumberSliderField
                id="aivisCloudVolume"
                label="Volume"
                value={aivisCloud.volume.value}
                onChange={aivisCloud.volume.onChange}
                config={SLIDER_CONFIG.aivisCloudVolume}
                placeholder="例: 1.0 （0.0〜2.0）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">無音コントロール</div>
            <div className="parameter-grid parameter-grid--two">
              <NumberSliderField
                id="aivisCloudLeadingSilence"
                label="Leading Silence (sec)"
                value={aivisCloud.leadingSilence.value}
                onChange={aivisCloud.leadingSilence.onChange}
                config={SLIDER_CONFIG.aivisCloudLeadingSilence}
                placeholder="先頭無音 0.0〜0.6"
              />
              <NumberSliderField
                id="aivisCloudTrailingSilence"
                label="Trailing Silence (sec)"
                value={aivisCloud.trailingSilence.value}
                onChange={aivisCloud.trailingSilence.onChange}
                config={SLIDER_CONFIG.aivisCloudTrailingSilence}
                placeholder="末尾無音 0.0〜0.6"
              />
              <NumberSliderField
                id="aivisCloudLineBreakSilence"
                label="Line Break Silence (sec)"
                value={aivisCloud.lineBreakSilence.value}
                onChange={aivisCloud.lineBreakSilence.onChange}
                config={SLIDER_CONFIG.aivisCloudLineBreakSilence}
                placeholder="改行ごとの無音（0.0〜0.6）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">出力フォーマット</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="aivisCloudOutputFormat">Output Format</label>
                <select
                  id="aivisCloudOutputFormat"
                  value={aivisCloud.outputFormat.value}
                  onChange={(e) =>
                    aivisCloud.outputFormat.onChange(
                      e.target.value as AivisCloudOutputFormatOption,
                    )
                  }
                >
                  <option value="default">API既定値（mp3）</option>
                  <option value="wav">wav</option>
                  <option value="flac">flac</option>
                  <option value="mp3">mp3</option>
                  <option value="aac">aac</option>
                  <option value="opus">opus</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudOutputBitrate">
                  Output Bitrate (kbps)
                </label>
                <input
                  id="aivisCloudOutputBitrate"
                  type="number"
                  step="8"
                  min="8"
                  max="320"
                  value={aivisCloud.outputBitrate.value}
                  onChange={(e) =>
                    aivisCloud.outputBitrate.onChange(e.target.value)
                  }
                  placeholder="例: 192 （mp3/aac/opus のみ）"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudOutputSamplingRate">
                  Output Sampling Rate
                </label>
                <select
                  id="aivisCloudOutputSamplingRate"
                  value={aivisCloud.outputSamplingRate.value}
                  onChange={(e) =>
                    aivisCloud.outputSamplingRate.onChange(
                      e.target.value as AivisCloudOutputSamplingRateOption,
                    )
                  }
                >
                  <option value="default">API既定値を使用</option>
                  <option value="8000">8,000 Hz</option>
                  <option value="11025">11,025 Hz</option>
                  <option value="12000">12,000 Hz</option>
                  <option value="16000">16,000 Hz</option>
                  <option value="22050">22,050 Hz</option>
                  <option value="24000">24,000 Hz</option>
                  <option value="44100">44,100 Hz</option>
                  <option value="48000">48,000 Hz</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudOutputChannels">
                  Output Channels
                </label>
                <select
                  id="aivisCloudOutputChannels"
                  value={aivisCloud.outputChannels.value}
                  onChange={(e) =>
                    aivisCloud.outputChannels.onChange(
                      e.target.value as AivisCloudOutputChannelOption,
                    )
                  }
                >
                  <option value="default">API既定値（mono）</option>
                  <option value="mono">モノラル</option>
                  <option value="stereo">ステレオ</option>
                </select>
              </div>
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">その他</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="aivisCloudUserDictionaryUuid">
                  User Dictionary UUID
                </label>
                <input
                  id="aivisCloudUserDictionaryUuid"
                  type="text"
                  value={aivisCloud.userDictionaryUuid.value}
                  onChange={(e) =>
                    aivisCloud.userDictionaryUuid.onChange(e.target.value)
                  }
                  placeholder="適用したいユーザー辞書がある場合"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudEnableBillingLogs">
                  Billing Logs
                </label>
                <select
                  id="aivisCloudEnableBillingLogs"
                  value={aivisCloud.enableBillingLogs.value}
                  onChange={(e) =>
                    aivisCloud.enableBillingLogs.onChange(
                      e.target.value as AivisCloudBooleanOption,
                    )
                  }
                >
                  <option value="default">API既定値（false）</option>
                  <option value="true">ログを出力する</option>
                  <option value="false">ログを出力しない</option>
                </select>
              </div>
            </div>
          </div>

          <p className="parameter-card__note">
            スタイル ID とスタイル名はどちらか片方のみ指定してください。 SSML
            を有効にすると改行や &lt;break&gt;
            タグに基づいて音声が分割されます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'aivisSpeech' && (
        <CollapsibleCard
          className="parameter-card aivisspeech-card"
          title="AivisSpeech パラメータ"
          description="テキストから生成される音声の質感を細かく調整できます。未入力のフィールドは API の既定値のまま使用されます。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">話速・ピッチ</div>
            <div className="parameter-grid">
              <NumberSliderField
                id="aivisSpeedScale"
                label="Speed Scale"
                value={aivisSpeech.speedScale.value}
                onChange={aivisSpeech.speedScale.onChange}
                config={SLIDER_CONFIG.aivisSpeedScale}
                placeholder="例: 1.10（標準は 1.0）"
              />
              <NumberSliderField
                id="aivisPitchScale"
                label="Pitch Scale"
                value={aivisSpeech.pitchScale.value}
                onChange={aivisSpeech.pitchScale.onChange}
                config={SLIDER_CONFIG.aivisPitchScale}
                placeholder="例: 0.15（標準は 0.0）"
              />
              <NumberSliderField
                id="aivisIntonationScale"
                label="Intonation Scale"
                value={aivisSpeech.intonationScale.value}
                onChange={aivisSpeech.intonationScale.onChange}
                config={SLIDER_CONFIG.aivisIntonationScale}
                placeholder="例: 1.20（標準は 1.0）"
              />
              <NumberSliderField
                id="aivisTempoDynamicsScale"
                label="Tempo Dynamics Scale"
                value={aivisSpeech.tempoDynamicsScale.value}
                onChange={aivisSpeech.tempoDynamicsScale.onChange}
                config={SLIDER_CONFIG.aivisTempoDynamicsScale}
                placeholder="例: 1.10（標準は 1.0）"
              />
              <NumberSliderField
                id="aivisVolumeScale"
                label="Volume Scale"
                value={aivisSpeech.volumeScale.value}
                onChange={aivisSpeech.volumeScale.onChange}
                config={SLIDER_CONFIG.aivisVolumeScale}
                placeholder="例: 0.95（標準は 1.0）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">無音コントロール</div>
            <div className="parameter-grid">
              <NumberSliderField
                id="aivisPrePhonemeLength"
                label="Pre-phoneme Length (sec)"
                value={aivisSpeech.prePhonemeLength.value}
                onChange={aivisSpeech.prePhonemeLength.onChange}
                config={SLIDER_CONFIG.aivisPrePhonemeLength}
                placeholder="例: 0.12"
              />
              <NumberSliderField
                id="aivisPostPhonemeLength"
                label="Post-phoneme Length (sec)"
                value={aivisSpeech.postPhonemeLength.value}
                onChange={aivisSpeech.postPhonemeLength.onChange}
                config={SLIDER_CONFIG.aivisPostPhonemeLength}
                placeholder="例: 0.08"
              />
              <NumberSliderField
                id="aivisPauseLength"
                label="Pause Length (sec)"
                value={aivisSpeech.pauseLength.value}
                onChange={aivisSpeech.pauseLength.onChange}
                config={SLIDER_CONFIG.aivisPauseLength}
                placeholder="例: 0.5（空欄で自動）"
              />
              <NumberSliderField
                id="aivisPauseLengthScale"
                label="Pause Length Scale"
                value={aivisSpeech.pauseLengthScale.value}
                onChange={aivisSpeech.pauseLengthScale.onChange}
                config={SLIDER_CONFIG.aivisPauseLengthScale}
                placeholder="例: 1.1（標準は 1.0）"
              />
            </div>
          </div>

          <div className="parameter-section">
            <div className="parameter-section__title">出力フォーマット</div>
            <div className="parameter-grid parameter-grid--two">
              <div className="form-group">
                <label htmlFor="aivisOutputSamplingRate">
                  Output Sampling Rate
                </label>
                <select
                  id="aivisOutputSamplingRate"
                  value={aivisSpeech.outputSamplingRate.value}
                  onChange={(e) =>
                    aivisSpeech.outputSamplingRate.onChange(
                      e.target.value as LocalOutputSamplingRateOption,
                    )
                  }
                >
                  <option value="default">API既定値を使用</option>
                  <option value="8000">8,000 Hz</option>
                  <option value="11025">11,025 Hz</option>
                  <option value="16000">16,000 Hz</option>
                  <option value="22050">22,050 Hz</option>
                  <option value="24000">24,000 Hz</option>
                  <option value="44100">44,100 Hz</option>
                  <option value="48000">48,000 Hz</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="aivisOutputStereo">Output Stereo</label>
                <select
                  id="aivisOutputStereo"
                  value={aivisSpeech.outputStereo.value}
                  onChange={(e) =>
                    aivisSpeech.outputStereo.onChange(
                      e.target.value as OutputStereoOption,
                    )
                  }
                >
                  <option value="default">API既定値を使用</option>
                  <option value="mono">モノラル（false）</option>
                  <option value="stereo">ステレオ（true）</option>
                </select>
              </div>
            </div>
          </div>

          <p className="parameter-card__note">
            サンプリングレートは 8,000 / 11,025 / 16,000 / 22,050 / 24,000 /
            44,100 / 48,000 Hz
            をサポート。未入力の場合はエンジンの既定値が適用されます。
          </p>
        </CollapsibleCard>
      )}

      {engine === 'minimax' && (
        <>
          <div className="form-group">
            <label htmlFor="minimaxModel">MiniMax Model:</label>
            <select
              id="minimaxModel"
              value={minimax.model.value}
              onChange={(e) =>
                minimax.model.onChange(e.target.value as MinimaxModel)
              }
            >
              {Object.entries(MINIMAX_MODELS).map(([model, description]) => (
                <option key={model} value={model}>
                  {model} - {description}
                </option>
              ))}
            </select>
          </div>

          <CollapsibleCard
            className="advanced-card"
            title="MiniMax Voice Parameters"
          >
            <div className="form-group">
              <label htmlFor="minimaxLanguageBoost">Language Boost:</label>
              <input
                id="minimaxLanguageBoost"
                type="text"
                value={minimax.languageBoost.value}
                onChange={(e) => minimax.languageBoost.onChange(e.target.value)}
                placeholder="e.g. Japanese"
              />
            </div>

            <div className="grid">
              <NumberSliderField
                id="minimaxSpeed"
                label="Speed (1.0 = default)"
                value={minimax.speed.value}
                onChange={minimax.speed.onChange}
                config={SLIDER_CONFIG.minimaxSpeed}
                placeholder="Auto"
              />
              <NumberSliderField
                id="minimaxVolume"
                label="Volume (1.0 = default)"
                value={minimax.volume.value}
                onChange={minimax.volume.onChange}
                config={SLIDER_CONFIG.minimaxVolume}
                placeholder="Auto"
              />
              <NumberSliderField
                id="minimaxPitch"
                label="Pitch (semitones)"
                value={minimax.pitch.value}
                onChange={minimax.pitch.onChange}
                config={SLIDER_CONFIG.minimaxPitch}
                placeholder="Auto"
              />
            </div>

            <div className="grid">
              <div className="form-group">
                <label htmlFor="minimaxSampleRate">Sample Rate:</label>
                <select
                  id="minimaxSampleRate"
                  value={minimax.sampleRate.value}
                  onChange={(e) => minimax.sampleRate.onChange(e.target.value)}
                >
                  <option value="8000">8,000 Hz</option>
                  <option value="16000">16,000 Hz</option>
                  <option value="22050">22,050 Hz</option>
                  <option value="24000">24,000 Hz</option>
                  <option value="32000">32,000 Hz</option>
                  <option value="44100">44,100 Hz</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="minimaxBitrate">Bitrate (bps):</label>
                <select
                  id="minimaxBitrate"
                  value={minimax.bitrate.value}
                  onChange={(e) => minimax.bitrate.onChange(e.target.value)}
                >
                  <option value="32000">32,000</option>
                  <option value="64000">64,000</option>
                  <option value="128000">128,000</option>
                  <option value="256000">256,000</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="minimaxAudioFormat">Audio Format:</label>
                <select
                  id="minimaxAudioFormat"
                  value={minimax.audioFormat.value}
                  onChange={(e) =>
                    minimax.audioFormat.onChange(
                      e.target.value as MinimaxAudioFormat,
                    )
                  }
                >
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                  <option value="aac">AAC</option>
                  <option value="pcm">PCM</option>
                  <option value="flac">FLAC</option>
                  <option value="ogg">OGG</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="minimaxAudioChannel">Channel:</label>
                <select
                  id="minimaxAudioChannel"
                  value={minimax.audioChannel.value}
                  onChange={(e) =>
                    minimax.audioChannel.onChange(
                      e.target.value === '2' ? '2' : '1',
                    )
                  }
                >
                  <option value="1">Mono (1ch)</option>
                  <option value="2">Stereo (2ch)</option>
                </select>
              </div>
            </div>

            <p className="helper-text">
              Leave fields blank to use MiniMax defaults or emotion-based
              automatic values.
            </p>
          </CollapsibleCard>
        </>
      )}

      {engine === 'piperPlus' && (
        <CollapsibleCard
          className="parameter-card"
          title="Piper Plus パラメータ"
          description="ブラウザ内蔵 WASM 音声合成エンジンです。ONNX Runtime + OpenJTalk を使用します。"
        >
          <div className="parameter-section">
            <div className="parameter-section__title">音声調整</div>
            <div className="parameter-grid parameter-grid--two">
              <NumberSliderField
                id="piperPlusSpeed"
                label="Speed (0.5 - 2.0)"
                value={piperPlus.speed.value}
                onChange={piperPlus.speed.onChange}
                config={SLIDER_CONFIG.piperPlusSpeed}
                placeholder="例: 1.0（標準）"
              />
              <NumberSliderField
                id="piperPlusNoiseScale"
                label="Noise Scale (0.0 - 2.0)"
                value={piperPlus.noiseScale.value}
                onChange={piperPlus.noiseScale.onChange}
                config={SLIDER_CONFIG.piperPlusNoiseScale}
                placeholder="例: 1.0（標準）"
              />
            </div>
          </div>
        </CollapsibleCard>
      )}
    </>
  );
}
