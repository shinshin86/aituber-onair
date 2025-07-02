# @aituber-onair/core

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
