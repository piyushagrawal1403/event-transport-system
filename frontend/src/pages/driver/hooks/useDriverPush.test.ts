import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDriverPush } from "./useDriverPush";

const mockSubscribeUser = vi.fn().mockResolvedValue(true);
const mockUnsubscribeUser = vi.fn().mockResolvedValue(undefined);

vi.mock("../../../services/PushNotificationService", () => ({
  pushNotificationService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    requestPermission: vi.fn().mockResolvedValue(true),
    subscribeUser: (...args: unknown[]) => mockSubscribeUser(...args),
    unsubscribeUser: () => mockUnsubscribeUser(),
  },
}));

describe("useDriverPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn().mockResolvedValue("granted") },
      writable: true,
    });
  });

  it("does nothing when phone is empty", () => {
    const { result } = renderHook(() => useDriverPush(""));
    expect(result.current.initialized).toBe(false);
    expect(mockSubscribeUser).not.toHaveBeenCalled();
  });

  it("subscribes driver when phone is provided and permission is granted", async () => {
    const { result } = renderHook(() => useDriverPush("9876543210"));

    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });

    expect(mockSubscribeUser).toHaveBeenCalledWith(
      "9876543210",
      "DRIVER",
      { permissionAlreadyGranted: true }
    );
  });

  it("unsubscribe calls pushNotificationService.unsubscribeUser", async () => {
    const { result } = renderHook(() => useDriverPush("9876543210"));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(mockUnsubscribeUser).toHaveBeenCalled();
  });
});

