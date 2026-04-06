import { describe, it, expect, beforeEach } from "vitest";
import {
  getAuthToken,
  getAuthSession,
  clearAuthSession,
  saveAuthSession,
  getGuestIdentity,
  getDriverPhone,
  getHomeRouteForRole,
  type AuthSession,
} from "../lib/auth";

describe("auth helpers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  const mockSession: AuthSession = {
    token: "test-jwt-token",
    user: { id: 1, name: "Alice", phone: "9999999999", role: "GUEST" },
  };

  it("getToken_returnsStoredToken", () => {
    saveAuthSession(mockSession);
    expect(getAuthToken()).toBe("test-jwt-token");
  });

  it("getToken_returnsNullWhenAbsent", () => {
    expect(getAuthToken()).toBeNull();
  });

  it("clearAuth_removesToken", () => {
    saveAuthSession(mockSession);
    clearAuthSession();
    expect(getAuthToken()).toBeNull();
    expect(getAuthSession()).toBeNull();
  });

  it("isAuthenticated_trueWhenTokenPresent", () => {
    saveAuthSession(mockSession);
    expect(getAuthSession()).not.toBeNull();
  });

  it("isAuthenticated_falseWhenNoToken", () => {
    expect(getAuthSession()).toBeNull();
  });

  it("getGuestIdentity_returnsGuestData", () => {
    saveAuthSession(mockSession);
    const identity = getGuestIdentity();
    expect(identity.name).toBe("Alice");
    expect(identity.phone).toBe("9999999999");
  });

  it("getDriverPhone_returnsDriverData", () => {
    const driverSession: AuthSession = {
      token: "driver-jwt",
      user: { id: 2, name: "Bob", phone: "8888888888", role: "DRIVER" },
    };
    saveAuthSession(driverSession);
    expect(getDriverPhone()).toBe("8888888888");
  });

  it("getHomeRouteForRole_returnsCorrectPaths", () => {
    expect(getHomeRouteForRole("ADMIN")).toBe("/admin");
    expect(getHomeRouteForRole("DRIVER")).toBe("/driver");
    expect(getHomeRouteForRole("GUEST")).toBe("/home");
  });
});

