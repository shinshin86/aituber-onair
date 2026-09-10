import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { VoiceEngineAdapter } from '@aituber-onair/voice';
import './style.css';

const API = 'http://127.0.0.1:8000';
const MODEL = 'mlx-community/Irodori-TTS-500M-v3-8bit';

function App() {
  const [text, setText] = useState('こんにちは。');
  const [voices, setVoices] = useState<string[]>([]);
  const [speaker, setSpeaker] = useState('');
  const [speed, setSpeed] = useState(1.0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('my-speaker');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [gpuBusy, setGpuBusy] = useState(false);
  const [phase, setPhase] = useState('待機中');
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const context = useRef<AudioContext>();
  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      try {
        const response = await fetch(`${API}/health`, {
          signal: AbortSignal.timeout(1500),
        });
        const health = await response.json();
        if (disposed) return;
        setReady(health.status === 'ready');
        setGpuBusy(health.busy);
        if (health.error) setError(health.error);
        if (health.status === 'ready') {
          const response = await fetch(`${API}/voices`, {
            signal: AbortSignal.timeout(1500),
          });
          const data = await response.json();
          if (!disposed) {
            setVoices(data.voices);
            setSpeaker((current) => current || data.voices[0] || '');
          }
        }
      } catch {
        if (!disposed) setReady(false);
      }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      disposed = true;
      clearInterval(timer);
      void context.current?.close();
    };
  }, []);

  async function uploadReference() {
    if (!uploadFile) return;
    setUploadMessage('');
    if (uploadFile.size > 10 * 1024 * 1024) {
      setUploadMessage(
        'ファイル全体を10 MiB以内にしてください。先頭5秒の切り出しは、アップロード後に自動で行います。',
      );
      return;
    }
    const name = uploadName.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) {
      setUploadMessage(
        '識別名は半角英数字・ハイフン・アンダースコアで指定してください。',
      );
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(
        `${API}/voices/${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: uploadFile,
        },
      );
      if (response.status === 413) {
        throw new Error(
          '10 MiB以内のファイルがサーバーに拒否されました。古いAPIが起動している可能性があります。ターミナルでCtrl+Cを押して終了し、npm run devで再起動してください。',
        );
      }
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || '音声を追加できませんでした。');
      setVoices((current) => [...new Set([...current, result.voice])]);
      setSpeaker(result.voice);
      setUploadMessage(
        `${result.voice} を追加しました。読み上げに使用できます。`,
      );
    } catch (cause) {
      setUploadMessage(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  }

  async function speak() {
    setError('');
    setActive(true);
    setPhase('生成中');
    try {
      // Resume in the click handler, before waiting for network inference.
      context.current ??= new AudioContext();
      const player = context.current;
      await player.resume();
      const voice = new VoiceEngineAdapter({
        engineType: 'openaiCompatible',
        openAiCompatibleApiUrl: `${API}/v1/audio/speech`,
        openAiCompatibleModel: MODEL,
        openAiCompatibleSpeed: speed,
        speaker,
        onPlay: async (buffer) => {
          const decoded = await player.decodeAudioData(buffer.slice(0));
          if (player.state !== 'running')
            throw new Error(
              '再生が制限されています。画面を開いた状態で再試行してください。',
            );
          setPhase('再生中');
          await new Promise<void>((resolve) => {
            const source = player.createBufferSource();
            source.buffer = decoded;
            source.connect(player.destination);
            source.onended = () => {
              source.disconnect();
              resolve();
            };
            source.start();
          });
        },
      });
      await voice.speak({ text: text.trim() });
      setPhase('再生完了');
    } catch (cause) {
      setPhase('エラー');
      setError(
        `${cause instanceof Error ? cause.message : String(cause)} 文章を短くするか、話速を上げて再試行してください。APIの詳細は .local/api.log を確認してください。`,
      );
    } finally {
      setActive(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">AITUBER ONAIR / VOICE EXAMPLE</p>
      <h1>Irodori Local Voice</h1>
      <p className="intro">
        自分で用意した参照音声を使い、Mac上で短い文章を読み上げます。
      </p>
      <output className="status" aria-live="polite">
        <span className={ready ? 'dot ready' : 'dot'} />
        {active
          ? phase
          : !ready
            ? 'モデル準備中・API接続待ち'
            : gpuBusy
              ? 'GPU生成処理中・完了待ち'
              : phase === '待機中'
                ? 'モデル準備完了'
                : phase}
      </output>
      <label htmlFor="voice">参照音声</label>
      <select
        id="voice"
        value={speaker}
        onChange={(event) => setSpeaker(event.target.value)}
        disabled={!ready || active || uploading}
      >
        {!voices.length && <option value="">登録済み音声を読み込み中</option>}
        {voices.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <details className="upload-panel">
        <summary>自分の参照音声を追加</summary>
        <p className="hint">
          WAV・MP3・FLAC、ファイル全体で10 MiB以内、音声は1秒以上。
          秒数の上限はありませんが、ファイル容量の上限はあります。
        </p>
        <p className="hint">
          受信後に先頭5秒を自動で切り出します（5秒未満なら全体を使用）。
          手動で5秒に切る必要はありません。冒頭に声が入った音声を選んでください。
          保存先はこのMacだけです。
        </p>
        <label htmlFor="upload-name">音声の識別名</label>
        <input
          id="upload-name"
          type="text"
          value={uploadName}
          maxLength={64}
          onChange={(event) => setUploadName(event.target.value)}
          disabled={uploading || active}
        />
        <label htmlFor="upload-file">音声ファイル</label>
        <input
          id="upload-file"
          type="file"
          accept=".wav,.mp3,.flac"
          onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          disabled={uploading || active}
        />
        {uploadFile && (
          <p className="hint">
            選択したファイル：{(uploadFile.size / (1024 * 1024)).toFixed(2)} MiB
            / 上限10 MiB
          </p>
        )}
        <button
          type="button"
          onClick={() => void uploadReference()}
          disabled={!ready || active || uploading || !uploadFile}
        >
          {uploading ? '保存中…' : '音声を追加'}
        </button>
        {uploadMessage && (
          <output className="upload-message" aria-live="polite">
            {uploadMessage}
          </output>
        )}
      </details>
      <label htmlFor="speed">
        話速 <span>{speed.toFixed(1)} ×</span>
      </label>
      <input
        id="speed"
        type="range"
        min={0.5}
        max={2}
        step={0.5}
        value={speed}
        onChange={(event) => setSpeed(Number(event.target.value))}
        disabled={active}
        aria-valuetext={`${speed.toFixed(1)}倍`}
      />
      <div className="speed-ticks" aria-hidden="true">
        <span>0.5</span>
        <span>1.0</span>
        <span>1.5</span>
        <span>2.0</span>
      </div>
      <p className="hint">
        遅くすると音声が長くなります。6秒の上限に達した場合は、文章を短くするか話速を上げてください。
      </p>
      <label htmlFor="text">
        読み上げテキスト <span>{Array.from(text).length} / 40</span>
      </label>
      <textarea
        id="text"
        rows={4}
        maxLength={40}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={active}
      />
      <p className="hint">
        まずは「こんにちは。」から。短い1文・生成音声6秒未満。
      </p>
      <button
        type="button"
        onClick={() => void speak()}
        disabled={
          !ready || gpuBusy || active || uploading || !speaker || !text.trim()
        }
      >
        {active ? (phase === '再生中' ? '再生中…' : '生成中…') : '生成・再生'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer>
        MLX-Audio · Irodori-TTS v3 8bit
        <br />
        参照音声と入力テキストはローカルAPIで処理されます。
      </footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
