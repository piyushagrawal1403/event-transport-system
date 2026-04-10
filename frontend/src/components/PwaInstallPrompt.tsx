import { useEffect, useMemo, useState } from 'react';
import {
  DeferredInstallPromptEvent,
  IOS_PROMPT_DISMISSED_SESSION_KEY,
  isIosSafariInstallCandidate,
  isStandaloneMode,
} from '../lib/pwaInstall';

type PromptMode = 'ANDROID' | 'IOS' | null;

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<PromptMode>(null);
  const [hiddenThisSession, setHiddenThisSession] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.sessionStorage.getItem(IOS_PROMPT_DISMISSED_SESSION_KEY) === 'true';
  });

  useEffect(() => {
    if (isStandaloneMode()) {
      setMode(null);
      return;
    }

    if (isIosSafariInstallCandidate()) {
      setMode('IOS');
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPromptEvent);
      setMode('ANDROID');
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setMode(null);
      setHiddenThisSession(true);
      window.sessionStorage.setItem(IOS_PROMPT_DISMISSED_SESSION_KEY, 'true');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const isVisible = useMemo(() => {
    if (hiddenThisSession || isStandaloneMode()) {
      return false;
    }
    if (mode === 'ANDROID') {
      return Boolean(deferredPrompt);
    }
    return mode === 'IOS';
  }, [deferredPrompt, hiddenThisSession, mode]);

  const dismiss = () => {
    setHiddenThisSession(true);
    window.sessionStorage.setItem(IOS_PROMPT_DISMISSED_SESSION_KEY, 'true');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setMode(null);
      dismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-[99] flex justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-[color:var(--w-border)] bg-[color:var(--w-surface-strong)]/95 p-4 shadow-[var(--w-shadow)] backdrop-blur">
        {mode === 'ANDROID' ? (
          <>
            <p className="text-sm font-semibold text-[color:var(--w-accent-strong)]">Install Event Transport</p>
            <p className="mt-1 text-sm text-[color:var(--w-muted)]">
              Add this app to your home screen for faster access and app-like experience.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={dismiss} className="wedding-button-muted px-4 py-2 text-sm font-medium">
                Not now
              </button>
              <button type="button" onClick={() => void handleInstall()} className="wedding-button-primary px-4 py-2 text-sm">
                Install
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-[color:var(--w-accent-strong)]">Install on iPhone</p>
            <p className="mt-1 text-sm text-[color:var(--w-muted)]">
              In Safari, tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install this app.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" onClick={dismiss} className="wedding-button-primary px-4 py-2 text-sm">
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

