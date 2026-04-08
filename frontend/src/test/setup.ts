import "@testing-library/jest-dom";
import { vi } from "vitest";

// Stub browser APIs absent in jsdom
Object.defineProperty(global, "Notification", {
  value: {
    permission: "default",
    requestPermission: vi.fn().mockResolvedValue("granted"),
  },
  writable: true,
});

Object.defineProperty(navigator, "serviceWorker", {
  value: {
    controller: null,
    ready: Promise.resolve({
      pushManager: { subscribe: vi.fn(), getSubscription: vi.fn().mockResolvedValue(null) },
    }),
    register: vi.fn().mockResolvedValue({
      waiting: null,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      pushManager: { subscribe: vi.fn(), getSubscription: vi.fn().mockResolvedValue(null) },
    }),
    getRegistration: vi.fn(),
    addEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
});

