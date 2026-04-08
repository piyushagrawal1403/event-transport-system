import { beforeEach, describe, expect, it, vi } from 'vitest';

function createRegistration(overrides: Partial<ServiceWorkerRegistration> = {}) {
  return {
    waiting: null,
    installing: null,
    update: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    ...overrides,
  } as unknown as ServiceWorkerRegistration;
}

describe('serviceWorker helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });
  });

  it('registers the versioned service worker and notifies listeners when an update is waiting', async () => {
    const waitingWorker = { postMessage: vi.fn(), scriptURL: '/sw.js?appVersion=test-build' } as unknown as ServiceWorker;
    const registration = createRegistration({ waiting: waitingWorker });
    const serviceWorkerContainer = {
      controller: {} as ServiceWorker,
      ready: Promise.resolve(registration),
      register: vi.fn().mockResolvedValue(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerContainer,
      configurable: true,
      writable: true,
    });

    const { registerAppServiceWorker, subscribeToServiceWorkerUpdates } = await import('./serviceWorker');
    const listener = vi.fn();
    subscribeToServiceWorkerUpdates(listener);

    await registerAppServiceWorker();

    expect(serviceWorkerContainer.register).toHaveBeenCalledWith(expect.stringMatching(/^\/sw\.js\?appVersion=/));
    expect(listener).toHaveBeenLastCalledWith(registration);
  });

  it('posts SKIP_WAITING to the waiting worker when the user accepts an update', async () => {
    const waitingWorker = { postMessage: vi.fn(), scriptURL: '/sw.js?appVersion=test-build' } as unknown as ServiceWorker;
    const registration = createRegistration({ waiting: waitingWorker });
    const serviceWorkerContainer = {
      controller: {} as ServiceWorker,
      ready: Promise.resolve(registration),
      register: vi.fn().mockResolvedValue(registration),
      getRegistration: vi.fn().mockResolvedValue(registration),
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerContainer,
      configurable: true,
      writable: true,
    });

    const { activateServiceWorkerUpdate, registerAppServiceWorker } = await import('./serviceWorker');

    await registerAppServiceWorker();
    const didStartUpdate = await activateServiceWorkerUpdate();

    expect(didStartUpdate).toBe(true);
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
