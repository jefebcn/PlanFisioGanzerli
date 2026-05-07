'use client';

import clsx from 'clsx';
import type { ConflictReport } from '@/lib/conflicts/types';

interface Props {
  report: ConflictReport | null;
  onForce?: () => void;
  canOverride: boolean;
}

export function ConflictBanner({ report, onForce, canOverride }: Props) {
  if (!report || report.items.length === 0) return null;

  const tone = report.hasHardConflict ? 'hard' : 'soft';
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-md border p-3 text-sm',
        tone === 'hard'
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-amber-300 bg-amber-50 text-amber-800',
      )}
    >
      <div className="font-semibold">
        {tone === 'hard' ? 'Conflitti bloccanti' : 'Avvisi'}
      </div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {report.items.map((item, idx) => (
          <li key={idx}>
            <span
              className={clsx(
                'mr-2 inline-block rounded px-1.5 text-[10px] font-bold uppercase',
                item.severity === 'HARD'
                  ? 'bg-red-200 text-red-900'
                  : 'bg-amber-200 text-amber-900',
              )}
            >
              {item.severity}
            </span>
            {item.message}
          </li>
        ))}
      </ul>
      {report.hasHardConflict && canOverride && onForce && (
        <button
          type="button"
          onClick={onForce}
          className="mt-3 rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
        >
          Forza con motivazione (override)
        </button>
      )}
    </div>
  );
}
