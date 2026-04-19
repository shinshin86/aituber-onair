declare module "pixi-live2d-display-lipsyncpatch" {
	import type { Live2DModelCtor, Live2DModelInstance } from "./live2d";

	export { Live2DModelCtor, Live2DModelInstance };
	export const Live2DModel: Live2DModelCtor & {
		defaultOptions?: {
			autoFocus?: boolean;
		};
		focusEnabled?: boolean;
	};
}

declare module "pixi-live2d-display-lipsyncpatch/cubism4" {
	import type { Live2DModelCtor, Live2DModelInstance } from "./live2d";

	export { Live2DModelCtor, Live2DModelInstance };
	export const Live2DModel: Live2DModelCtor & {
		defaultOptions?: {
			autoFocus?: boolean;
		};
		focusEnabled?: boolean;
	};
}
