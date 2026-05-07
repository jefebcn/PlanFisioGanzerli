'use client';

import { useState } from 'react';
import clsx from 'clsx';

interface Props {
  selected: Date;
  onSelect: (d: Date) => void;
}

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];
const DAYS = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

export function MiniCalendar({ selected, onSelect }: Props) {
  const [view, setView] = useState(() => {
    const d = new Date(selected);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });

  const year = view.getUTCFullYear();
  const month = view.getUTCMonth();

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v);
      d.setUTCMonth(d.getUTCMonth() + delta);
      return d;
    });
  }

  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startPad = (firstDayOfMonth.getUTCDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) =>
      new Date(Date.UTC(year, month, i + 1)),
    ),
  ];

  const todayISO = new Date().toISOString().slice(0, 10);
  const selISO = selected.toISOString().slice(0, 10);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[13px] font-semibold text-white">
          {MONTHS[month]} {year}
        </span>
        <div className="flex">
          <button onClick={() => shift(-1)} className="px-1.5 py-0.5 text-slate-400 hover:text-white text-base leading-none">‹</button>
          <button onClick={() => shift(1)} className="px-1.5 py-0.5 text-slate-400 hover:text-white text-base leading-none">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] text-slate-500 pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const iso = day.toISOString().slice(0, 10);
          const isToday = iso === todayISO;
          const isSel = iso === selISO;
          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <button
                onClick={() => onSelect(day)}
                className={clsx(
                  'w-6 h-6 rounded-full text-[11px] flex items-center justify-center transition-colors',
                  isSel && 'bg-violet-600 text-white',
                  !isSel && isToday && 'bg-emerald-500 text-white',
                  !isSel && !isToday && 'text-slate-300 hover:bg-slate-700',
                )}
              >
                {day.getUTCDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
