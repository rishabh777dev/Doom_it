import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Check } from 'lucide-react';
import { apiAcknowledgeWarning } from '../services/api';

export default function TeamWarningModal({ warningMessage, onAcknowledged }) {
  const [loading, setLoading] = useState(false);

  if (!warningMessage) return null;

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      await apiAcknowledgeWarning();
      if (onAcknowledged) onAcknowledged();
    } catch (err) {
      console.error('Failed to acknowledge warning:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-rose-500 shadow-2xl p-6 sm:p-7 space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 border-2 border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Arbiter Official Notice
          </span>
          <h2 className="font-display font-black text-2xl text-slate-900 mt-2.5">
            Fair Play Security Warning
          </h2>
          <div className="mt-3 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-950 font-medium text-sm text-left whitespace-pre-wrap leading-relaxed">
            {warningMessage}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Repeated anomalies, automation script usage, or collusion will result in immediate disqualification.
          </p>
        </div>

        <button
          onClick={handleAcknowledge}
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span>Acknowledging...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>I Understand & Acknowledge Warning</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
