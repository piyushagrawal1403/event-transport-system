export interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const IOS_PROMPT_DISMISSED_SESSION_KEY = 'pwaInstallPrompt.dismissed.session';

export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || navigatorStandalone;
};

export const isIosDevice = (
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
): boolean => {
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
};

export const isSafariBrowser = (userAgent: string): boolean => {
  const hasSafari = /Safari/i.test(userAgent);
  const hasOtherEngine = /CriOS|Chrome|FxiOS|Firefox|EdgiOS|OPiOS|SamsungBrowser/i.test(userAgent);
  return hasSafari && !hasOtherEngine;
};

export const isIosSafariInstallCandidate = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const touchPoints = window.navigator.maxTouchPoints ?? 0;

  return isIosDevice(ua, platform, touchPoints) && isSafariBrowser(ua) && !isStandaloneMode();
};

