import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the exported isUnauthorizedError utility from http.ts.
// The module's side-effects (axios.create, interceptors) run on import —
// we mock axios at the factory level so they don't fail in jsdom.

vi.mock("../lib/auth", () => ({
  getAuthToken: vi.fn(() => null),
  clearAuthSession: vi.fn(),
}));

vi.mock("axios", () => {
  const mockUse = vi.fn();
  const instance = {
    interceptors: {
      request: { use: mockUse },
      response: { use: mockUse },
    },
    defaults: { headers: { common: {} } },
    get: vi.fn(),
    post: vi.fn(),
  };
  return { default: { create: () => instance } };
});

import { isUnauthorizedError } from "./http";

describe("API http layer — isUnauthorizedError", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("detects 401", () => {
    expect(isUnauthorizedError({ response: { status: 401 } })).toBe(true);
  });

  it("detects 403", () => {
    expect(isUnauthorizedError({ response: { status: 403 } })).toBe(true);
  });

  it("returns false for 200", () => {
    expect(isUnauthorizedError({ response: { status: 200 } })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isUnauthorizedError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isUnauthorizedError(undefined)).toBe(false);
  });

  it("returns false for network error without response", () => {
    expect(isUnauthorizedError({ message: "Network Error" })).toBe(false);
  });
});
