import type { VoiceEngine } from '../../../engines/VoiceEngine';
import type { AivisCloudVoiceServiceOptions } from '../../VoiceService';
import {
  type AivisCloudConfigurableEngine,
  type EngineHandler,
  mergeOptionValues,
} from './types';

const allowedUpdateKeys = [
  'aivisCloudModelUuid',
  'aivisCloudSpeakerUuid',
  'aivisCloudStyleId',
  'aivisCloudStyleName',
  'aivisCloudUserDictionaryUuid',
  'aivisCloudUseSSML',
  'aivisCloudLanguage',
  'aivisCloudSpeakingRate',
  'aivisCloudEmotionalIntensity',
  'aivisCloudTempoDynamics',
  'aivisCloudPitch',
  'aivisCloudVolume',
  'aivisCloudLeadingSilence',
  'aivisCloudTrailingSilence',
  'aivisCloudLineBreakSilence',
  'aivisCloudOutputFormat',
  'aivisCloudOutputBitrate',
  'aivisCloudOutputSamplingRate',
  'aivisCloudOutputChannels',
  'aivisCloudEnableBillingLogs',
] as const;

export const aivisCloudEngineHandler: EngineHandler<AivisCloudVoiceServiceOptions> =
  {
    allowedUpdateKeys,
    applyOptions(engine: VoiceEngine, options: AivisCloudVoiceServiceOptions) {
      const aivisEngine = engine as AivisCloudConfigurableEngine;

      if (options.aivisCloudModelUuid && aivisEngine.setModelUuid) {
        aivisEngine.setModelUuid(options.aivisCloudModelUuid);
      }
      if (options.aivisCloudSpeakerUuid && aivisEngine.setSpeakerUuid) {
        aivisEngine.setSpeakerUuid(options.aivisCloudSpeakerUuid);
      }
      if (options.aivisCloudStyleId !== undefined && aivisEngine.setStyleId) {
        aivisEngine.setStyleId(options.aivisCloudStyleId);
      } else if (options.aivisCloudStyleName && aivisEngine.setStyleName) {
        aivisEngine.setStyleName(options.aivisCloudStyleName);
      }
      if (
        options.aivisCloudUserDictionaryUuid &&
        aivisEngine.setUserDictionaryUuid
      ) {
        aivisEngine.setUserDictionaryUuid(options.aivisCloudUserDictionaryUuid);
      }
      if (options.aivisCloudLanguage && aivisEngine.setLanguage) {
        aivisEngine.setLanguage(options.aivisCloudLanguage);
      }
      if (options.aivisCloudUseSSML !== undefined && aivisEngine.setUseSSML) {
        aivisEngine.setUseSSML(options.aivisCloudUseSSML);
      }
      if (
        options.aivisCloudSpeakingRate !== undefined &&
        aivisEngine.setSpeakingRate
      ) {
        aivisEngine.setSpeakingRate(options.aivisCloudSpeakingRate);
      }
      if (
        options.aivisCloudEmotionalIntensity !== undefined &&
        aivisEngine.setEmotionalIntensity
      ) {
        aivisEngine.setEmotionalIntensity(options.aivisCloudEmotionalIntensity);
      }
      if (
        options.aivisCloudTempoDynamics !== undefined &&
        aivisEngine.setTempoDynamics
      ) {
        aivisEngine.setTempoDynamics(options.aivisCloudTempoDynamics);
      }
      if (options.aivisCloudPitch !== undefined && aivisEngine.setPitch) {
        aivisEngine.setPitch(options.aivisCloudPitch);
      }
      if (options.aivisCloudVolume !== undefined && aivisEngine.setVolume) {
        aivisEngine.setVolume(options.aivisCloudVolume);
      }

      if (
        (options.aivisCloudLeadingSilence !== undefined ||
          options.aivisCloudTrailingSilence !== undefined ||
          options.aivisCloudLineBreakSilence !== undefined) &&
        aivisEngine.setSilenceDurations
      ) {
        aivisEngine.setSilenceDurations(
          options.aivisCloudLeadingSilence ?? 0.1,
          options.aivisCloudTrailingSilence ?? 0.1,
          options.aivisCloudLineBreakSilence ?? 0.4,
        );
      }

      if (options.aivisCloudOutputFormat && aivisEngine.setOutputFormat) {
        aivisEngine.setOutputFormat(options.aivisCloudOutputFormat);
      }
      if (
        options.aivisCloudOutputBitrate !== undefined &&
        aivisEngine.setOutputBitrate
      ) {
        aivisEngine.setOutputBitrate(options.aivisCloudOutputBitrate);
      }
      if (
        options.aivisCloudOutputSamplingRate !== undefined &&
        aivisEngine.setOutputSamplingRate
      ) {
        aivisEngine.setOutputSamplingRate(options.aivisCloudOutputSamplingRate);
      }
      if (options.aivisCloudOutputChannels && aivisEngine.setOutputChannels) {
        aivisEngine.setOutputChannels(options.aivisCloudOutputChannels);
      }
      if (
        options.aivisCloudEnableBillingLogs !== undefined &&
        aivisEngine.setEnableBillingLogs
      ) {
        aivisEngine.setEnableBillingLogs(options.aivisCloudEnableBillingLogs);
      }
    },
    mergeOptions(current, update) {
      return mergeOptionValues(current, update);
    },
  };
