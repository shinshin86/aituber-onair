import { useEffect, useMemo, useState } from 'react';
import type { AgentEvent } from '@aituber-onair/agent';
import AvatarCanvas from '../components/AvatarCanvas';
import { deriveMikoActivity, presentMikoActivity } from './mikoActivity';

interface MikoStaffCardProps {
  readonly events: readonly AgentEvent[];
  readonly turnActive: boolean;
  /** Next host-scheduled Turn, shown as a countdown while Miko waits. */
  readonly nextRunAt?: string;
}

/**
 * A resident staff card. Miko is presentation only: she never drives the
 * Agent, and every status she shows comes from the Agent Event stream.
 */
export function MikoStaffCard({
  events,
  turnActive,
  nextRunAt,
}: MikoStaffCardProps): React.JSX.Element {
  const activity = useMemo(
    () => deriveMikoActivity(events, turnActive),
    [events, turnActive]
  );
  const presentation = presentMikoActivity(activity);
  // Keyed on the activity kind only, so a long investigation does not
  // retrigger the expression effect on every Tool call.
  const reaction = useMemo(
    () => presentMikoActivity({ kind: activity.kind }).reaction,
    [activity.kind]
  );
  const countdown = useCountdown(turnActive ? undefined : nextRunAt);

  return (
    <aside className={`staff-card ${activity.kind}`}>
      <AvatarCanvas
        reaction={reaction}
        stateLabel={presentation.expression}
        isSpeaking={false}
      />
      <div className="staff-body">
        <div className="staff-name">
          <strong>Miko</strong>
          <small>AIスタッフ</small>
        </div>
        <p className="staff-status">
          <span className="staff-dot" />
          {presentation.label}
        </p>
        <p className="staff-detail">{presentation.detail}</p>
        {countdown ? (
          <p className="staff-schedule">次の分析まで {countdown}</p>
        ) : null}
      </div>
    </aside>
  );
}

function useCountdown(target: string | undefined): string | undefined {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  if (!target) return undefined;
  const remaining = Math.max(0, Date.parse(target) - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
