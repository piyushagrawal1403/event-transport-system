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
    ready: Promise.resolve({
      pushManager: { subscribe: vi.fn(), getSubscription: vi.fn().mockResolvedValue(null) },
    }),
    register: vi.fn(),
    getRegistration: vi.fn(),
  },
  writable: true,
});

