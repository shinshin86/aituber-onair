import { useCallback, useEffect, useRef, useState } from "react";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAudioLipsync } from "./hooks/useAudioLipsync";
import { useAituberCore } from "./hooks/useAituberCore";
import { useSettings } from "./hooks/useSettings";
import { ChatPanel } from "./components/ChatPanel";
import {
	createBundledLive2DModelSource,
	getBundledLive2DModels,
	type BundledLive2DModelEntry,
	type Live2DModelSource,
} from "./lib/live2dModel";
import "./styles/base.css";
import "./styles/app.css";

export default function App() {
	const { play, stop, audioBinding } = useAudioLipsync();
	const settingsHook = useSettings();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
		null,
	);
	const [modelSource, setModelSource] = useState<Live2DModelSource | null>(
		null,
	);
	const [bundledModels] = useState<BundledLive2DModelEntry[]>(
		() => getBundledLive2DModels(),
	);
	const [selectedBundledModelId, setSelectedBundledModelId] = useState(() =>
		getBundledLive2DModels()[0]?.id || "",
	);
	const [modelPickerError, setModelPickerError] = useState("");
	const backgroundObjectUrlRef = useRef<string | null>(null);
	const modelSourceRef = useRef<Live2DModelSource | null>(null);

	const replaceModelSource = useCallback(
		(nextSource: Live2DModelSource | null) => {
			setModelSource((previousSource) => {
				previousSource?.revoke();
				return nextSource;
			});
		},
		[],
	);

	const handleAudioPlay = useCallback(
		async (arrayBuffer: ArrayBuffer) => {
			await play(arrayBuffer);
		},
		[play],
	);

	const { messages, isProcessing, partialResponse, processChat } =
		useAituberCore({
			onAudioPlay: handleAudioPlay,
			settings: settingsHook.settings,
			getApiKeyForProvider: settingsHook.getApiKeyForProvider,
		});

	const handleSend = useCallback(
		(text: string) => {
			stop();
			processChat(text);
		},
		[processChat, stop],
	);

	const handleBackgroundImageChange = useCallback((file: File | null) => {
		if (backgroundObjectUrlRef.current) {
			URL.revokeObjectURL(backgroundObjectUrlRef.current);
			backgroundObjectUrlRef.current = null;
		}

		if (!file) {
			setBackgroundImageUrl(null);
			return;
		}

		const nextUrl = URL.createObjectURL(file);
		backgroundObjectUrlRef.current = nextUrl;
		setBackgroundImageUrl(nextUrl);
	}, []);

	const handleClearModel = useCallback(() => {
		replaceModelSource(null);
		setModelPickerError("");
	}, [replaceModelSource]);

	const handleBundledModelLoad = useCallback(async () => {
		if (!selectedBundledModelId) {
			return;
		}

		try {
			setModelPickerError("");
			const nextSource =
				await createBundledLive2DModelSource(selectedBundledModelId);
			replaceModelSource(nextSource);
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "`models/` フォルダ内の Live2D モデルを読み込めませんでした。";
				replaceModelSource(null);
				setModelPickerError(message);
			}
	}, [replaceModelSource, selectedBundledModelId]);

	useEffect(() => {
		modelSourceRef.current = modelSource;
	}, [modelSource]);

	useEffect(() => {
		if (!settingsOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setSettingsOpen(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [settingsOpen]);

	useEffect(() => {
		return () => {
			if (backgroundObjectUrlRef.current) {
				URL.revokeObjectURL(backgroundObjectUrlRef.current);
			}
			modelSourceRef.current?.revoke();
		};
	}, []);

	return (
		<div className="app">
			<ChatPanel
				messages={messages}
				partialResponse={partialResponse}
				isProcessing={isProcessing}
				onSend={handleSend}
				onToggleSettings={() => setSettingsOpen((current) => !current)}
				backgroundImageUrl={backgroundImageUrl}
				modelSource={modelSource}
				modelPickerError={modelPickerError}
				audioBinding={audioBinding}
			/>

			{settingsOpen && (
				<div
					className="settings-dialog-overlay"
					onClick={() => setSettingsOpen(false)}
				>
					<div
						className="settings-dialog"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="settings-dialog-header">
							<h2>設定</h2>
							<button
								className="settings-dialog-close"
								onClick={() => setSettingsOpen(false)}
								type="button"
							>
								&times;
							</button>
						</div>
						<div className="settings-dialog-body">
							<section className="live2d-model-panel">
								<h3>Live2D</h3>
								<div className="settings-field">
									<label>`models/` フォルダ内のモデル</label>
									<div className="settings-file-picker-row">
										<select
											value={selectedBundledModelId}
											onChange={(event) =>
												setSelectedBundledModelId(event.target.value)
											}
											disabled={bundledModels.length === 0}
										>
											{bundledModels.length === 0 ? (
												<option value="">
													`models/` にモデルが見つかりません
												</option>
											) : (
												bundledModels.map((model) => (
													<option key={model.id} value={model.id}>
														{model.label}
													</option>
												))
											)}
										</select>
										<button
											className="settings-file-trigger"
											type="button"
											onClick={() => void handleBundledModelLoad()}
											disabled={
												bundledModels.length === 0 || !selectedBundledModelId
											}
										>
											読み込む
										</button>
									</div>
									<p className="settings-field-hint">
										`packages/core/examples/react-live2d-app/models/`
										配下にあるモデルを表示します。新しいファイルを追加した場合は
										dev サーバーを再起動してください。
									</p>
									<div className="settings-file-actions">
										<span className="settings-file-status">
											{modelSource?.modelFilePath || "未読み込み"}
										</span>
										<button
											className="settings-clear-button"
											type="button"
											onClick={handleClearModel}
											disabled={!modelSource}
										>
											クリア
										</button>
									</div>
									<p className="settings-field-hint">
										このサンプルには Live2D アセットは同梱していません。
									</p>
									{modelPickerError && (
										<p className="settings-field-error">{modelPickerError}</p>
									)}
								</div>
							</section>

							<SettingsPanel
								{...settingsHook}
								isProcessing={isProcessing}
								backgroundImageUrl={backgroundImageUrl}
								onBackgroundImageChange={handleBackgroundImageChange}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
