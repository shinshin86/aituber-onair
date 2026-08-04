import type { CSSProperties } from 'react';
import type { BondToast } from '../lib/kizunaBond';

interface BondToastStackProps {
  toasts: BondToast[];
  onDismiss: (id: number) => void;
}

type ToastStyle = CSSProperties & {
  '--bond-from': string;
  '--bond-to': string;
};

export function BondToastStack({
  toasts,
  onDismiss,
}: BondToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <aside className="bond-toast-stack" aria-label="親密度の変化通知">
      {toasts.map((toast) => {
        const decreased = toast.nextIntimacy < toast.previousIntimacy;
        const highlighted =
          decreased ||
          toast.leveledUp ||
          toast.previousStage !== toast.nextStage;
        const style: ToastStyle = {
          '--bond-from': `${toast.previousIntimacy * 100}%`,
          '--bond-to': `${toast.nextIntimacy * 100}%`,
        };
        return (
          <section
            key={toast.id}
            className={`bond-toast${highlighted ? ' bond-toast-highlight' : ''}${decreased ? ' bond-toast-decreased' : ''}`}
            role="status"
          >
            <button
              type="button"
              className="bond-toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              aria-label={`${toast.displayName}の通知を閉じる`}
            >
              ×
            </button>
            <div className="bond-toast-heading">
              <strong>{toast.displayName}</strong>
              <span>{formatSignedPoints(toast.pointsAdded)}ポイント</span>
            </div>
            <p>
              親密度 {Math.round(toast.previousIntimacy * 100)}% →{' '}
              {Math.round(toast.nextIntimacy * 100)}%
            </p>
            <div className="bond-toast-track" aria-hidden="true">
              <i style={style} />
            </div>
            <small>
              {toast.previousStage !== toast.nextStage
                ? `関係ステージ: ${toast.previousStage} → ${toast.nextStage}`
                : toast.leveledUp
                  ? `レベル${toast.newLevel ?? ''}に上がりました · ${toast.nextStage}`
                  : `現在の関係ステージ: ${toast.nextStage}`}
            </small>
          </section>
        );
      })}
    </aside>
  );
}

function formatSignedPoints(points: number): string {
  const formatted = Number.isInteger(points) ? String(points) : points.toFixed(1);
  return points > 0 ? `+${formatted}` : formatted;
}
