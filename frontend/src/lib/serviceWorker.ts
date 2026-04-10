type ServiceWorkerUpdateListener = (registration: ServiceWorkerRegistration | null) => void;

const SERVICE_WORKER_URL = `/sw.js?appVersion=${encodeURIComponent(import.meta.env.VITE_APP_VERSION || 'dev')}`;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let waitingRegistration: ServiceWorkerRegistration | null = null;
let shouldReloadOnControllerChange = false;

const listeners = new Set<ServiceWorkerUpdateListener>();
const observedRegistrations = new WeakSet<ServiceWorkerRegistration>();

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error === undefined) {
    return 'unknown browser rejection';
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isAppServiceWorkerRegistration(registration: ServiceWorkerRegistration | null | undefined): registration is ServiceWorkerRegistration {
  const scriptURL = registration?.active?.scriptURL || registration?.waiting?.scriptURL || registration?.installing?.scriptURL;
  return Boolean(scriptURL && scriptURL.includes('/sw.js'));
}

export async function getExistingAppServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const direct = await navigator.serviceWorker.getRegistration();
    if (isAppServiceWorkerRegistration(direct)) {
      return direct;
    }
  } catch {
    // Ignore and continue with broader lookup.
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.find((registration) => isAppServiceWorkerRegistration(registration)) ?? null;
  } catch {
    return null;
  }
}

function notifyListeners(registration: ServiceWorkerRegistration | null) {
  waitingRegistration = registration?.waiting ? registration : null;
  listeners.forEach((listener) => listener(waitingRegistration));
}

function handleInstalledWorker(registration: ServiceWorkerRegistration, worker: ServiceWorker | null) {
  if (!worker) {
    return;
  }

  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyListeners(registration);
    }
  });
}

function observeRegistration(registration: ServiceWorkerRegistration) {
  if (observedRegistrations.has(registration)) {
    if (registration.waiting) {
      notifyListeners(registration);
    }
    return;
  }

  observedRegistrations.add(registration);

  if (registration.waiting) {
    notifyListeners(registration);
  }

  registration.addEventListener('updatefound', () => {
    handleInstalledWorker(registration, registration.installing);
  });

  if (registration.installing) {
    handleInstalledWorker(registration, registration.installing);
  }
}

let globalListenersBound = false;

function hasFocusedEditableElement(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    return false;
  }

  const tag = active.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable;
}

function bindGlobalListeners() {
  if (globalListenersBound || !('serviceWorker' in navigator)) {
    return;
  }

  globalListenersBound = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!shouldReloadOnControllerChange) {
      return;
    }

    shouldReloadOnControllerChange = false;
    window.location.reload();
  });

  window.addEventListener('focus', () => {
    if (hasFocusedEditableElement()) {
      return;
    }
    void refreshServiceWorker();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void refreshServiceWorker();
    }
  });
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    return null;
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then(async (registration) => {
        bindGlobalListeners();
        observeRegistration(registration);
        await registration.update().catch(() => undefined);
        if (registration.waiting) {
          notifyListeners(registration);
        }
        return registration;
      })
      .catch((error) => {
        console.warn('Service Worker registration skipped:', describeError(error));
        registrationPromise = null;
        return null;
      });
  }

  return registrationPromise;
}

export async function getAppServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const registration = await registerAppServiceWorker();
  if (registration) {
    return registration;
  }

  return getExistingAppServiceWorkerRegistration();
}

export function subscribeToServiceWorkerUpdates(listener: ServiceWorkerUpdateListener) {
  listeners.add(listener);
  listener(waitingRegistration);

  return () => {
    listeners.delete(listener);
  };
}

export async function refreshServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const registration = await registerAppServiceWorker();

  if (!registration) {
    return null;
  }

  observeRegistration(registration);
  await registration.update().catch(() => undefined);

  if (registration.waiting) {
    notifyListeners(registration);
  }

  return registration;
}

export async function activateServiceWorkerUpdate(): Promise<boolean> {
  const registration = await registerAppServiceWorker();
  const waitingWorker = registration?.waiting;

  if (!waitingWorker) {
    notifyListeners(null);
    return false;
  }

  shouldReloadOnControllerChange = true;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
