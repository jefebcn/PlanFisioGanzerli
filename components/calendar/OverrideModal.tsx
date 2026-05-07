'use client';

import { useState } from 'react';
import type { OverrideInput } from '@/lib/conflicts';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (override: OverrideInput) => void;
}

export function OverrideModal({ open, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState<OverrideInput['reason']>('EMERGENCY');
  const [note, setNote] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Conferma override conflitto
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Stai forzando una prenotazione in conflitto. L&apos;azione verrà
          tracciata in audit log con il tuo nome.
        </p>

        <label className="mt-4 block text-sm font-medium">Motivazione</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as OverrideInput['reason'])}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
        >
          <option value="EMERGENCY">Emergenza clinica</option>
          <option value="SUBSTITUTE_DEVICE">Macchinario sostitutivo disponibile</option>
          <option value="MANAGER_DECISION">Decisione del responsabile</option>
        </select>

        <label className="mt-4 block text-sm font-medium">Note (obbligatorie)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          required
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Spiega brevemente la ragione dell'override"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={note.trim().length === 0}
            onClick={() => {
              onConfirm({ reason, note: note.trim() });
              setNote('');
            }}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Conferma override
          </button>
        </div>
      </div>
    </div>
  );
}
