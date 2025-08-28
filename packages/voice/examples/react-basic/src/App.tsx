import {
  VoiceEngineAdapter,
  type VoiceServiceOptions,
  type MinimaxModel,
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
