import {
  VoiceEngineAdapter,
  type VoiceServiceOptions,
  type MinimaxModel,
  type MinimaxAudioFormat,
  type VoiceVoxQueryParameterOverrides,
  type AivisSpeechQueryParameterOverrides,
} from '@aituber-onair/voice';
import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import './App.css';

// Engine defaults
const ENGINE_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/audio/speech',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'sk-...',
    speaker: 'alloy',
  },
  openaiCompatible: {
    apiUrl: 'http://localhost:8880/v1/audio/speech',
    needsApiKey: false,
    acceptsApiKey: true,
    placeholder: 'Optional API key',
    speaker: 'af_bella',
    defaultModel: 'kokoro',
  },
  voicevox: {
    apiUrl: 'http://localhost:50021',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 1,
  },
  aivisSpeech: {
    apiUrl: 'http://localhost:10101',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: '888753760',
  },
  aivisCloud: {
    apiUrl: 'https://api.aivis-project.com/v1/tts/synthesize',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your Aivis Cloud API key',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
  },
  voicepeak: {
    apiUrl: 'http://localhost:20202',
    needsApiKey: false,
    acceptsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 'f1',
  },
  minimax: {
    apiUrl: 'https://api.minimax.io/v1/t2a_v2',
    needsApiKey: true,
    acceptsApiKey: true,
    placeholder: 'Your MiniMax API key',
    groupIdPlaceholder: 'Your Group ID',
    speaker: 'male-qn-qingse',
    defaultModel: 'speech-2.6-hd' as MinimaxModel,
  },
} as const;

// MiniMax model options with descriptions
const MINIMAX_MODELS: Record<MinimaxModel, string> = {
  'speech-2.6-hd':
    'Latest flagship HD model with ultra-high fidelity and natural prosody.',
  'speech-2.6-turbo':
    'Latest Turbo model optimized for low latency and real-time responses.',
  'speech-2.5-hd-preview':
    'The brand new HD model. Ultimate Similarity, Ultra-High Quality',
  'speech-2.5-turbo-preview':
    'The brand new Turbo model. Ultimate Value, 40 Languages',
  'speech-02-hd':
    'Superior rhythm and stability, with outstanding performance in replication similarity and sound quality.',
  'speech-02-turbo':
    'Superior rhythm and stability, with enhanced multilingual capabilities and excellent performance.',
  'speech-01-hd': 'Rich Voices, Expressive Emotions, Authentic Languages',
  'speech-01-turbo': 'Excellent performance and low latency',
};

// MiniMax Voice IDs with descriptions
const MINIMAX_VOICES: Record<string, string> = {
  'male-qn-qingse': 'Male - Qingse (Default)',
  Wise_Woman: 'Wise Woman',
  Friendly_Person: 'Friendly Person',
  Inspirational_girl: 'Inspirational Girl',
  Deep_Voice_Man: 'Deep Voice Man',
  Calm_Woman: 'Calm Woman',
  Casual_Guy: 'Casual Guy',
  Lively_Girl: 'Lively Girl',
  Patient_Man: 'Patient Man',
  Young_Knight: 'Young Knight',
  Determined_Man: 'Determined Man',
  Lovely_Girl: 'Lovely Girl',
  Decent_Boy: 'Decent Boy',
  Imposing_Manner: 'Imposing Manner',
  Elegant_Man: 'Elegant Man',
  Abbess: 'Abbess',
  Sweet_Girl_2: 'Sweet Girl 2',
  Exuberant_Girl: 'Exuberant Girl',
};

interface SliderConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
}

const SLIDER_CONFIG: Record<string, SliderConfig> = {
  openaiSpeed: {
    min: 0.25,
    max: 1.75,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  voicepeakSpeed: { min: 50, max: 150, step: 1, defaultValue: 100 },
  voicepeakPitch: { min: -300, max: 300, step: 1, defaultValue: 0 },
  voicevoxSpeedScale: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  voicevoxPitchScale: { min: -0.3, max: 0.3, step: 0.01, defaultValue: 0 },
  voicevoxIntonationScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  voicevoxVolumeScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  voicevoxPrePhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  voicevoxPostPhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  voicevoxPauseLength: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  voicevoxPauseLengthScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  minimaxSpeed: {
    min: 0.1,
    max: 1.9,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  minimaxVolume: {
    min: 0.1,
    max: 1.9,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  minimaxPitch: { min: -12, max: 12, step: 1, defaultValue: 0 },
  aivisSpeedScale: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  aivisPitchScale: { min: -0.3, max: 0.3, step: 0.01, defaultValue: 0 },
  aivisIntonationScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisTempoDynamicsScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisVolumeScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisPrePhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  aivisPostPhonemeLength: {
    min: 0,
    max: 0.2,
    step: 0.005,
    defaultValue: 0.1,
    suffix: 's',
  },
  aivisPauseLength: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisPauseLengthScale: { min: 0.5, max: 1.5, step: 0.05, defaultValue: 1 },
  aivisCloudSpeakingRate: {
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    suffix: 'x',
  },
  aivisCloudEmotionalIntensity: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudTempoDynamics: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudPitch: { min: -1, max: 1, step: 0.05, defaultValue: 0 },
  aivisCloudVolume: { min: 0, max: 2, step: 0.05, defaultValue: 1 },
  aivisCloudLeadingSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisCloudTrailingSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
  aivisCloudLineBreakSilence: {
    min: 0,
    max: 0.6,
    step: 0.05,
    defaultValue: 0.3,
    suffix: 's',
  },
};

const clampValue = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const getDecimalPlaces = (step: number): number => {
  const stepString = step.toString();
  if (!stepString.includes('.')) {
    return 0;
  }
  return stepString.split('.')[1]?.length ?? 0;
};

const formatValueForStep = (value: number, step: number): string => {
  const decimals = getDecimalPlaces(step);
  return decimals > 0 ? value.toFixed(decimals) : value.toString();
};

interface NumberSliderFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  config: SliderConfig;
  placeholder?: string;
  suffix?: string;
}

const DEFAULT_VALUE_LABEL = '既定値';

function NumberSliderField({
  id,
  label,
  value,
  onChange,
  config,
  placeholder,
  suffix,
}: NumberSliderFieldProps) {
  const effectiveSuffix = suffix ?? config.suffix ?? '';
  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  const hasCustomValue = trimmedValue !== '' && !Number.isNaN(numericValue);
  const sliderValue = clampValue(
    hasCustomValue ? numericValue : config.defaultValue,
    config.min,
    config.max,
  );

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number.parseFloat(event.target.value);
    if (Number.isNaN(numericValue)) {
      onChange('');
      return;
    }
    onChange(formatValueForStep(numericValue, config.step));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleReset = () => {
    onChange('');
  };

  const displayValue = !hasCustomValue
    ? `${DEFAULT_VALUE_LABEL} (${formatValueForStep(
        config.defaultValue,
        config.step,
      )}${effectiveSuffix})`
    : `${trimmedValue}${effectiveSuffix}`;

  return (
    <div className="form-group form-group--with-slider">
      <div className="form-group__label-row">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          className="slider-reset"
          onClick={handleReset}
          disabled={!hasCustomValue}
        >
          既定値に戻す
        </button>
      </div>
      <div className="range-control">
        <input
          id={`${id}Slider`}
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={sliderValue}
          onChange={handleSliderChange}
          aria-label={`${label} スライダー`}
          list={`${id}Ticks`}
        />
        <output className="range-control__value" htmlFor={`${id}Slider`}>
          {displayValue}
        </output>
      </div>
      <input
        id={id}
        type="number"
        step={config.step}
        value={value}
        onChange={handleNumberChange}
        placeholder={placeholder}
      />
      <datalist id={`${id}Ticks`}>
        <option value={config.min} />
        <option value={config.defaultValue} />
        <option value={config.max} />
      </datalist>
    </div>
  );
}

interface CollapsibleCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}

function CollapsibleCard({
  title,
  description,
  children,
  className,
  defaultOpen = false,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const rootClassName = ['collapsible-card', className]
    .filter(Boolean)
    .join(' ');
  const panelClassName = ['collapsible-card__panel', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <button
        type="button"
        className="collapsible-card__trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className="collapsible-card__title">{title}</span>
        <span className="collapsible-card__icon" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      <div
        className={panelClassName}
        style={{ display: isOpen ? 'block' : 'none' }}
        aria-hidden={!isOpen}
      >
        {description ? (
          <p className="collapsible-card__description">{description}</p>
        ) : null}
        <div className="collapsible-card__content">{children}</div>
      </div>
    </div>
  );
}

type EngineType = keyof typeof ENGINE_DEFAULTS;
type AivisCloudBooleanOption = 'default' | 'true' | 'false';
type AivisCloudOutputFormatOption =
  | 'default'
  | 'wav'
  | 'flac'
  | 'mp3'
  | 'aac'
  | 'opus';
type AivisCloudOutputSamplingRateOption =
  | 'default'
  | '8000'
  | '11025'
  | '12000'
  | '16000'
  | '22050'
  | '24000'
  | '44100'
  | '48000';
type AivisCloudOutputChannelOption = 'default' | 'mono' | 'stereo';
type VoicePeakEmotionOption =
  | 'neutral'
  | 'happy'
  | 'fun'
  | 'angry'
  | 'sad'
  | 'surprised';

function App() {
  const [engine, setEngine] = useState<EngineType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [minimaxGroupId, setMinimaxGroupId] = useState('');
  const [minimaxVoiceId, setMinimaxVoiceId] = useState('male-qn-qingse');
  const [apiUrl, setApiUrl] = useState('');
  const [minimaxModel, setMinimaxModel] = useState<MinimaxModel>(
    ENGINE_DEFAULTS.minimax.defaultModel,
  );
  const [minimaxLanguageBoost, setMinimaxLanguageBoost] = useState('Japanese');
  const [minimaxSpeed, setMinimaxSpeed] = useState('');
  const [minimaxVolume, setMinimaxVolume] = useState('');
  const [minimaxPitch, setMinimaxPitch] = useState('');
  const [minimaxSampleRate, setMinimaxSampleRate] = useState('32000');
  const [minimaxBitrate, setMinimaxBitrate] = useState('128000');
  const [minimaxAudioFormat, setMinimaxAudioFormat] =
    useState<MinimaxAudioFormat>('mp3');
  const [minimaxAudioChannel, setMinimaxAudioChannel] = useState<'1' | '2'>(
    '1',
  );
  const [voicevoxSpeedScale, setVoicevoxSpeedScale] = useState('');
  const [voicevoxPitchScale, setVoicevoxPitchScale] = useState('');
  const [voicevoxIntonationScale, setVoicevoxIntonationScale] = useState('');
  const [voicevoxVolumeScale, setVoicevoxVolumeScale] = useState('');
  const [voicevoxPrePhonemeLength, setVoicevoxPrePhonemeLength] = useState('');
  const [voicevoxPostPhonemeLength, setVoicevoxPostPhonemeLength] =
    useState('');
  const [voicevoxPauseLength, setVoicevoxPauseLength] = useState('');
  const [voicevoxPauseLengthScale, setVoicevoxPauseLengthScale] = useState('');
  const [voicevoxOutputSamplingRate, setVoicevoxOutputSamplingRate] =
    useState('default');
  const [voicevoxOutputStereo, setVoicevoxOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [voicevoxEnableKatakanaEnglish, setVoicevoxEnableKatakanaEnglish] =
    useState<'default' | 'true' | 'false'>('default');
  const [
    voicevoxEnableInterrogativeUpspeak,
    setVoicevoxEnableInterrogativeUpspeak,
  ] = useState<'default' | 'true' | 'false'>('default');
  const [voicevoxCoreVersion, setVoicevoxCoreVersion] = useState('');
  const [voicepeakEmotion, setVoicepeakEmotion] =
    useState<VoicePeakEmotionOption>('neutral');
  const [voicepeakSpeed, setVoicepeakSpeed] = useState('');
  const [voicepeakPitch, setVoicepeakPitch] = useState('');
  const [openaiSpeed, setOpenaiSpeed] = useState('');
  const [openaiCompatibleModel, setOpenaiCompatibleModel] = useState<string>(
    ENGINE_DEFAULTS.openaiCompatible.defaultModel,
  );
  const [aivisCloudModelUuid, setAivisCloudModelUuid] = useState('');
  const [aivisCloudSpeakerUuid, setAivisCloudSpeakerUuid] = useState('');
  const [aivisCloudStyleId, setAivisCloudStyleId] = useState('');
  const [aivisCloudStyleName, setAivisCloudStyleName] = useState('');
  const [aivisCloudUseSsml, setAivisCloudUseSsml] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisCloudLanguage, setAivisCloudLanguage] = useState('ja');
  const [aivisCloudSpeakingRate, setAivisCloudSpeakingRate] = useState('');
  const [aivisCloudEmotionalIntensity, setAivisCloudEmotionalIntensity] =
    useState('');
  const [aivisCloudTempoDynamics, setAivisCloudTempoDynamics] = useState('');
  const [aivisCloudPitch, setAivisCloudPitch] = useState('');
  const [aivisCloudVolume, setAivisCloudVolume] = useState('');
  const [aivisCloudLeadingSilence, setAivisCloudLeadingSilence] = useState('');
  const [aivisCloudTrailingSilence, setAivisCloudTrailingSilence] =
    useState('');
  const [aivisCloudLineBreakSilence, setAivisCloudLineBreakSilence] =
    useState('');
  const [aivisCloudOutputFormat, setAivisCloudOutputFormat] =
    useState<AivisCloudOutputFormatOption>('default');
  const [aivisCloudOutputBitrate, setAivisCloudOutputBitrate] = useState('');
  const [aivisCloudOutputSamplingRate, setAivisCloudOutputSamplingRate] =
    useState<AivisCloudOutputSamplingRateOption>('default');
  const [aivisCloudOutputChannels, setAivisCloudOutputChannels] =
    useState<AivisCloudOutputChannelOption>('default');
  const [aivisCloudUserDictionaryUuid, setAivisCloudUserDictionaryUuid] =
    useState('');
  const [aivisCloudEnableBillingLogs, setAivisCloudEnableBillingLogs] =
    useState<AivisCloudBooleanOption>('default');
  const [aivisSpeedScale, setAivisSpeedScale] = useState('');
  const [aivisPitchScale, setAivisPitchScale] = useState('');
  const [aivisIntonationScale, setAivisIntonationScale] = useState('');
  const [aivisTempoDynamicsScale, setAivisTempoDynamicsScale] = useState('');
  const [aivisVolumeScale, setAivisVolumeScale] = useState('');
  const [aivisPrePhonemeLength, setAivisPrePhonemeLength] = useState('');
  const [aivisPostPhonemeLength, setAivisPostPhonemeLength] = useState('');
  const [aivisPauseLength, setAivisPauseLength] = useState('');
  const [aivisPauseLengthScale, setAivisPauseLengthScale] = useState('');
  const [aivisOutputSamplingRate, setAivisOutputSamplingRate] =
    useState('default');
  const [aivisOutputStereo, setAivisOutputStereo] = useState<
    'default' | 'mono' | 'stereo'
  >('default');
  const [text, setText] = useState(
    'こんにちは！AITuber OnAir Voice のReactデモへようこそ。',
  );
  const [status, setStatus] = useState(
    'Ready! Select an engine and enter text.',
  );
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>(
    'info',
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceService, setVoiceService] = useState<VoiceEngineAdapter | null>(
    null,
  );

  // Update defaults when engine changes
  useEffect(() => {
    const defaults = ENGINE_DEFAULTS[engine];
    const minimaxDefaults = ENGINE_DEFAULTS.minimax;
    setApiUrl(defaults.apiUrl);
    setApiKey('');
    setMinimaxGroupId('');
    if (engine === 'minimax') {
      setMinimaxVoiceId(minimaxDefaults.speaker);
      setMinimaxModel(minimaxDefaults.defaultModel);
    } else {
      setMinimaxVoiceId('male-qn-qingse');
      setMinimaxModel(minimaxDefaults.defaultModel);
    }
    setMinimaxLanguageBoost('Japanese');
    setMinimaxSpeed('');
    setMinimaxVolume('');
    setMinimaxPitch('');
    setMinimaxSampleRate('32000');
    setMinimaxBitrate('128000');
    setMinimaxAudioFormat('mp3');
    setMinimaxAudioChannel('1');
    setVoicevoxSpeedScale('');
    setVoicevoxPitchScale('');
    setVoicevoxIntonationScale('');
    setVoicevoxVolumeScale('');
    setVoicevoxPrePhonemeLength('');
    setVoicevoxPostPhonemeLength('');
    setVoicevoxPauseLength('');
    setVoicevoxPauseLengthScale('');
    setVoicevoxOutputSamplingRate('default');
    setVoicevoxOutputStereo('default');
    setVoicevoxEnableKatakanaEnglish('default');
    setVoicevoxEnableInterrogativeUpspeak('default');
    setVoicevoxCoreVersion('');
    setVoicepeakEmotion('neutral');
    setVoicepeakSpeed('');
    setVoicepeakPitch('');
    setOpenaiSpeed('');
    setOpenaiCompatibleModel(ENGINE_DEFAULTS.openaiCompatible.defaultModel);
    setAivisCloudModelUuid('');
    setAivisCloudSpeakerUuid('');
    setAivisCloudStyleId('');
    setAivisCloudStyleName('');
    setAivisCloudUseSsml('default');
    setAivisCloudLanguage('ja');
    setAivisCloudSpeakingRate('');
    setAivisCloudEmotionalIntensity('');
    setAivisCloudTempoDynamics('');
    setAivisCloudPitch('');
    setAivisCloudVolume('');
    setAivisCloudLeadingSilence('');
    setAivisCloudTrailingSilence('');
    setAivisCloudLineBreakSilence('');
    setAivisCloudOutputFormat('default');
    setAivisCloudOutputBitrate('');
    setAivisCloudOutputSamplingRate('default');
    setAivisCloudOutputChannels('default');
    setAivisCloudUserDictionaryUuid('');
    setAivisCloudEnableBillingLogs('default');
    setAivisSpeedScale('');
    setAivisPitchScale('');
    setAivisIntonationScale('');
    setAivisTempoDynamicsScale('');
    setAivisVolumeScale('');
    setAivisPrePhonemeLength('');
    setAivisPostPhonemeLength('');
    setAivisPauseLength('');
    setAivisPauseLengthScale('');
    setAivisOutputSamplingRate('default');
    setAivisOutputStereo('default');
    setStatus(`Switched to ${engine}. Default URL: ${defaults.apiUrl}`);
    setStatusType('success');
  }, [engine]);

  const speak = async () => {
    if (!text) {
      setStatus('Please enter some text to speak');
      setStatusType('error');
      return;
    }

    const defaults = ENGINE_DEFAULTS[engine];

    // Validate required fields
    if (engine === 'minimax') {
      if (!apiKey || !minimaxGroupId) {
        setStatus('Both API key and Group ID are required for MiniMax');
        setStatusType('error');
        return;
      }
    } else if (defaults.needsApiKey && !apiKey) {
      setStatus(`API key is required for ${engine}`);
      setStatusType('error');
      return;
    }

    setIsPlaying(true);
    setStatus('Initializing voice service...');
    setStatusType('info');

    try {
      // Create voice service options
      const options: {
        engineType: EngineType;
        speaker: string;
        apiKey?: string;
        onComplete: () => void;
        [key: string]: unknown;
      } = {
        engineType: engine,
        speaker:
          engine === 'minimax' ? minimaxVoiceId : String(defaults.speaker),
        onComplete: () => {
          setIsPlaying(false);
          setStatus('Playback completed');
          setStatusType('success');
        },
      };

      // Add API key if provided
      if (apiKey) {
        options.apiKey = apiKey;
      }

      // Add MiniMax-specific options
      if (engine === 'minimax') {
        options.groupId = minimaxGroupId;
        options.minimaxModel = minimaxModel;

        if (minimaxLanguageBoost.trim()) {
          options.minimaxLanguageBoost = minimaxLanguageBoost.trim();
        }

        const voiceSettings: {
          speed?: number;
          vol?: number;
          pitch?: number;
        } = {};

        const parsedSpeed = Number.parseFloat(minimaxSpeed);
        if (!Number.isNaN(parsedSpeed)) {
          options.minimaxSpeed = parsedSpeed;
          voiceSettings.speed = parsedSpeed;
        }
        const parsedVolume = Number.parseFloat(minimaxVolume);
        if (!Number.isNaN(parsedVolume)) {
          options.minimaxVolume = parsedVolume;
          voiceSettings.vol = parsedVolume;
        }
        const parsedPitch = Number.parseFloat(minimaxPitch);
        if (!Number.isNaN(parsedPitch)) {
          options.minimaxPitch = parsedPitch;
          voiceSettings.pitch = parsedPitch;
        }
        if (Object.keys(voiceSettings).length > 0) {
          options.minimaxVoiceSettings = voiceSettings;
        }

        const audioSettings: {
          sampleRate?: number;
          bitrate?: number;
          format?: MinimaxAudioFormat;
          channel?: 1 | 2;
        } = {};

        const parsedSampleRate = Number.parseInt(minimaxSampleRate, 10);
        if (!Number.isNaN(parsedSampleRate)) {
          options.minimaxSampleRate = parsedSampleRate;
          audioSettings.sampleRate = parsedSampleRate;
        }

        const parsedBitrate = Number.parseInt(minimaxBitrate, 10);
        if (!Number.isNaN(parsedBitrate)) {
          options.minimaxBitrate = parsedBitrate;
          audioSettings.bitrate = parsedBitrate;
        }

        if (minimaxAudioFormat) {
          options.minimaxAudioFormat = minimaxAudioFormat;
          audioSettings.format = minimaxAudioFormat;
        }

        const parsedChannel = Number.parseInt(minimaxAudioChannel, 10);
        if (
          !Number.isNaN(parsedChannel) &&
          (parsedChannel === 1 || parsedChannel === 2)
        ) {
          options.minimaxAudioChannel = parsedChannel as 1 | 2;
          audioSettings.channel = parsedChannel as 1 | 2;
        }

        if (Object.keys(audioSettings).length > 0) {
          options.minimaxAudioSettings = audioSettings;
        }
      } else if (engine === 'aivisCloud') {
        if (aivisCloudModelUuid.trim()) {
          options.aivisCloudModelUuid = aivisCloudModelUuid.trim();
        }

        if (aivisCloudSpeakerUuid.trim()) {
          options.aivisCloudSpeakerUuid = aivisCloudSpeakerUuid.trim();
        }

        const parsedStyleId = Number.parseInt(aivisCloudStyleId, 10);
        if (!Number.isNaN(parsedStyleId)) {
          options.aivisCloudStyleId = parsedStyleId;
        } else if (aivisCloudStyleName.trim()) {
          options.aivisCloudStyleName = aivisCloudStyleName.trim();
        }

        if (aivisCloudUseSsml !== 'default') {
          options.aivisCloudUseSSML = aivisCloudUseSsml === 'true';
        }

        if (aivisCloudLanguage.trim()) {
          options.aivisCloudLanguage = aivisCloudLanguage.trim();
        }

        const parsedSpeakingRate = Number.parseFloat(aivisCloudSpeakingRate);
        if (!Number.isNaN(parsedSpeakingRate)) {
          options.aivisCloudSpeakingRate = parsedSpeakingRate;
        }

        const parsedEmotionalIntensity = Number.parseFloat(
          aivisCloudEmotionalIntensity,
        );
        if (!Number.isNaN(parsedEmotionalIntensity)) {
          options.aivisCloudEmotionalIntensity = parsedEmotionalIntensity;
        }

        const parsedTempoDynamics = Number.parseFloat(aivisCloudTempoDynamics);
        if (!Number.isNaN(parsedTempoDynamics)) {
          options.aivisCloudTempoDynamics = parsedTempoDynamics;
        }

        const parsedPitch = Number.parseFloat(aivisCloudPitch);
        if (!Number.isNaN(parsedPitch)) {
          options.aivisCloudPitch = parsedPitch;
        }

        const parsedVolume = Number.parseFloat(aivisCloudVolume);
        if (!Number.isNaN(parsedVolume)) {
          options.aivisCloudVolume = parsedVolume;
        }

        const parsedLeadingSilence = Number.parseFloat(
          aivisCloudLeadingSilence,
        );
        const parsedTrailingSilence = Number.parseFloat(
          aivisCloudTrailingSilence,
        );
        const parsedLineBreakSilence = Number.parseFloat(
          aivisCloudLineBreakSilence,
        );

        if (!Number.isNaN(parsedLeadingSilence)) {
          options.aivisCloudLeadingSilence = parsedLeadingSilence;
        }
        if (!Number.isNaN(parsedTrailingSilence)) {
          options.aivisCloudTrailingSilence = parsedTrailingSilence;
        }
        if (!Number.isNaN(parsedLineBreakSilence)) {
          options.aivisCloudLineBreakSilence = parsedLineBreakSilence;
        }

        if (aivisCloudOutputFormat !== 'default') {
          options.aivisCloudOutputFormat = aivisCloudOutputFormat as Exclude<
            AivisCloudOutputFormatOption,
            'default'
          >;
        }

        if (aivisCloudOutputBitrate.trim()) {
          const parsedBitrate = Number.parseInt(aivisCloudOutputBitrate, 10);
          if (!Number.isNaN(parsedBitrate)) {
            options.aivisCloudOutputBitrate = parsedBitrate;
          }
        }

        if (aivisCloudOutputSamplingRate !== 'default') {
          options.aivisCloudOutputSamplingRate = Number(
            aivisCloudOutputSamplingRate,
          ) as 8000 | 11025 | 12000 | 16000 | 22050 | 24000 | 44100 | 48000;
        }

        if (aivisCloudOutputChannels !== 'default') {
          options.aivisCloudOutputChannels = aivisCloudOutputChannels as
            | 'mono'
            | 'stereo';
        }

        if (aivisCloudUserDictionaryUuid.trim()) {
          options.aivisCloudUserDictionaryUuid =
            aivisCloudUserDictionaryUuid.trim();
        }

        if (aivisCloudEnableBillingLogs !== 'default') {
          options.aivisCloudEnableBillingLogs =
            aivisCloudEnableBillingLogs === 'true';
        }
      } else if (engine === 'openai') {
        const parsedSpeed = Number.parseFloat(openaiSpeed);
        if (!Number.isNaN(parsedSpeed)) {
          options.openAiSpeed = parsedSpeed;
        }
      } else if (engine === 'openaiCompatible') {
        if (openaiCompatibleModel.trim()) {
          options.openAiCompatibleModel = openaiCompatibleModel.trim();
        }

        const parsedSpeed = Number.parseFloat(openaiSpeed);
        if (!Number.isNaN(parsedSpeed)) {
          options.openAiCompatibleSpeed = parsedSpeed;
        }
      } else if (engine === 'voicepeak') {
        options.voicepeakEmotion = voicepeakEmotion;

        const parsedSpeed = Number.parseInt(voicepeakSpeed, 10);
        if (!Number.isNaN(parsedSpeed)) {
          options.voicepeakSpeed = parsedSpeed;
        }

        const parsedPitch = Number.parseInt(voicepeakPitch, 10);
        if (!Number.isNaN(parsedPitch)) {
          options.voicepeakPitch = parsedPitch;
        }
      } else if (engine === 'aivisSpeech') {
        const queryOverrides: AivisSpeechQueryParameterOverrides = {};

        const parsedSpeedScale = Number.parseFloat(aivisSpeedScale);
        if (!Number.isNaN(parsedSpeedScale)) {
          options.aivisSpeechSpeedScale = parsedSpeedScale;
          queryOverrides.speedScale = parsedSpeedScale;
        }

        const parsedPitchScale = Number.parseFloat(aivisPitchScale);
        if (!Number.isNaN(parsedPitchScale)) {
          options.aivisSpeechPitchScale = parsedPitchScale;
          queryOverrides.pitchScale = parsedPitchScale;
        }

        const parsedIntonationScale = Number.parseFloat(aivisIntonationScale);
        if (!Number.isNaN(parsedIntonationScale)) {
          options.aivisSpeechIntonationScale = parsedIntonationScale;
          queryOverrides.intonationScale = parsedIntonationScale;
        }

        const parsedTempoDynamicsScale = Number.parseFloat(
          aivisTempoDynamicsScale,
        );
        if (!Number.isNaN(parsedTempoDynamicsScale)) {
          options.aivisSpeechTempoDynamicsScale = parsedTempoDynamicsScale;
          queryOverrides.tempoDynamicsScale = parsedTempoDynamicsScale;
        }

        const parsedVolumeScale = Number.parseFloat(aivisVolumeScale);
        if (!Number.isNaN(parsedVolumeScale)) {
          options.aivisSpeechVolumeScale = parsedVolumeScale;
          queryOverrides.volumeScale = parsedVolumeScale;
        }

        const parsedPrePhonemeLength = Number.parseFloat(aivisPrePhonemeLength);
        if (!Number.isNaN(parsedPrePhonemeLength)) {
          options.aivisSpeechPrePhonemeLength = parsedPrePhonemeLength;
          queryOverrides.prePhonemeLength = parsedPrePhonemeLength;
        }

        const parsedPostPhonemeLength = Number.parseFloat(
          aivisPostPhonemeLength,
        );
        if (!Number.isNaN(parsedPostPhonemeLength)) {
          options.aivisSpeechPostPhonemeLength = parsedPostPhonemeLength;
          queryOverrides.postPhonemeLength = parsedPostPhonemeLength;
        }

        const parsedPauseLength = Number.parseFloat(aivisPauseLength);
        if (!Number.isNaN(parsedPauseLength)) {
          options.aivisSpeechPauseLength = parsedPauseLength;
          queryOverrides.pauseLength = parsedPauseLength;
        }

        const parsedPauseLengthScale = Number.parseFloat(aivisPauseLengthScale);
        if (!Number.isNaN(parsedPauseLengthScale)) {
          options.aivisSpeechPauseLengthScale = parsedPauseLengthScale;
          queryOverrides.pauseLengthScale = parsedPauseLengthScale;
        }

        if (aivisOutputSamplingRate !== 'default') {
          const parsedOutputSamplingRate = Number.parseInt(
            aivisOutputSamplingRate,
            10,
          );
          if (!Number.isNaN(parsedOutputSamplingRate)) {
            options.aivisSpeechOutputSamplingRate = parsedOutputSamplingRate;
            queryOverrides.outputSamplingRate = parsedOutputSamplingRate;
          }
        }

        if (aivisOutputStereo !== 'default') {
          const stereo = aivisOutputStereo === 'stereo';
          options.aivisSpeechOutputStereo = stereo;
          queryOverrides.outputStereo = stereo;
        }

        if (Object.keys(queryOverrides).length > 0) {
          options.aivisSpeechQueryParameters = queryOverrides;
        }
      } else if (engine === 'voicevox') {
        const queryOverrides: VoiceVoxQueryParameterOverrides = {};

        const parsedSpeedScale = Number.parseFloat(voicevoxSpeedScale);
        if (!Number.isNaN(parsedSpeedScale)) {
          options.voicevoxSpeedScale = parsedSpeedScale;
          queryOverrides.speedScale = parsedSpeedScale;
        }

        const parsedPitchScale = Number.parseFloat(voicevoxPitchScale);
        if (!Number.isNaN(parsedPitchScale)) {
          options.voicevoxPitchScale = parsedPitchScale;
          queryOverrides.pitchScale = parsedPitchScale;
        }

        const parsedIntonationScale = Number.parseFloat(
          voicevoxIntonationScale,
        );
        if (!Number.isNaN(parsedIntonationScale)) {
          options.voicevoxIntonationScale = parsedIntonationScale;
          queryOverrides.intonationScale = parsedIntonationScale;
        }

        const parsedVolumeScale = Number.parseFloat(voicevoxVolumeScale);
        if (!Number.isNaN(parsedVolumeScale)) {
          options.voicevoxVolumeScale = parsedVolumeScale;
          queryOverrides.volumeScale = parsedVolumeScale;
        }

        const parsedPrePhonemeLength = Number.parseFloat(
          voicevoxPrePhonemeLength,
        );
        if (!Number.isNaN(parsedPrePhonemeLength)) {
          options.voicevoxPrePhonemeLength = parsedPrePhonemeLength;
          queryOverrides.prePhonemeLength = parsedPrePhonemeLength;
        }

        const parsedPostPhonemeLength = Number.parseFloat(
          voicevoxPostPhonemeLength,
        );
        if (!Number.isNaN(parsedPostPhonemeLength)) {
          options.voicevoxPostPhonemeLength = parsedPostPhonemeLength;
          queryOverrides.postPhonemeLength = parsedPostPhonemeLength;
        }

        const parsedPauseLength = Number.parseFloat(voicevoxPauseLength);
        if (!Number.isNaN(parsedPauseLength)) {
          options.voicevoxPauseLength = parsedPauseLength;
          queryOverrides.pauseLength = parsedPauseLength;
        }

        const parsedPauseLengthScale = Number.parseFloat(
          voicevoxPauseLengthScale,
        );
        if (!Number.isNaN(parsedPauseLengthScale)) {
          options.voicevoxPauseLengthScale = parsedPauseLengthScale;
          queryOverrides.pauseLengthScale = parsedPauseLengthScale;
        }

        if (voicevoxOutputSamplingRate !== 'default') {
          const parsedOutputSamplingRate = Number.parseInt(
            voicevoxOutputSamplingRate,
            10,
          );
          if (!Number.isNaN(parsedOutputSamplingRate)) {
            options.voicevoxOutputSamplingRate = parsedOutputSamplingRate;
            queryOverrides.outputSamplingRate = parsedOutputSamplingRate;
          }
        }

        if (voicevoxOutputStereo !== 'default') {
          const stereo = voicevoxOutputStereo === 'stereo';
          options.voicevoxOutputStereo = stereo;
          queryOverrides.outputStereo = stereo;
        }

        if (voicevoxEnableKatakanaEnglish !== 'default') {
          options.voicevoxEnableKatakanaEnglish =
            voicevoxEnableKatakanaEnglish === 'true';
        }

        if (voicevoxEnableInterrogativeUpspeak !== 'default') {
          options.voicevoxEnableInterrogativeUpspeak =
            voicevoxEnableInterrogativeUpspeak === 'true';
        }

        if (voicevoxCoreVersion.trim()) {
          options.voicevoxCoreVersion = voicevoxCoreVersion.trim();
        }

        if (Object.keys(queryOverrides).length > 0) {
          options.voicevoxQueryParameters = queryOverrides;
        }
      }

      // Add API URL if provided
      if (apiUrl) {
        // Set engine-specific API URL
        switch (engine) {
          case 'voicevox':
            options.voicevoxApiUrl = apiUrl;
            break;
          case 'voicepeak':
            options.voicepeakApiUrl = apiUrl;
            break;
          case 'openaiCompatible':
            options.openAiCompatibleApiUrl = apiUrl;
            break;
          case 'aivisSpeech':
            options.aivisSpeechApiUrl = apiUrl;
            break;
          // For cloud services, the API URL is typically fixed
          // but we can still allow override if needed
        }
      }

      // Create or reuse voice service
      const service = new VoiceEngineAdapter(options as VoiceServiceOptions);
      setVoiceService(service);

      setStatus('Generating speech...');
      setStatusType('info');

      // Speak the text
      await service.speak({ text });
    } catch (error) {
      console.error('Speech error:', error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setStatusType('error');
      setIsPlaying(false);
    }
  };

  const stopSpeaking = () => {
    if (voiceService) {
      voiceService.stop();
      setIsPlaying(false);
      setStatus('Playback stopped');
      setStatusType('success');
    }
  };

  const defaults = ENGINE_DEFAULTS[engine];

  return (
    <div className="container">
      <h1>
        🎤 AITuber OnAir Voice
        <br />
        React Example
      </h1>

      <div className="card">
        <div className="form-group">
          <label htmlFor="engine">Voice Engine:</label>
          <select
            id="engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value as EngineType)}
          >
            <option value="openai">OpenAI TTS</option>
            <option value="openaiCompatible">OpenAI-Compatible TTS</option>
            <option value="voicevox">VOICEVOX</option>
            <option value="aivisSpeech">AivisSpeech (Local)</option>
            <option value="aivisCloud">Aivis Cloud API</option>
            <option value="voicepeak">VOICEPEAK</option>
            <option value="minimax">MiniMax</option>
          </select>
        </div>

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
                value={openaiSpeed}
                onChange={(next) => setOpenaiSpeed(next)}
                config={SLIDER_CONFIG.openaiSpeed}
                placeholder="例: 1.25（標準は 1.0）"
              />
            </div>

            <p className="parameter-card__note">
              モデルや声色は `speaker` の指定で切り替えられます。
            </p>
          </CollapsibleCard>
        )}

        {engine === 'openaiCompatible' && (
          <CollapsibleCard
            className="parameter-card openai-card"
            title="OpenAI互換 TTS パラメータ"
            description="Kokoro FastAPI など `/v1/audio/speech` 互換のエンドポイント向けです。既定値は Kokoro FastAPI を想定しています。"
          >
            <div className="parameter-section">
              <div className="parameter-section__title">モデル・話速</div>
              <div className="parameter-grid parameter-grid--two">
                <div className="form-group">
                  <label htmlFor="openaiCompatibleModel">Model</label>
                  <input
                    id="openaiCompatibleModel"
                    type="text"
                    value={openaiCompatibleModel}
                    onChange={(e) => setOpenaiCompatibleModel(e.target.value)}
                    placeholder="例: kokoro"
                  />
                </div>
                <NumberSliderField
                  id="openaiCompatibleSpeed"
                  label="Speed (0.25 - 4.0)"
                  value={openaiSpeed}
                  onChange={(next) => setOpenaiSpeed(next)}
                  config={SLIDER_CONFIG.openaiSpeed}
                  placeholder="例: 1.10（標準は 1.0）"
                />
              </div>
            </div>

            <p className="parameter-card__note">
              デフォルトの voice は `af_bella`、API URL は
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
            <div className="parameter-grid parameter-grid--two parameter-card__grid">
              <div className="form-group">
                <label htmlFor="voicevoxApiKey">API Key (optional)</label>
                <input
                  id="voicevoxApiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="APIキーは不要です"
                  disabled
                  title="VOICEVOXローカルエンジンではAPIキーは不要です"
                />
              </div>
              <div className="form-group">
                <label htmlFor="voicevoxApiUrl">API URL (customizable)</label>
                <input
                  id="voicevoxApiUrl"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="例: http://localhost:50021"
                />
              </div>
            </div>

            <div className="parameter-section">
              <div className="parameter-section__title">話速・ピッチ</div>
              <div className="parameter-grid">
                <NumberSliderField
                  id="voicevoxSpeedScale"
                  label="Speed Scale"
                  value={voicevoxSpeedScale}
                  onChange={(next) => setVoicevoxSpeedScale(next)}
                  config={SLIDER_CONFIG.voicevoxSpeedScale}
                  placeholder="例: 1.10（標準は 1.0）"
                />
                <NumberSliderField
                  id="voicevoxPitchScale"
                  label="Pitch Scale"
                  value={voicevoxPitchScale}
                  onChange={(next) => setVoicevoxPitchScale(next)}
                  config={SLIDER_CONFIG.voicevoxPitchScale}
                  placeholder="例: 0.15（標準は 0.0）"
                />
                <NumberSliderField
                  id="voicevoxIntonationScale"
                  label="Intonation Scale"
                  value={voicevoxIntonationScale}
                  onChange={(next) => setVoicevoxIntonationScale(next)}
                  config={SLIDER_CONFIG.voicevoxIntonationScale}
                  placeholder="例: 1.20（標準は 1.0）"
                />
                <NumberSliderField
                  id="voicevoxVolumeScale"
                  label="Volume Scale"
                  value={voicevoxVolumeScale}
                  onChange={(next) => setVoicevoxVolumeScale(next)}
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
                  value={voicevoxPrePhonemeLength}
                  onChange={(next) => setVoicevoxPrePhonemeLength(next)}
                  config={SLIDER_CONFIG.voicevoxPrePhonemeLength}
                  placeholder="例: 0.12"
                />
                <NumberSliderField
                  id="voicevoxPostPhonemeLength"
                  label="Post-phoneme Length (sec)"
                  value={voicevoxPostPhonemeLength}
                  onChange={(next) => setVoicevoxPostPhonemeLength(next)}
                  config={SLIDER_CONFIG.voicevoxPostPhonemeLength}
                  placeholder="例: 0.08"
                />
                <NumberSliderField
                  id="voicevoxPauseLength"
                  label="Pause Length (sec)"
                  value={voicevoxPauseLength}
                  onChange={(next) => setVoicevoxPauseLength(next)}
                  config={SLIDER_CONFIG.voicevoxPauseLength}
                  placeholder="例: 0.5（空欄で自動）"
                />
                <NumberSliderField
                  id="voicevoxPauseLengthScale"
                  label="Pause Length Scale"
                  value={voicevoxPauseLengthScale}
                  onChange={(next) => setVoicevoxPauseLengthScale(next)}
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
                    value={voicevoxOutputSamplingRate}
                    onChange={(e) =>
                      setVoicevoxOutputSamplingRate(e.target.value)
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
                    value={voicevoxOutputStereo}
                    onChange={(e) =>
                      setVoicevoxOutputStereo(
                        e.target.value as 'default' | 'mono' | 'stereo',
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
                    value={voicevoxEnableKatakanaEnglish}
                    onChange={(e) =>
                      setVoicevoxEnableKatakanaEnglish(
                        e.target.value as 'default' | 'true' | 'false',
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
                    value={voicevoxEnableInterrogativeUpspeak}
                    onChange={(e) =>
                      setVoicevoxEnableInterrogativeUpspeak(
                        e.target.value as 'default' | 'true' | 'false',
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
                    value={voicevoxCoreVersion}
                    onChange={(e) => setVoicevoxCoreVersion(e.target.value)}
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
            <div className="parameter-grid parameter-grid--two parameter-card__grid">
              <div className="form-group">
                <label htmlFor="voicepeakApiKey">API Key</label>
                <input
                  id="voicepeakApiKey"
                  type="password"
                  value=""
                  disabled
                  placeholder="VOICEPEAKはAPIキー不要"
                  title="VOICEPEAKローカルエンジンではAPIキーは不要です"
                />
              </div>
              <div className="form-group">
                <label htmlFor="voicepeakApiUrl">API URL</label>
                <input
                  id="voicepeakApiUrl"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="例: http://localhost:20202"
                />
              </div>
            </div>

            <div className="parameter-section">
              <div className="parameter-section__title">感情・ピッチ</div>
              <div className="parameter-grid">
                <div className="form-group">
                  <label htmlFor="voicepeakEmotion">Emotion Override</label>
                  <select
                    id="voicepeakEmotion"
                    value={voicepeakEmotion}
                    onChange={(e) =>
                      setVoicepeakEmotion(
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
                  value={voicepeakSpeed}
                  onChange={(next) => setVoicepeakSpeed(next)}
                  config={SLIDER_CONFIG.voicepeakSpeed}
                  placeholder="整数のみ（未入力で既定値）"
                />
                <NumberSliderField
                  id="voicepeakPitch"
                  label="Pitch (-300〜300)"
                  value={voicepeakPitch}
                  onChange={(next) => setVoicepeakPitch(next)}
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
                <label htmlFor="aivisCloudApiKey">API Key (required)</label>
                <input
                  id="aivisCloudApiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="例: sk_live_xxxxx"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisCloudModelUuid">
                  Model UUID (override)
                </label>
                <input
                  id="aivisCloudModelUuid"
                  type="text"
                  value={aivisCloudModelUuid}
                  onChange={(e) => setAivisCloudModelUuid(e.target.value)}
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
                    value={aivisCloudSpeakerUuid}
                    onChange={(e) => setAivisCloudSpeakerUuid(e.target.value)}
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
                    value={aivisCloudStyleId}
                    onChange={(e) => setAivisCloudStyleId(e.target.value)}
                    placeholder="スタイルIDを使用する場合"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="aivisCloudStyleName">Style Name</label>
                  <input
                    id="aivisCloudStyleName"
                    type="text"
                    value={aivisCloudStyleName}
                    onChange={(e) => setAivisCloudStyleName(e.target.value)}
                    placeholder="スタイル名を直接指定 (IDと併用不可)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="aivisCloudUseSsml">Use SSML</label>
                  <select
                    id="aivisCloudUseSsml"
                    value={aivisCloudUseSsml}
                    onChange={(e) =>
                      setAivisCloudUseSsml(
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
                    value={aivisCloudLanguage}
                    onChange={(e) => setAivisCloudLanguage(e.target.value)}
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
                  value={aivisCloudSpeakingRate}
                  onChange={(next) => setAivisCloudSpeakingRate(next)}
                  config={SLIDER_CONFIG.aivisCloudSpeakingRate}
                  placeholder="例: 1.05 （0.5〜1.5）"
                />
                <NumberSliderField
                  id="aivisCloudEmotionalIntensity"
                  label="Emotional Intensity"
                  value={aivisCloudEmotionalIntensity}
                  onChange={(next) => setAivisCloudEmotionalIntensity(next)}
                  config={SLIDER_CONFIG.aivisCloudEmotionalIntensity}
                  placeholder="例: 1.2 （0.0〜2.0）"
                />
                <NumberSliderField
                  id="aivisCloudTempoDynamics"
                  label="Tempo Dynamics"
                  value={aivisCloudTempoDynamics}
                  onChange={(next) => setAivisCloudTempoDynamics(next)}
                  config={SLIDER_CONFIG.aivisCloudTempoDynamics}
                  placeholder="話速の緩急（0.0〜2.0）"
                />
                <NumberSliderField
                  id="aivisCloudPitch"
                  label="Pitch"
                  value={aivisCloudPitch}
                  onChange={(next) => setAivisCloudPitch(next)}
                  config={SLIDER_CONFIG.aivisCloudPitch}
                  placeholder="例: 0.10 （-1.0〜1.0）"
                />
                <NumberSliderField
                  id="aivisCloudVolume"
                  label="Volume"
                  value={aivisCloudVolume}
                  onChange={(next) => setAivisCloudVolume(next)}
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
                  value={aivisCloudLeadingSilence}
                  onChange={(next) => setAivisCloudLeadingSilence(next)}
                  config={SLIDER_CONFIG.aivisCloudLeadingSilence}
                  placeholder="先頭無音 0.0〜0.6"
                />
                <NumberSliderField
                  id="aivisCloudTrailingSilence"
                  label="Trailing Silence (sec)"
                  value={aivisCloudTrailingSilence}
                  onChange={(next) => setAivisCloudTrailingSilence(next)}
                  config={SLIDER_CONFIG.aivisCloudTrailingSilence}
                  placeholder="末尾無音 0.0〜0.6"
                />
                <NumberSliderField
                  id="aivisCloudLineBreakSilence"
                  label="Line Break Silence (sec)"
                  value={aivisCloudLineBreakSilence}
                  onChange={(next) => setAivisCloudLineBreakSilence(next)}
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
                    value={aivisCloudOutputFormat}
                    onChange={(e) =>
                      setAivisCloudOutputFormat(
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
                    value={aivisCloudOutputBitrate}
                    onChange={(e) => setAivisCloudOutputBitrate(e.target.value)}
                    placeholder="例: 192 （mp3/aac/opus のみ）"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="aivisCloudOutputSamplingRate">
                    Output Sampling Rate
                  </label>
                  <select
                    id="aivisCloudOutputSamplingRate"
                    value={aivisCloudOutputSamplingRate}
                    onChange={(e) =>
                      setAivisCloudOutputSamplingRate(
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
                    value={aivisCloudOutputChannels}
                    onChange={(e) =>
                      setAivisCloudOutputChannels(
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
                    value={aivisCloudUserDictionaryUuid}
                    onChange={(e) =>
                      setAivisCloudUserDictionaryUuid(e.target.value)
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
                    value={aivisCloudEnableBillingLogs}
                    onChange={(e) =>
                      setAivisCloudEnableBillingLogs(
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
            <div className="parameter-grid parameter-grid--two parameter-card__grid">
              <div className="form-group">
                <label htmlFor="aivisApiKey">API Key (optional)</label>
                <input
                  id="aivisApiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="APIキーは不要です"
                  disabled
                  title="AivisSpeechローカルエンジンではAPIキーは不要です"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aivisApiUrl">API URL (customizable)</label>
                <input
                  id="aivisApiUrl"
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="例: http://localhost:10101"
                />
              </div>
            </div>

            <div className="parameter-section">
              <div className="parameter-section__title">話速・ピッチ</div>
              <div className="parameter-grid">
                <NumberSliderField
                  id="aivisSpeedScale"
                  label="Speed Scale"
                  value={aivisSpeedScale}
                  onChange={(next) => setAivisSpeedScale(next)}
                  config={SLIDER_CONFIG.aivisSpeedScale}
                  placeholder="例: 1.10（標準は 1.0）"
                />
                <NumberSliderField
                  id="aivisPitchScale"
                  label="Pitch Scale"
                  value={aivisPitchScale}
                  onChange={(next) => setAivisPitchScale(next)}
                  config={SLIDER_CONFIG.aivisPitchScale}
                  placeholder="例: 0.15（標準は 0.0）"
                />
                <NumberSliderField
                  id="aivisIntonationScale"
                  label="Intonation Scale"
                  value={aivisIntonationScale}
                  onChange={(next) => setAivisIntonationScale(next)}
                  config={SLIDER_CONFIG.aivisIntonationScale}
                  placeholder="例: 1.20（標準は 1.0）"
                />
                <NumberSliderField
                  id="aivisTempoDynamicsScale"
                  label="Tempo Dynamics Scale"
                  value={aivisTempoDynamicsScale}
                  onChange={(next) => setAivisTempoDynamicsScale(next)}
                  config={SLIDER_CONFIG.aivisTempoDynamicsScale}
                  placeholder="例: 1.10（標準は 1.0）"
                />
                <NumberSliderField
                  id="aivisVolumeScale"
                  label="Volume Scale"
                  value={aivisVolumeScale}
                  onChange={(next) => setAivisVolumeScale(next)}
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
                  value={aivisPrePhonemeLength}
                  onChange={(next) => setAivisPrePhonemeLength(next)}
                  config={SLIDER_CONFIG.aivisPrePhonemeLength}
                  placeholder="例: 0.12"
                />
                <NumberSliderField
                  id="aivisPostPhonemeLength"
                  label="Post-phoneme Length (sec)"
                  value={aivisPostPhonemeLength}
                  onChange={(next) => setAivisPostPhonemeLength(next)}
                  config={SLIDER_CONFIG.aivisPostPhonemeLength}
                  placeholder="例: 0.08"
                />
                <NumberSliderField
                  id="aivisPauseLength"
                  label="Pause Length (sec)"
                  value={aivisPauseLength}
                  onChange={(next) => setAivisPauseLength(next)}
                  config={SLIDER_CONFIG.aivisPauseLength}
                  placeholder="例: 0.5（空欄で自動）"
                />
                <NumberSliderField
                  id="aivisPauseLengthScale"
                  label="Pause Length Scale"
                  value={aivisPauseLengthScale}
                  onChange={(next) => setAivisPauseLengthScale(next)}
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
                    value={aivisOutputSamplingRate}
                    onChange={(e) => setAivisOutputSamplingRate(e.target.value)}
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
                    value={aivisOutputStereo}
                    onChange={(e) =>
                      setAivisOutputStereo(
                        e.target.value as 'default' | 'mono' | 'stereo',
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
                value={minimaxModel}
                onChange={(e) =>
                  setMinimaxModel(e.target.value as MinimaxModel)
                }
              >
                {Object.entries(MINIMAX_MODELS).map(([model, description]) => (
                  <option key={model} value={model}>
                    {model} - {description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="minimaxVoiceId">Voice ID:</label>
              <select
                id="minimaxVoiceId"
                value={minimaxVoiceId}
                onChange={(e) => setMinimaxVoiceId(e.target.value)}
              >
                {Object.entries(MINIMAX_VOICES).map(
                  ([voiceId, description]) => (
                    <option key={voiceId} value={voiceId}>
                      {description}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="minimaxApiKey">MiniMax API Key (required):</label>
              <input
                id="minimaxApiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={defaults.placeholder}
              />
            </div>

            <div className="form-group">
              <label htmlFor="minimaxGroupId">
                MiniMax Group ID (required):
              </label>
              <input
                id="minimaxGroupId"
                type="password"
                value={minimaxGroupId}
                onChange={(e) => setMinimaxGroupId(e.target.value)}
                placeholder={
                  (defaults as any).groupIdPlaceholder || 'Your Group ID'
                }
              />
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
                  value={minimaxLanguageBoost}
                  onChange={(e) => setMinimaxLanguageBoost(e.target.value)}
                  placeholder="e.g. Japanese"
                />
              </div>

              <div className="grid">
                <NumberSliderField
                  id="minimaxSpeed"
                  label="Speed (1.0 = default)"
                  value={minimaxSpeed}
                  onChange={(next) => setMinimaxSpeed(next)}
                  config={SLIDER_CONFIG.minimaxSpeed}
                  placeholder="Auto"
                />
                <NumberSliderField
                  id="minimaxVolume"
                  label="Volume (1.0 = default)"
                  value={minimaxVolume}
                  onChange={(next) => setMinimaxVolume(next)}
                  config={SLIDER_CONFIG.minimaxVolume}
                  placeholder="Auto"
                />
                <NumberSliderField
                  id="minimaxPitch"
                  label="Pitch (semitones)"
                  value={minimaxPitch}
                  onChange={(next) => setMinimaxPitch(next)}
                  config={SLIDER_CONFIG.minimaxPitch}
                  placeholder="Auto"
                />
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="minimaxSampleRate">Sample Rate:</label>
                  <select
                    id="minimaxSampleRate"
                    value={minimaxSampleRate}
                    onChange={(e) => setMinimaxSampleRate(e.target.value)}
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
                    value={minimaxBitrate}
                    onChange={(e) => setMinimaxBitrate(e.target.value)}
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
                    value={minimaxAudioFormat}
                    onChange={(e) =>
                      setMinimaxAudioFormat(
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
                    value={minimaxAudioChannel}
                    onChange={(e) =>
                      setMinimaxAudioChannel(e.target.value === '2' ? '2' : '1')
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

        {engine !== 'minimax' &&
          engine !== 'voicevox' &&
          engine !== 'aivisSpeech' &&
          engine !== 'voicepeak' && (
            <div className="form-group">
              <label htmlFor="apiKey">
                API Key {defaults.needsApiKey ? '(required)' : '(optional)'}:
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={defaults.placeholder}
                disabled={!defaults.acceptsApiKey}
                style={{
                  backgroundColor: defaults.acceptsApiKey
                    ? undefined
                    : 'rgba(0,0,0,0.1)',
                  opacity: defaults.acceptsApiKey ? 1 : 0.5,
                }}
              />
            </div>
          )}

        {engine !== 'voicevox' &&
          engine !== 'aivisSpeech' &&
          engine !== 'voicepeak' && (
            <div className="form-group">
              <label htmlFor="apiUrl">API URL (customizable):</label>
              <input
                id="apiUrl"
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Default will be set based on selected engine"
              />
            </div>
          )}

        <div className="form-group">
          <label htmlFor="text">Text to speak:</label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to speak..."
          />
        </div>

        <div className="button-group">
          <button
            type="button"
            onClick={speak}
            disabled={isPlaying}
            style={{ opacity: isPlaying ? 0.5 : 1 }}
          >
            🔊 {isPlaying ? 'Speaking...' : 'Speak'}
          </button>
          <button
            type="button"
            onClick={stopSpeaking}
            disabled={!isPlaying}
            style={{ opacity: !isPlaying ? 0.5 : 1 }}
          >
            ⏹ Stop
          </button>
        </div>

        <div className={`status ${statusType}`}>{status}</div>
        {engine === 'minimax' ? (
          <p className="helper-text">
            ※ MiniMax では速度・音量・ピッチ・音質パラメータを自由に調整できます
          </p>
        ) : engine === 'voicevox' ? (
          <p className="helper-text">
            ※ VOICEVOX では話速や抑揚・無音長などをカード内で細かく指定できます
          </p>
        ) : engine === 'aivisCloud' ? (
          <p className="helper-text">
            ※ Aivis Cloud ではモデル UUID
            とパラメータ群を任意に指定できます。未入力フィールドはクラウド側の既定値が利用されます
          </p>
        ) : engine === 'aivisSpeech' ? (
          <p className="helper-text">
            ※ AivisSpeech
            では感情の強さ（Intonation）やテンポ緩急など独自パラメータを設定できます
          </p>
        ) : (
          <p className="helper-text">
            ※ その他のエンジンでは推奨パラメータが自動的に適用されます
          </p>
        )}
      </div>

      <div className="card">
        <h2>💡 Benefits of React Example</h2>
        <ul>
          <li>
            ✅ <strong>No CORS issues</strong> - Vite handles module resolution
          </li>
          <li>
            ✅ <strong>No .js extension problems</strong> - Bundler resolves
            imports automatically
          </li>
          <li>
            ✅ <strong>Hot reload</strong> - Fast development experience
          </li>
          <li>
            ✅ <strong>TypeScript support</strong> - Full type safety
          </li>
          <li>
            ✅ <strong>Modern development</strong> - Familiar React + Vite
            workflow
          </li>
          <li>
            ✅ <strong>Production ready</strong> - Can be built and deployed
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>🌟 Engine Comparison</h2>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          }}
        >
          <div>
            <h3>🔴 Local Engines</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                <strong>VOICEVOX</strong> - Free, high-quality Japanese TTS
              </li>
              <li>
                <strong>AivisSpeech</strong> - Local Aivis engine
              </li>
              <li>
                <strong>VOICEPEAK</strong> - Commercial local TTS
              </li>
            </ul>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              ⚠️ Requires local server setup
            </p>
          </div>
          <div>
            <h3>☁️ Cloud APIs</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                <strong>OpenAI TTS</strong> - English & multilingual
              </li>
              <li>
                <strong>Aivis Cloud</strong> - High-quality Japanese, SSML
                support
              </li>
              <li>
                <strong>MiniMax</strong> - Multilingual with emotions
              </li>
            </ul>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              ✅ No setup required, just API key
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
