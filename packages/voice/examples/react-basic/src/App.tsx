import {
  VoiceEngineAdapter,
  type VoiceServiceOptions,
  type MinimaxModel,
  type MinimaxAudioFormat,
} from '@aituber-onair/voice';
import { useEffect, useState } from 'react';
import './App.css';

// Engine defaults
const ENGINE_DEFAULTS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/audio/speech',
    needsApiKey: true,
    placeholder: 'sk-...',
    speaker: 'alloy',
  },
  voicevox: {
    apiUrl: 'http://localhost:50021',
    needsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 1,
  },
  aivisSpeech: {
    apiUrl: 'http://localhost:10101',
    needsApiKey: false,
    placeholder: 'No API key needed',
    speaker: '888753760',
  },
  aivisCloud: {
    apiUrl: 'https://api.aivis-project.com/v1/tts/synthesize',
    needsApiKey: true,
    placeholder: 'Your Aivis Cloud API key',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
  },
  voicepeak: {
    apiUrl: 'http://localhost:20202',
    needsApiKey: false,
    placeholder: 'No API key needed',
    speaker: 'f1',
  },
  nijivoice: {
    apiUrl: 'https://api.nijivoice.com/api/platform/v1',
    needsApiKey: true,
    placeholder: 'Your NijiVoice API key',
    speaker: '56bb72e9-62f4-49d9-b57f-e86da9de7730',
  },
  minimax: {
    apiUrl: 'https://api.minimax.io/v1/t2a_v2',
    needsApiKey: true,
    placeholder: 'Your MiniMax API key',
    groupIdPlaceholder: 'Your Group ID',
    speaker: 'male-qn-qingse',
    defaultModel: 'speech-2.5-hd-preview' as MinimaxModel,
  },
} as const;

// MiniMax model options with descriptions
const MINIMAX_MODELS: Record<MinimaxModel, string> = {
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

type EngineType = keyof typeof ENGINE_DEFAULTS;

function App() {
  const [engine, setEngine] = useState<EngineType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [minimaxGroupId, setMinimaxGroupId] = useState('');
  const [minimaxVoiceId, setMinimaxVoiceId] = useState('male-qn-qingse');
  const [apiUrl, setApiUrl] = useState('');
  const [minimaxModel, setMinimaxModel] = useState<MinimaxModel>(
    'speech-2.5-hd-preview',
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
    setApiUrl(defaults.apiUrl);
    setApiKey('');
    setMinimaxGroupId('');
    setMinimaxVoiceId(
      engine === 'minimax' ? defaults.speaker : 'male-qn-qingse',
    );
    setMinimaxModel(
      engine === 'minimax' ? defaults.defaultModel : 'speech-2.5-hd-preview',
    );
    setMinimaxLanguageBoost('Japanese');
    setMinimaxSpeed('');
    setMinimaxVolume('');
    setMinimaxPitch('');
    setMinimaxSampleRate('32000');
    setMinimaxBitrate('128000');
    setMinimaxAudioFormat('mp3');
    setMinimaxAudioChannel('1');
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
      const options: VoiceServiceOptions = {
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
          case 'aivisSpeech':
            options.aivisSpeechApiUrl = apiUrl;
            break;
          // For cloud services, the API URL is typically fixed
          // but we can still allow override if needed
        }
      }

      // Create or reuse voice service
      const service = new VoiceEngineAdapter(options);
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
            <option value="voicevox">VOICEVOX</option>
            <option value="aivisSpeech">AivisSpeech (Local)</option>
            <option value="aivisCloud">Aivis Cloud API</option>
            <option value="voicepeak">VOICEPEAK</option>
            <option value="nijivoice">にじボイス</option>
            <option value="minimax">MiniMax</option>
          </select>
        </div>

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

            <div className="advanced-card">
              <h3>MiniMax Voice Parameters</h3>

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
                <div className="form-group">
                  <label htmlFor="minimaxSpeed">Speed (1.0 = default):</label>
                  <input
                    id="minimaxSpeed"
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="3.0"
                    value={minimaxSpeed}
                    onChange={(e) => setMinimaxSpeed(e.target.value)}
                    placeholder="Auto"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="minimaxVolume">Volume (1.0 = default):</label>
                  <input
                    id="minimaxVolume"
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="3.0"
                    value={minimaxVolume}
                    onChange={(e) => setMinimaxVolume(e.target.value)}
                    placeholder="Auto"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="minimaxPitch">Pitch (semitones):</label>
                  <input
                    id="minimaxPitch"
                    type="number"
                    step="1"
                    min="-12"
                    max="12"
                    value={minimaxPitch}
                    onChange={(e) => setMinimaxPitch(e.target.value)}
                    placeholder="Auto"
                  />
                </div>
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
            </div>
          </>
        )}

        {engine !== 'minimax' && (
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
              disabled={!defaults.needsApiKey}
              style={{
                backgroundColor: defaults.needsApiKey
                  ? undefined
                  : 'rgba(0,0,0,0.1)',
                opacity: defaults.needsApiKey ? 1 : 0.5,
              }}
            />
          </div>
        )}

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
                <strong>にじボイス</strong> - Character voices
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
