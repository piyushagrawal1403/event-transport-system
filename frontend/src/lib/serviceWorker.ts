type ServiceWorkerUpdateListener = (registration: ServiceWorkerRegistration | null) => void;

const SERVICE_WORKER_URL = `/sw.js?appVersion=${encodeURIComponent(import.meta.env.VITE_APP_VERSION || 'dev')}`;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let waitingRegistration: ServiceWorkerRegistration | null = null;
let shouldReloadOnControllerChange = false;

const listeners = new Set<ServiceWorkerUpdateListener>();
const observedRegistrations = new WeakSet<ServiceWorkerRegistration>();

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
        console.error('Service Worker registration failed:', error);
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

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return (await navigator.serviceWorker.getRegistration('/')) ?? null;
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
