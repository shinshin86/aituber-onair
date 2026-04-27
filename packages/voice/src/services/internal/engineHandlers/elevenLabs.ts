import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { ElevenLabsVoiceServiceOptions } from '../../VoiceService';
import {
  type ElevenLabsConfigurableEngine,
  type EngineHandler,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'elevenLabsApiUrl',
  'elevenLabsModel',
  'elevenLabsOutputFormat',
  'elevenLabsLanguageCode',
  'elevenLabsVoiceSettings',
  'elevenLabsStability',
  'elevenLabsSimilarityBoost',
  'elevenLabsStyle',
  'elevenLabsUseSpeakerBoost',
  'elevenLabsSpeed',
  'elevenLabsSeed',
  'elevenLabsPreviousText',
  'elevenLabsNextText',
  'elevenLabsApplyTextNormalization',
  'elevenLabsApplyLanguageTextNormalization',
  'elevenLabsEnableLogging',
] as const;

export const elevenLabsEngineHandler: EngineHandler<ElevenLabsVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: ElevenLabsVoiceServiceOptions) {
      const elevenLabsEngine = engine as ElevenLabsConfigurableEngine;

      if (options.elevenLabsApiUrl && elevenLabsEngine.setApiEndpoint) {
        elevenLabsEngine.setApiEndpoint(options.elevenLabsApiUrl);
      }
      if (options.elevenLabsModel && elevenLabsEngine.setModel) {
        elevenLabsEngine.setModel(options.elevenLabsModel);
      }
      if (
        options.elevenLabsOutputFormat !== undefined &&
        elevenLabsEngine.setOutputFormat
      ) {
        elevenLabsEngine.setOutputFormat(options.elevenLabsOutputFormat);
      }
      if (
        options.elevenLabsLanguageCode !== undefined &&
        elevenLabsEngine.setLanguageCode
      ) {
        elevenLabsEngine.setLanguageCode(options.elevenLabsLanguageCode);
      }
      if (
        options.elevenLabsVoiceSettings &&
        elevenLabsEngine.setVoiceSettings
      ) {
        elevenLabsEngine.setVoiceSettings(options.elevenLabsVoiceSettings);
      }
      if (
        options.elevenLabsStability !== undefined &&
        elevenLabsEngine.setStability
      ) {
        elevenLabsEngine.setStability(options.elevenLabsStability);
      }
      if (
        options.elevenLabsSimilarityBoost !== undefined &&
        elevenLabsEngine.setSimilarityBoost
      ) {
        elevenLabsEngine.setSimilarityBoost(options.elevenLabsSimilarityBoost);
      }
      if (options.elevenLabsStyle !== undefined && elevenLabsEngine.setStyle) {
        elevenLabsEngine.setStyle(options.elevenLabsStyle);
      }
      if (
        options.elevenLabsUseSpeakerBoost !== undefined &&
        elevenLabsEngine.setUseSpeakerBoost
      ) {
        elevenLabsEngine.setUseSpeakerBoost(options.elevenLabsUseSpeakerBoost);
      }
      if (options.elevenLabsSpeed !== undefined && elevenLabsEngine.setSpeed) {
        elevenLabsEngine.setSpeed(options.elevenLabsSpeed);
      }
      if (options.elevenLabsSeed !== undefined && elevenLabsEngine.setSeed) {
        elevenLabsEngine.setSeed(options.elevenLabsSeed);
      }
      if (
        options.elevenLabsPreviousText !== undefined &&
        elevenLabsEngine.setPreviousText
      ) {
        elevenLabsEngine.setPreviousText(options.elevenLabsPreviousText);
      }
      if (
        options.elevenLabsNextText !== undefined &&
        elevenLabsEngine.setNextText
      ) {
        elevenLabsEngine.setNextText(options.elevenLabsNextText);
      }
      if (
        options.elevenLabsApplyTextNormalization !== undefined &&
        elevenLabsEngine.setApplyTextNormalization
      ) {
        elevenLabsEngine.setApplyTextNormalization(
          options.elevenLabsApplyTextNormalization,
        );
      }
      if (
        options.elevenLabsApplyLanguageTextNormalization !== undefined &&
        elevenLabsEngine.setApplyLanguageTextNormalization
      ) {
        elevenLabsEngine.setApplyLanguageTextNormalization(
          options.elevenLabsApplyLanguageTextNormalization,
        );
      }
      if (
        options.elevenLabsEnableLogging !== undefined &&
        elevenLabsEngine.setEnableLogging
      ) {
        elevenLabsEngine.setEnableLogging(options.elevenLabsEnableLogging);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
