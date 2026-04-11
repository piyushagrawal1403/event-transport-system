import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAdminPush } from "./useAdminPush";

// Mock pushNotificationService
vi.mock("../../../services/PushNotificationService", () => ({
  pushNotificationService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    requestPermission: vi.fn().mockResolvedValue(true),
    subscribeUser: vi.fn().mockResolvedValue(true),
    unsubscribeUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock API calls
vi.mock("../../../api/client", () => ({
  getAdminPushSubscriptions: vi.fn().mockResolvedValue({
    data: { total: 3, adminCount: 1, subscriptions: [] },
  }),
  sendAdminTestPush: vi.fn().mockResolvedValue({
    data: { success: true, message: "Sent to 1 admin subscription(s)." },
  }),
}));

describe("useAdminPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") },
      writable: true,
    });
  });

  it("initializes with default state", async () => {
    const { result } = renderHook(() => useAdminPush("admin"));
    // Wait for the mount effect to settle
    await waitFor(() => {
      expect(result.current.adminPushEnabled).toBe(true);
    });
    expect(result.current.enablingAdminPush).toBe(false);
    expect(result.current.sendingTestPush).toBe(false);
    expect(result.current.testPushResult).toBeNull();
    expect(result.current.pushSubCount).toBeNull();
  });

  it("enables admin push on mount when permission is granted", async () => {
    const { result } = renderHook(() => useAdminPush("admin"));

    await waitFor(() => {
      expect(result.current.adminPushEnabled).toBe(true);
    });
    expect(result.current.adminPushPermission).toBe("granted");
  });

  it("handleLoadPushSubCount fetches subscription counts", async () => {
    const { result } = renderHook(() => useAdminPush("admin"));
    // Wait for mount effects to finish first
    await waitFor(() => {
      expect(result.current.adminPushEnabled).toBe(true);
    });

    await act(async () => {
      await result.current.handleLoadPushSubCount();
    });

    expect(result.current.pushSubCount).toEqual({ total: 3, adminCount: 1, subscriptions: [] });
    expect(result.current.loadingPushSubCount).toBe(false);
  });

  it("handleSendTestPush sends a test push and returns result", async () => {
    const { result } = renderHook(() => useAdminPush("admin"));
    await waitFor(() => {
      expect(result.current.adminPushEnabled).toBe(true);
    });

    await act(async () => {
      await result.current.handleSendTestPush();
    });

    expect(result.current.testPushResult).toEqual({
      success: true,
      message: "Sent to 1 admin subscription(s).",
    });
    expect(result.current.sendingTestPush).toBe(false);
  });

  it("resetPushDebug clears push sub count and test result", async () => {
    const { result } = renderHook(() => useAdminPush("admin"));
    await waitFor(() => {
      expect(result.current.adminPushEnabled).toBe(true);
    });

    // Load data first
    await act(async () => {
      await result.current.handleLoadPushSubCount();
    });
    await act(async () => {
      await result.current.handleSendTestPush();
    });
    expect(result.current.pushSubCount).not.toBeNull();
    expect(result.current.testPushResult).not.toBeNull();

    // Reset
    act(() => {
      result.current.resetPushDebug();
    });
    expect(result.current.pushSubCount).toBeNull();
    expect(result.current.testPushResult).toBeNull();
  });
});

