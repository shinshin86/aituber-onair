const clampSigned = (value, maxAbs) =>
  Math.min(maxAbs, Math.max(-maxAbs, value));

export const createSecondaryMotionEngine = ({ profiles }) => {
  let elapsedSeconds = 0;
  const stateEntries = profiles.map((profile) => [
    profile.id,
    {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    },
  ]);
  const stateById = new Map(stateEntries);

  const sampleOscillator = (oscillator, timeSeconds) => {
    const frequency = oscillator.frequency ?? 0;
    const phase = oscillator.phase ?? 0;
    return Math.sin(timeSeconds * Math.PI * 2 * frequency + phase);
  };

  const sampleIdleAxis = (oscillators, timeSeconds) => {
    if (!oscillators?.length) {
      return 0;
    }

    let value = 0;
    for (const oscillator of oscillators) {
      value +=
        (oscillator.amplitude ?? 0) * sampleOscillator(oscillator, timeSeconds);
    }
    return value;
  };

  const sampleIdleTarget = (profile, timeSeconds) => {
    if (!profile.idle) {
      return { x: 0, y: 0 };
    }

    return {
      x: sampleIdleAxis(profile.idle.x, timeSeconds),
      y: sampleIdleAxis(profile.idle.y, timeSeconds),
    };
  };

  const reset = ({ kickOnLoad = true } = {}) => {
    elapsedSeconds = 0;
    for (const state of stateById.values()) {
      state.x = 0;
      state.y = 0;
      state.vx = 0;
      state.vy = 0;
    }

    if (!kickOnLoad) {
      return;
    }

    for (const profile of profiles) {
      if (!profile.loadImpulse) {
        continue;
      }
      const state = stateById.get(profile.id);
      if (!state) {
        continue;
      }
      state.vx += profile.loadImpulse.x ?? 0;
      state.vy += profile.loadImpulse.y ?? 0;
    }
  };

  const inject = (deltaX, deltaY) => {
    for (const profile of profiles) {
      const interaction = profile.interaction;
      if (!interaction) {
        continue;
      }

      const state = stateById.get(profile.id);
      if (!state) {
        continue;
      }

      state.x = clampSigned(
        state.x + deltaX * interaction.offsetScaleX,
        interaction.maxX,
      );
      state.y = clampSigned(
        state.y +
          deltaY * interaction.offsetScaleY -
          Math.abs(deltaX) *
            interaction.offsetScaleY *
            interaction.crossAxisRatio,
        interaction.maxY,
      );
      state.vx = clampSigned(
        state.vx + deltaX * interaction.impulseScaleX,
        interaction.maxX,
      );
      state.vy = clampSigned(
        state.vy +
          deltaY * interaction.impulseScaleY -
          Math.abs(deltaX) *
            interaction.impulseScaleY *
            interaction.crossAxisRatio,
        interaction.maxY,
      );
    }
  };

  const step = (deltaTimeSeconds) => {
    const clampedDt = Math.min(0.05, Math.max(0, deltaTimeSeconds));
    elapsedSeconds += clampedDt;

    for (const profile of profiles) {
      const state = stateById.get(profile.id);
      if (!state) {
        continue;
      }

      const followState = profile.followId
        ? (stateById.get(profile.followId) ?? null)
        : null;
      const idleTarget = sampleIdleTarget(profile, elapsedSeconds);
      const targetX =
        idleTarget.x +
        (followState ? followState.x * (profile.followScaleX ?? 0) : 0);
      const targetY =
        idleTarget.y +
        (followState ? followState.y * (profile.followScaleY ?? 0) : 0);
      const dampingFactor = Math.exp(-profile.damping * clampedDt);

      state.vx += (targetX - state.x) * profile.stiffness * clampedDt;
      state.vy += (targetY - state.y) * profile.stiffness * clampedDt;
      state.vx *= dampingFactor;
      state.vy *= dampingFactor;
      state.x = clampSigned(state.x + state.vx * clampedDt, profile.maxX);
      state.y = clampSigned(state.y + state.vy * clampedDt, profile.maxY);
    }
  };

  const getState = (id) => {
    const state = stateById.get(id);
    if (!state) {
      return { x: 0, y: 0 };
    }
    return { x: state.x, y: state.y };
  };

  return {
    reset,
    inject,
    step,
    getState,
  };
};
