import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, AlertOctagon, CheckCircle2, X, Bell } from 'lucide-react';

export default function GlobalAnnouncementBanner({ timerState }) {
  const announcement = timerState?.global_announcement;
  const [dismissedId, setDismissedId] = useState(null);

  // If new announcement arrives, re-show
  useEffect(() => {
    if (announcement?.id && announcement.id !== dismissedId) {
      // New announcement arrived
    }
  }, [announcement?.id, dismissedId]);

  if (!announcement || !announcement.message || announcement.id === dismissedId) {
    return null;
  }

  const severity = announcement.severity || 'info';

  const styles = {
    info: {
      bg: 'bg-blue-600 text-white border-blue-700',
      icon: <Bell className="w-4 h-4 shrink-0 text-blue-200 animate-bounce" />,
      badge: 'bg-blue-800/80 text-blue-100 border-blue-500/50',
      label: 'Notice',
    },
    warning: {
      bg: 'bg-amber-500 text-amber-950 border-amber-600',
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950 animate-pulse" />,
      badge: 'bg-amber-600/80 text-amber-100 border-amber-400/50',
      label: 'Tournament Alert',
    },
    critical: {
      bg: 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-900/20',
      icon: <AlertOctagon className="w-4 h-4 shrink-0 text-rose-200 animate-ping" />,
      badge: 'bg-rose-800 text-rose-100 border-rose-500',
      label: 'URGENT',
    },
    success: {
      bg: 'bg-emerald-600 text-white border-emerald-700',
      icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />,
      badge: 'bg-emerald-800 text-emerald-100 border-emerald-500',
      label: 'Update',
    },
  };

  const currentStyle = styles[severity] || styles.info;

  return (
    <aside
      aria-label="Competition announcement"
      className={`w-full py-2.5 px-4 border-b text-xs sm:text-sm font-semibold transition-all duration-300 shadow-sm z-30 flex items-center justify-between ${currentStyle.bg}`}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="shrink-0">{currentStyle.icon}</div>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${currentStyle.badge}`}>
            {currentStyle.label}
          </span>
          <p className="truncate font-medium">{announcement.message}</p>
        </div>

        <button
          onClick={() => setDismissedId(announcement.id)}
          className="p-1 rounded-lg hover:bg-black/15 transition-colors cursor-pointer shrink-0 opacity-80 hover:opacity-100"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
