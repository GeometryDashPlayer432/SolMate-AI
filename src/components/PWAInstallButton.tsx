import React, { useState } from 'react';
import { Download, Monitor, Smartphone, CheckCircle, X, Sparkles, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'hero' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'nav',
  className = '',
}) => {
  const { canNativePrompt, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone PWA window, hide button
  if (isInstalled) {
    return (
      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/50">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (canNativePrompt) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'nav' && (
        <button
          onClick={handleClick}
          title="Install SolmateAI as Desktop/Mobile App"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            canNativePrompt
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 shadow-blue-500/25 ring-2 ring-blue-400/30'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
          } ${className}`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {variant === 'hero' && (
        <button
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${className}`}
        >
          <Download className="w-5 h-5 shrink-0" />
          <span>Download &amp; Install Web App</span>
        </button>
      )}

      {variant === 'floating' && (
        <button
          onClick={handleClick}
          className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-2xl hover:scale-105 transition-all border border-white/20 dark:border-slate-800/20 ${className}`}
        >
          <Download className="w-4 h-4 text-blue-400 dark:text-blue-600" />
          <span>Install SolmateAI App</span>
        </button>
      )}

      {/* Guided Install Modal for iOS Safari / Desktop Browser instructions */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-5">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-red-500 to-amber-500 p-0.5 shadow-md shrink-0">
                <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">
                  Install SolmateAI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Run as a standalone desktop or mobile application
                </p>
              </div>
            </div>

            {/* Content based on device */}
            {isIOS ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 space-y-2">
                  <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 shrink-0" /> Apple iOS Safari Instructions
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    iOS WebKit requires adding the app to your home screen manually:
                  </p>
                </div>

                <ol className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Tap the <strong>Share button</strong> <Share2 className="inline w-3.5 h-3.5 text-blue-500 mx-1" /> in your Safari navigation toolbar.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Scroll down the action sheet and select <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 text-blue-500 mx-1" />.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Tap <strong>Add</strong> in the top right. SolmateAI will now appear on your home screen with its own native window!</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-blue-500 shrink-0" /> Desktop &amp; Android Installation
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    SolmateAI can be installed directly from Google Chrome, Edge, Brave, or Android Chrome:
                  </p>
                </div>

                <ol className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>In your browser URL / address bar at the top, look for the <strong>Install App icon</strong> (monitor with down arrow or '+').</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Alternatively, click the browser menu (<strong>⋮</strong> or <strong>…</strong>) and select <strong>&quot;Install SolmateAI&quot;</strong> or <strong>&quot;Save and Share &gt; Install SolmateAI&quot;</strong>.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Click <strong>Install</strong> to launch SolmateAI in full standalone mode with offline workspace caching!</span>
                  </li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity shadow-sm"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
