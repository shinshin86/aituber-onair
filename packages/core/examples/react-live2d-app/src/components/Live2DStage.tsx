import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import type { Live2DModelSource } from "../lib/live2dModel";
import type { Live2DModelCtor, Live2DModelInstance } from "../types/live2d";
import type { Live2DAudioBinding } from "../hooks/useAudioLipsync";
import {
	ensureCubismCoreLoaded,
	destroyLive2DModel,
	disableAutoFocus,
	importCubism4Module,
	installLive2DBlobUrlFix,
	makeDraggable,
	makeZoomable,
	setLive2DAudioForLipSync,
	setLive2DModelPosition,
} from "../lib/live2dModel";

interface Live2DStageProps {
	modelSource: Live2DModelSource | null;
	modelPickerError: string;
	audioBinding: Live2DAudioBinding;
}

export function Live2DStage({
	modelSource,
	modelPickerError,
	audioBinding,
}: Live2DStageProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const appRef = useRef<PIXI.Application | null>(null);
	const modelRef = useRef<Live2DModelInstance | null>(null);
	const zoomCleanupRef = useRef<(() => void) | null>(null);
	const audioBindingRef = useRef(audioBinding);
	const [stageError, setStageError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		audioBindingRef.current = audioBinding;
	}, [audioBinding]);

	useEffect(() => {
		const container = containerRef.current;
		const canvas = canvasRef.current;
		if (!container || !canvas) {
			return;
		}

		const resizeStage = (app: PIXI.Application) => {
			const nextWidth = Math.max(container.clientWidth, 1);
			const nextHeight = Math.max(container.clientHeight, 1);
			app.renderer.resize(nextWidth, nextHeight);

			if (modelRef.current) {
				setLive2DModelPosition(app, modelRef.current);
			}
		};

		const app = new PIXI.Application({
			view: canvas,
			width: Math.max(container.clientWidth, 1),
			height: Math.max(container.clientHeight, 1),
			backgroundAlpha: 0,
			antialias: true,
			autoDensity: true,
			resolution: window.devicePixelRatio || 1,
		});

		appRef.current = app;
		canvas.style.touchAction = "none";
		resizeStage(app);

		const observer = new ResizeObserver(() => {
			if (appRef.current) {
				resizeStage(appRef.current);
			}
		});
		observer.observe(container);

		return () => {
			observer.disconnect();
			zoomCleanupRef.current?.();
			zoomCleanupRef.current = null;
			if (modelRef.current && appRef.current) {
				appRef.current.stage.removeChild(modelRef.current);
				destroyLive2DModel(modelRef.current);
				modelRef.current = null;
			}
			app.destroy(false, {
				children: true,
				texture: true,
				baseTexture: true,
			});
			appRef.current = null;
		};
	}, []);

	useEffect(() => {
		const app = appRef.current;
		const canvas = canvasRef.current;
		if (!app || !canvas) {
			return;
		}

		let cancelled = false;

		const clearCurrentModel = () => {
			zoomCleanupRef.current?.();
			zoomCleanupRef.current = null;
			if (modelRef.current) {
				app.stage.removeChild(modelRef.current);
				destroyLive2DModel(modelRef.current);
				modelRef.current = null;
			}
		};

		if (!modelSource) {
			clearCurrentModel();
			return;
		}

		const loadModel = async () => {
			setStageError("");
			setIsLoading(true);
			try {
				installLive2DBlobUrlFix();
				await ensureCubismCoreLoaded();
				const { Live2DModel } = (await importCubism4Module()) as {
					Live2DModel: Live2DModelCtor;
				};
				const model = await Live2DModel.from(modelSource.modelJsonUrl, {
					ticker: PIXI.Ticker.shared,
					autoUpdate: true,
					autoFocus: false,
					autoHitTest: true,
				});

				if (cancelled) {
					destroyLive2DModel(model);
					return;
				}

				clearCurrentModel();
				disableAutoFocus(model);
				model.interactive = true;
				setLive2DAudioForLipSync(model, audioBindingRef.current);
				app.stage.addChild(model);
				setLive2DModelPosition(app, model);
				requestAnimationFrame(() => {
					if (!cancelled && modelRef.current === model) {
						setLive2DModelPosition(app, model);
					}
				});
				makeDraggable(model);
				zoomCleanupRef.current = makeZoomable(model, canvas);
				modelRef.current = model;
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "選択した Live2D モデルを表示できませんでした。";
				setStageError(message);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		void loadModel();

		return () => {
			cancelled = true;
		};
	}, [modelSource]);

	useEffect(() => {
		if (!modelRef.current) {
			return;
		}
		setLive2DAudioForLipSync(modelRef.current, audioBinding);
	}, [audioBinding]);

	const effectiveStageError = modelSource ? stageError : "";
	const overlayMessage =
		modelPickerError ||
		effectiveStageError ||
		(modelSource ? "" : "設定を開いて Live2D モデルを選択してください。");
	const showLoading = modelSource ? isLoading : false;

	return (
		<div className="avatar-background">
			<div ref={containerRef} className="live2d-stage">
				<canvas ref={canvasRef} className="live2d-canvas" />
				{(showLoading || overlayMessage) && (
					<div className="live2d-status">
						<strong>
							{showLoading ? "Live2D モデルを読み込み中..." : "Live2D サンプル"}
						</strong>
						{!showLoading && <span>{overlayMessage}</span>}
						{modelSource && !showLoading && !overlayMessage && (
							<span>{modelSource.modelFilePath}</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
