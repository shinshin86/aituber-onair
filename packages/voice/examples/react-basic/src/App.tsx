import { useState, useEffect } from 'react';
import {
  VoiceEngineAdapter,
  type VoiceServiceOptions,
} from '@aituber-onair/voice';
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
    placeholder: 'apiKey:groupId',
    speaker: 'male-qn-qingse',
  },
} as const;

type EngineType = keyof typeof ENGINE_DEFAULTS;

function App() {
  const [engine, setEngine] = useState<EngineType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
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

    if (defaults.needsApiKey && !apiKey) {
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
        speaker: defaults.speaker,
        onComplete: () => {
          setIsPlaying(false);
          setStatus('Playback completed');
          setStatusType('success');
        },
      };

      // Add API key if provided
      if (apiKey) {
        if (engine === 'minimax') {
          // For MiniMax, the API key format is "apiKey:groupId"
          const [key, groupId] = apiKey.split(':');
          if (groupId) {
            options.apiKey = key;
            options.minimaxGroupId = groupId;
          } else {
            throw new Error('MiniMax requires format: apiKey:groupId');
          }
        } else {
          options.apiKey = apiKey;
        }
      }

      // Add API URL if provided
      if (apiUrl) {
        options.apiUrl = apiUrl;
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
            <option value="aivisSpeech">AivisSpeech</option>
            <option value="voicepeak">VOICEPEAK</option>
            <option value="nijivoice">にじボイス</option>
            <option value="minimax">MiniMax</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">
            API Key {defaults.needsApiKey ? '(required)' : '(optional)'}:
          </label>
          <input
            id="apiKey"
            type="text"
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
            onClick={speak}
            disabled={isPlaying}
            style={{ opacity: isPlaying ? 0.5 : 1 }}
          >
            🔊 {isPlaying ? 'Speaking...' : 'Speak'}
          </button>
          <button
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
    </div>
  );
}

export default App;
