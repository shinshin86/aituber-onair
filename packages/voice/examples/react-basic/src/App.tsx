import {
  VoiceEngineAdapter,
  type AivisSpeechQueryParameterOverrides,
  type MinimaxAudioFormat,
  type MinimaxModel,
  type VoiceServiceOptions,
  type VoiceVoxQueryParameterOverrides,
  type XaiBitRate,
  type XaiCodec,
  type XaiSampleRate,
} from '@aituber-onair/voice';
import { useEffect, useState } from 'react';
import './App.css';
import { EngineParameters } from './components/EngineParameters';
import { EngineSelector } from './components/EngineSelector';
import { SpeakControls } from './components/SpeakControls';
import {
  ENGINE_DEFAULTS,
  type AivisCloudBooleanOption,
  type AivisCloudOutputChannelOption,
  type AivisCloudOutputFormatOption,
  type AivisCloudOutputSamplingRateOption,
  type DefaultBooleanOption,
  type EngineType,
  type LocalOutputSamplingRateOption,
  type OutputStereoOption,
  type SpeakerOption,
  type VoicePeakEmotionOption,
} from './constants';

interface VoicevoxSpeakerStyleResponse {
  id: number;
  name: string;
}

interface VoicevoxSpeakerResponse {
  name: string;
  styles: VoicevoxSpeakerStyleResponse[];
}

interface MinimaxSpeakerResponse {
  voice_id: string;
  voice_name: string;
  gender?: string;
  language?: string;
}

interface MinimaxSpeakerListResponse {
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
  data?: {
    speakers?: MinimaxSpeakerResponse[];
  };
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

function App() {
  const [engine, setEngine] = useState<EngineType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [minimaxGroupId, setMinimaxGroupId] = useState('');
  const [speaker, setSpeaker] = useState<string>(
    String(ENGINE_DEFAULTS.openai.speaker),
  );
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
    useState<LocalOutputSamplingRateOption>('default');
  const [voicevoxOutputStereo, setVoicevoxOutputStereo] =
    useState<OutputStereoOption>('default');
  const [voicevoxEnableKatakanaEnglish, setVoicevoxEnableKatakanaEnglish] =
    useState<DefaultBooleanOption>('default');
  const [
    voicevoxEnableInterrogativeUpspeak,
    setVoicevoxEnableInterrogativeUpspeak,
  ] = useState<DefaultBooleanOption>('default');
  const [voicevoxCoreVersion, setVoicevoxCoreVersion] = useState('');
  const [voicepeakEmotion, setVoicepeakEmotion] =
    useState<VoicePeakEmotionOption>('neutral');
  const [voicepeakSpeed, setVoicepeakSpeed] = useState('');
  const [voicepeakPitch, setVoicepeakPitch] = useState('');
  const [openaiSpeed, setOpenaiSpeed] = useState('');
  const [xaiLanguage, setXaiLanguage] = useState(
    ENGINE_DEFAULTS.xai.defaultLanguage,
  );
  const [xaiCodec, setXaiCodec] = useState<XaiCodec>(
    ENGINE_DEFAULTS.xai.defaultCodec,
  );
  const [xaiSampleRate, setXaiSampleRate] = useState<`${XaiSampleRate}`>(
    String(ENGINE_DEFAULTS.xai.defaultSampleRate) as `${XaiSampleRate}`,
  );
  const [xaiBitRate, setXaiBitRate] = useState<`${XaiBitRate}`>(
    String(ENGINE_DEFAULTS.xai.defaultBitRate) as `${XaiBitRate}`,
  );
  const [openaiCompatibleModel, setOpenaiCompatibleModel] = useState('');
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
    useState<LocalOutputSamplingRateOption>('default');
  const [aivisOutputStereo, setAivisOutputStereo] =
    useState<OutputStereoOption>('default');
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
  const [speakerOptions, setSpeakerOptions] = useState<SpeakerOption[]>([]);
  const [isFetchingSpeakers, setIsFetchingSpeakers] = useState(false);
  const [speakerFetchError, setSpeakerFetchError] = useState<string | null>(
    null,
  );
  const [voiceService, setVoiceService] = useState<VoiceEngineAdapter | null>(
    null,
  );

  useEffect(() => {
    const defaults = ENGINE_DEFAULTS[engine];
    const minimaxDefaults = ENGINE_DEFAULTS.minimax;
    setApiUrl(defaults.apiUrl);
    setSpeaker(String(defaults.speaker));
    setApiKey('');
    setMinimaxGroupId('');
    setMinimaxModel(minimaxDefaults.defaultModel);
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
    setXaiLanguage(ENGINE_DEFAULTS.xai.defaultLanguage);
    setXaiCodec(ENGINE_DEFAULTS.xai.defaultCodec);
    setXaiSampleRate(
      String(ENGINE_DEFAULTS.xai.defaultSampleRate) as `${XaiSampleRate}`,
    );
    setXaiBitRate(
      String(ENGINE_DEFAULTS.xai.defaultBitRate) as `${XaiBitRate}`,
    );
    setOpenaiCompatibleModel('');
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
    setSpeakerOptions([]);
    setIsFetchingSpeakers(false);
    setSpeakerFetchError(null);
    setStatus(`Switched to ${engine}. Default URL: ${defaults.apiUrl}`);
    setStatusType('success');
  }, [engine]);

  const fetchSpeakers = async () => {
    if (
      engine !== 'voicevox' &&
      engine !== 'aivisSpeech' &&
      engine !== 'minimax'
    ) {
      return;
    }

    setIsFetchingSpeakers(true);
    setSpeakerFetchError(null);

    try {
      let nextSpeakerOptions: SpeakerOption[] = [];

      if (engine === 'voicevox' || engine === 'aivisSpeech') {
        const normalizedApiUrl = trimTrailingSlash(apiUrl.trim());

        if (!normalizedApiUrl) {
          throw new Error('API URL is required');
        }

        const response = await fetch(`${normalizedApiUrl}/speakers`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch speakers: ${response.status} ${response.statusText}`,
          );
        }

        const speakers = (await response.json()) as VoicevoxSpeakerResponse[];
        nextSpeakerOptions = speakers.flatMap((voice) =>
          voice.styles.map((style) => ({
            id: String(style.id),
            label: `${voice.name} - ${style.name}`,
          })),
        );
      } else {
        const trimmedApiKey = apiKey.trim();

        if (!trimmedApiKey) {
          throw new Error('MiniMax API key is required');
        }

        const response = await fetch(
          'https://api.minimax.io/v1/query/tts_speakers',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${trimmedApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            errorText
              ? `Failed to fetch speakers: ${response.status} - ${errorText}`
              : `Failed to fetch speakers: ${response.status} ${response.statusText}`,
          );
        }

        const result = (await response.json()) as MinimaxSpeakerListResponse;

        if (
          result.base_resp?.status_code !== undefined &&
          result.base_resp.status_code !== 0
        ) {
          const statusMessage = result.base_resp.status_msg ?? 'Unknown error';
          throw new Error(
            `MiniMax API error: ${result.base_resp.status_code} - ${statusMessage}`,
          );
        }

        nextSpeakerOptions = (result.data?.speakers ?? []).map((voice) => ({
          id: voice.voice_id,
          label: voice.gender
            ? `${voice.voice_name} (${voice.gender})`
            : voice.voice_name,
        }));
      }

      if (nextSpeakerOptions.length === 0) {
        throw new Error('No speakers found');
      }

      setSpeakerOptions(nextSpeakerOptions);
      setSpeaker(nextSpeakerOptions[0].id);
    } catch (error) {
      console.error('Failed to fetch speaker list:', error);
      setSpeakerFetchError(
        error instanceof Error ? error.message : 'Failed to fetch speakers',
      );
    } finally {
      setIsFetchingSpeakers(false);
    }
  };

  const speak = async () => {
    if (!text) {
      setStatus('Please enter some text to speak');
      setStatusType('error');
      return;
    }

    const defaults = ENGINE_DEFAULTS[engine];
    const apiKeyIsRequired =
      engine !== 'openaiCompatible' && defaults.needsApiKey;

    if (engine === 'minimax') {
      if (!apiKey || !minimaxGroupId) {
        setStatus('Both API key and Group ID are required for MiniMax');
        setStatusType('error');
        return;
      }
    } else if (apiKeyIsRequired && !apiKey) {
      setStatus(`API key is required for ${engine}`);
      setStatusType('error');
      return;
    }

    if (engine === 'openaiCompatible' && !openaiCompatibleModel.trim()) {
      setStatus('Model is required for openaiCompatible');
      setStatusType('error');
      return;
    }

    if (
      (engine === 'voicevox' ||
        engine === 'aivisSpeech' ||
        engine === 'minimax') &&
      !speaker.trim()
    ) {
      setStatus('話者一覧を取得してSpeakerを選択してください');
      setStatusType('error');
      return;
    }

    setIsPlaying(true);
    setStatus('Initializing voice service...');
    setStatusType('info');

    try {
      const options: {
        engineType: EngineType;
        speaker: string;
        apiKey?: string;
        onComplete: () => void;
        [key: string]: unknown;
      } = {
        engineType: engine,
        speaker,
        onComplete: () => {
          setIsPlaying(false);
          setStatus('Playback completed');
          setStatusType('success');
        },
      };

      if (apiKey) {
        options.apiKey = apiKey;
      }

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
      } else if (engine === 'xai') {
        if (xaiLanguage.trim()) {
          options.xaiLanguage = xaiLanguage.trim();
        }

        options.xaiCodec = xaiCodec;
        options.xaiSampleRate = Number(xaiSampleRate) as XaiSampleRate;

        if (xaiCodec === 'mp3') {
          options.xaiBitRate = Number(xaiBitRate) as XaiBitRate;
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

      if (apiUrl) {
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
        }
      }

      const service = new VoiceEngineAdapter(options as VoiceServiceOptions);
      setVoiceService(service);

      setStatus('Generating speech...');
      setStatusType('info');

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
  const apiKeyIsRequired =
    engine !== 'openaiCompatible' && defaults.needsApiKey;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-title">AITuber OnAir Voice</div>
          <div className="brand-subtitle">
            サンプルUI - 各TTSエンジンの音声合成デモ
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-stack">
          <div className="card">
            <EngineSelector
              engine={engine}
              onEngineChange={setEngine}
              speaker={speaker}
              onSpeakerChange={setSpeaker}
              speakerOptions={speakerOptions}
              isFetchingSpeakers={isFetchingSpeakers}
              speakerFetchError={speakerFetchError}
              onFetchSpeakers={fetchSpeakers}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              apiUrl={apiUrl}
              onApiUrlChange={setApiUrl}
              minimaxGroupId={minimaxGroupId}
              onMinimaxGroupIdChange={setMinimaxGroupId}
              apiKeyIsRequired={apiKeyIsRequired}
            >
              <EngineParameters
                engine={engine}
                openai={{
                  speed: { value: openaiSpeed, onChange: setOpenaiSpeed },
                }}
                xai={{
                  language: { value: xaiLanguage, onChange: setXaiLanguage },
                  codec: { value: xaiCodec, onChange: setXaiCodec },
                  sampleRate: {
                    value: xaiSampleRate,
                    onChange: setXaiSampleRate,
                  },
                  bitRate: {
                    value: xaiBitRate,
                    onChange: setXaiBitRate,
                  },
                }}
                openaiCompatible={{
                  model: {
                    value: openaiCompatibleModel,
                    onChange: setOpenaiCompatibleModel,
                  },
                  speed: { value: openaiSpeed, onChange: setOpenaiSpeed },
                }}
                voicevox={{
                  speedScale: {
                    value: voicevoxSpeedScale,
                    onChange: setVoicevoxSpeedScale,
                  },
                  pitchScale: {
                    value: voicevoxPitchScale,
                    onChange: setVoicevoxPitchScale,
                  },
                  intonationScale: {
                    value: voicevoxIntonationScale,
                    onChange: setVoicevoxIntonationScale,
                  },
                  volumeScale: {
                    value: voicevoxVolumeScale,
                    onChange: setVoicevoxVolumeScale,
                  },
                  prePhonemeLength: {
                    value: voicevoxPrePhonemeLength,
                    onChange: setVoicevoxPrePhonemeLength,
                  },
                  postPhonemeLength: {
                    value: voicevoxPostPhonemeLength,
                    onChange: setVoicevoxPostPhonemeLength,
                  },
                  pauseLength: {
                    value: voicevoxPauseLength,
                    onChange: setVoicevoxPauseLength,
                  },
                  pauseLengthScale: {
                    value: voicevoxPauseLengthScale,
                    onChange: setVoicevoxPauseLengthScale,
                  },
                  outputSamplingRate: {
                    value: voicevoxOutputSamplingRate,
                    onChange: setVoicevoxOutputSamplingRate,
                  },
                  outputStereo: {
                    value: voicevoxOutputStereo,
                    onChange: setVoicevoxOutputStereo,
                  },
                  enableKatakanaEnglish: {
                    value: voicevoxEnableKatakanaEnglish,
                    onChange: setVoicevoxEnableKatakanaEnglish,
                  },
                  enableInterrogativeUpspeak: {
                    value: voicevoxEnableInterrogativeUpspeak,
                    onChange: setVoicevoxEnableInterrogativeUpspeak,
                  },
                  coreVersion: {
                    value: voicevoxCoreVersion,
                    onChange: setVoicevoxCoreVersion,
                  },
                }}
                voicepeak={{
                  emotion: {
                    value: voicepeakEmotion,
                    onChange: setVoicepeakEmotion,
                  },
                  speed: { value: voicepeakSpeed, onChange: setVoicepeakSpeed },
                  pitch: { value: voicepeakPitch, onChange: setVoicepeakPitch },
                }}
                aivisCloud={{
                  modelUuid: {
                    value: aivisCloudModelUuid,
                    onChange: setAivisCloudModelUuid,
                  },
                  speakerUuid: {
                    value: aivisCloudSpeakerUuid,
                    onChange: setAivisCloudSpeakerUuid,
                  },
                  styleId: {
                    value: aivisCloudStyleId,
                    onChange: setAivisCloudStyleId,
                  },
                  styleName: {
                    value: aivisCloudStyleName,
                    onChange: setAivisCloudStyleName,
                  },
                  useSsml: {
                    value: aivisCloudUseSsml,
                    onChange: setAivisCloudUseSsml,
                  },
                  language: {
                    value: aivisCloudLanguage,
                    onChange: setAivisCloudLanguage,
                  },
                  speakingRate: {
                    value: aivisCloudSpeakingRate,
                    onChange: setAivisCloudSpeakingRate,
                  },
                  emotionalIntensity: {
                    value: aivisCloudEmotionalIntensity,
                    onChange: setAivisCloudEmotionalIntensity,
                  },
                  tempoDynamics: {
                    value: aivisCloudTempoDynamics,
                    onChange: setAivisCloudTempoDynamics,
                  },
                  pitch: {
                    value: aivisCloudPitch,
                    onChange: setAivisCloudPitch,
                  },
                  volume: {
                    value: aivisCloudVolume,
                    onChange: setAivisCloudVolume,
                  },
                  leadingSilence: {
                    value: aivisCloudLeadingSilence,
                    onChange: setAivisCloudLeadingSilence,
                  },
                  trailingSilence: {
                    value: aivisCloudTrailingSilence,
                    onChange: setAivisCloudTrailingSilence,
                  },
                  lineBreakSilence: {
                    value: aivisCloudLineBreakSilence,
                    onChange: setAivisCloudLineBreakSilence,
                  },
                  outputFormat: {
                    value: aivisCloudOutputFormat,
                    onChange: setAivisCloudOutputFormat,
                  },
                  outputBitrate: {
                    value: aivisCloudOutputBitrate,
                    onChange: setAivisCloudOutputBitrate,
                  },
                  outputSamplingRate: {
                    value: aivisCloudOutputSamplingRate,
                    onChange: setAivisCloudOutputSamplingRate,
                  },
                  outputChannels: {
                    value: aivisCloudOutputChannels,
                    onChange: setAivisCloudOutputChannels,
                  },
                  userDictionaryUuid: {
                    value: aivisCloudUserDictionaryUuid,
                    onChange: setAivisCloudUserDictionaryUuid,
                  },
                  enableBillingLogs: {
                    value: aivisCloudEnableBillingLogs,
                    onChange: setAivisCloudEnableBillingLogs,
                  },
                }}
                aivisSpeech={{
                  speedScale: {
                    value: aivisSpeedScale,
                    onChange: setAivisSpeedScale,
                  },
                  pitchScale: {
                    value: aivisPitchScale,
                    onChange: setAivisPitchScale,
                  },
                  intonationScale: {
                    value: aivisIntonationScale,
                    onChange: setAivisIntonationScale,
                  },
                  tempoDynamicsScale: {
                    value: aivisTempoDynamicsScale,
                    onChange: setAivisTempoDynamicsScale,
                  },
                  volumeScale: {
                    value: aivisVolumeScale,
                    onChange: setAivisVolumeScale,
                  },
                  prePhonemeLength: {
                    value: aivisPrePhonemeLength,
                    onChange: setAivisPrePhonemeLength,
                  },
                  postPhonemeLength: {
                    value: aivisPostPhonemeLength,
                    onChange: setAivisPostPhonemeLength,
                  },
                  pauseLength: {
                    value: aivisPauseLength,
                    onChange: setAivisPauseLength,
                  },
                  pauseLengthScale: {
                    value: aivisPauseLengthScale,
                    onChange: setAivisPauseLengthScale,
                  },
                  outputSamplingRate: {
                    value: aivisOutputSamplingRate,
                    onChange: setAivisOutputSamplingRate,
                  },
                  outputStereo: {
                    value: aivisOutputStereo,
                    onChange: setAivisOutputStereo,
                  },
                }}
                minimax={{
                  model: { value: minimaxModel, onChange: setMinimaxModel },
                  languageBoost: {
                    value: minimaxLanguageBoost,
                    onChange: setMinimaxLanguageBoost,
                  },
                  speed: { value: minimaxSpeed, onChange: setMinimaxSpeed },
                  volume: { value: minimaxVolume, onChange: setMinimaxVolume },
                  pitch: { value: minimaxPitch, onChange: setMinimaxPitch },
                  sampleRate: {
                    value: minimaxSampleRate,
                    onChange: setMinimaxSampleRate,
                  },
                  bitrate: {
                    value: minimaxBitrate,
                    onChange: setMinimaxBitrate,
                  },
                  audioFormat: {
                    value: minimaxAudioFormat,
                    onChange: setMinimaxAudioFormat,
                  },
                  audioChannel: {
                    value: minimaxAudioChannel,
                    onChange: setMinimaxAudioChannel,
                  },
                }}
              />
            </EngineSelector>

            <SpeakControls
              text={text}
              onTextChange={setText}
              isPlaying={isPlaying}
              onSpeak={speak}
              onStop={stopSpeaking}
              status={status}
              statusType={statusType}
              engine={engine}
            />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Powered by @aituber-onair/voice |{' '}
          <a
            href="https://github.com/shinshin86/aituber-onair/tree/main/packages/voice"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
