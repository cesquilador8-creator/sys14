import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const changelog = {
  version: '1.0.0',
  releaseDate: '2026-10-29',
  features: [
    'Employee account management with backend-driven provisioning.',
    'Dashboard overview with real metrics and ticket monitoring.',
    'Protected admin access and secure login flow.',
  ],
  improvements: [
    'Improved handling for failed sync and empty states.',
    'Cleaner admin navigation and module grouping.',
    'Session-aware dismissal for transient update notices.',
  ],
  fixes: [
    'Resolved login redirection issues for expired sessions.',
    'Improved empty state messaging for dashboards without records.',
    'Prevented fake analytics from being presented when no data exists.',
  ],
};

export function ChangelogModal() {
  const [visible, setVisible] = useState(false);
  const [showAgain, setShowAgain] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('mindlock-changelog-dismissed');
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  const close = () => {
    if (showAgain) {
      sessionStorage.setItem('mindlock-changelog-dismissed', 'true');
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-sky-600">MINDLOCK</div>
            <h2 className="text-2xl font-bold text-slate-900">Release notes</h2>
          </div>
          <button type="button" onClick={close} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close changelog">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-700">
          <span className="font-semibold">Version {changelog.version}</span>
          <span>•</span>
          <span>{changelog.releaseDate}</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="mb-2 font-semibold text-slate-800">New features</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {changelog.features.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-800">Improvements</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {changelog.improvements.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-800">Bug fixes</h3>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              {changelog.fixes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showAgain} onChange={(e) => setShowAgain(e.target.checked)} className="h-4 w-4" />
            Don’t show again this session
          </label>
          <button type="button" onClick={close} className="rounded-xl bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
