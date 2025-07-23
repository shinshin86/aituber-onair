# @aituber-onair/core

## 0.16.1

### Patch Changes

- Update @aituber-onair/voice dependency to v0.3.0 to support newly added voice engines

## 0.16.0

### Minor Changes

- Add support for Gemini 2.5 Flash Lite model
  - Add `MODEL_GEMINI_2_5_FLASH_LITE` constant for the new `gemini-2.5-flash-lite` model
  - Include the model in `GEMINI_VISION_SUPPORTED_MODELS` array to enable vision capabilities
  - This provides users with a lightweight alternative to the standard Gemini models while maintaining vision support

## 0.15.0

### Minor Changes

- Introduce Changesets-based version management and voice package separation

  - Add @changesets/cli for automated version management  
  - Configure independent versioning for core and voice packages
  - Split voice functionality into separate @aituber-onair/voice package
  - Update core package to use peer + optional dependencies for voice
  - Add GitHub Actions for automated releases
  - Enable separate release cycles for voice and core packages

  This change improves package management flexibility and allows voice package to be used independently while maintaining backward compatibility.

### Patch Changes

- Updated dependencies []:
  - @aituber-onair/voice@0.1.0
