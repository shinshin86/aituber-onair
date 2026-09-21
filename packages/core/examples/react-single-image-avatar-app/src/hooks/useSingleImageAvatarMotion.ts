import { type RefObject, useEffect, useRef } from 'react';
import {
  advanceBouncyAvatarMotion,
  createBouncyAvatarMotionState,
  getMotionPreviewLevel,
} from '../lib/bouncyAvatarMotion';
import {
  advancePuppetWobbleMotion,
  createPuppetWobbleMotionState,
} from '../lib/puppetWobbleMotion';
import type { AvatarMotionStyle } from '../types/settings';

const PREVIEW_DURATION_MS = 3200;

export function useSingleImageAvatarMotion(
  voiceLevel: number,
  isSpeaking: boolean,
  motionStyle: AvatarMotionStyle,
  previewToken = 0,
): RefObject<HTMLDivElement | null> {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const voiceLevelRef = useRef(voiceLevel);
  const isSpeakingRef = useRef(isSpeaking);
  const motionStyleRef = useRef(motionStyle);
  const previewStartRef = useRef<number | null>(null);

  useEffect(() => {
    voiceLevelRef.current = voiceLevel;
    isSpeakingRef.current = isSpeaking;
    motionStyleRef.current = motionStyle;
  }, [isSpeaking, motionStyle, voiceLevel]);

  useEffect(() => {
    if (previewToken > 0) {
      previewStartRef.current = performance.now();
    }
  }, [previewToken]);

  useEffect(() => {
    let bounceState = createBouncyAvatarMotionState();
    let puppetState = createPuppetWobbleMotionState();
    let activeStyle = motionStyleRef.current;
    let frameId = 0;
    let previousTime = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = (now - previousTime) / 1000;
      previousTime = now;

      let effectiveVoiceLevel = voiceLevelRef.current;
      let effectiveIsSpeaking = isSpeakingRef.current;
      if (previewStartRef.current !== null) {
        const elapsed = now - previewStartRef.current;
        if (elapsed < PREVIEW_DURATION_MS) {
          effectiveVoiceLevel = Math.max(
            effectiveVoiceLevel,
            getMotionPreviewLevel(elapsed),
          );
          effectiveIsSpeaking = true;
        } else {
          previewStartRef.current = null;
        }
      }

      const currentStyle = motionStyleRef.current;
      if (currentStyle !== activeStyle) {
        bounceState = createBouncyAvatarMotionState();
        puppetState = createPuppetWobbleMotionState();
        activeStyle = currentStyle;
      }
      const motion =
        currentStyle === 'puppet'
          ? advancePuppetWobbleMotion(
              puppetState,
              effectiveVoiceLevel,
              effectiveIsSpeaking,
              deltaSeconds,
            )
          : advanceBouncyAvatarMotion(
              bounceState,
              effectiveVoiceLevel,
              effectiveIsSpeaking,
              now,
              deltaSeconds,
            );
      const element = elementRef.current;
      if (element) {
        element.style.transform =
          `translate3d(0, ${motion.y.toFixed(2)}px, 0) ` +
          `rotate(${motion.rotation.toFixed(4)}rad) ` +
          `scale(${motion.scaleX.toFixed(4)}, ${motion.scaleY.toFixed(4)})`;
        element.dataset.motionY = motion.y.toFixed(2);
        element.dataset.motionRotation = motion.rotation.toFixed(4);
        element.dataset.voiceLevel = effectiveVoiceLevel.toFixed(3);
        element.dataset.speaking = String(effectiveIsSpeaking);
        element.dataset.motionStyle = currentStyle;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return elementRef;
}
