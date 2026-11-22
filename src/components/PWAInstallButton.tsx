import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  fullWidth = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`${fullWidth ? 'w-full' : ''} ${
          compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
        } rounded-xl bg-emerald-400 text-slate-950 font-bold hover:bg-emerald-300 flex items-center justify-center gap-1.5 shadow shrink-0 transition`}
        title="Install Choy Chat App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{isInstallable ? 'Install App' : 'Install PWA'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-500/40 p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2.5">
              <div className="flex items-center gap-2">
                <img
                  src="/pwa-192x192.png"
                  alt="Choy Chat"
                  className="w-7 h-7 rounded-lg border border-emerald-500 dark:border-emerald-400 object-cover"
                />
                <h3 className="text-sm font-bold text-emerald-950 dark:text-white">Install Choy Chat</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-xs text-emerald-900 dark:text-emerald-100 list-decimal list-inside">
                <li>Open this link in <strong>Safari</strong>.</li>
                <li>Tap the <strong>Share</strong> icon at the bottom.</li>
                <li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-xs text-emerald-900 dark:text-emerald-100 list-decimal list-inside">
                <li>Open the live link directly in <strong>Google Chrome</strong> (not Messenger/Facebook browser).</li>
                <li>Reload the page once so the app registers cleanly.</li>
                <li>Tap the <strong>3 dots (⋮)</strong> in Chrome and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300 text-xs font-bold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};
