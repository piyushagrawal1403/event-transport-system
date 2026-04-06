import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGuestPush } from './useGuestPush';

const mockSubscribeUser = vi.fn().mockResolvedValue(true);
const mockUnsubscribeUser = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../services/PushNotificationService', () => ({
  pushNotificationService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    requestPermission: vi.fn().mockResolvedValue(true),
    subscribeUser: (...args: unknown[]) => mockSubscribeUser(...args),
    unsubscribeUser: () => mockUnsubscribeUser(),
  },
}));

describe('useGuestPush', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn().mockResolvedValue('granted') },
      writable: true,
    });
  });

  it('does nothing when phone is empty', () => {
    const { result } = renderHook(() => useGuestPush(''));
    expect(result.current.initialized).toBe(false);
    expect(mockSubscribeUser).not.toHaveBeenCalled();
  });

  it('subscribes guest when phone is provided and permission is granted', async () => {
    const { result } = renderHook(() => useGuestPush('9876543210'));
    await waitFor(() => {
      expect(result.current.initialized).toBe(true);
    });
    expect(mockSubscribeUser).toHaveBeenCalledWith(
      '9876543210',
      'GUEST',
      { permissionAlreadyGranted: true }
    );
  });

  it('prompts for permission when status is default', async () => {
    Object.defineProperty(global, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') },
      writable: true,
    });
    const { pushNotificationService } = await import('../../../services/PushNotificationService');
    vi.mocked(pushNotificationService.requestPermission).mockResolvedValue(true);

    const { result } = renderHook(() => useGuestPush('9876543210'));
    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(mockSubscribeUser).toHaveBeenCalled();
  });

  it('does not subscribe when permission is denied', async () => {
    Object.defineProperty(global, 'Notification', {
      value: { permission: 'denied', requestPermission: vi.fn() },
      writable: true,
    });
    const { pushNotificationService } = await import('../../../services/PushNotificationService');
    vi.mocked(pushNotificationService.requestPermission).mockResolvedValue(false);

    renderHook(() => useGuestPush('9876543210'));
    await new Promise(r => setTimeout(r, 50));
    expect(mockSubscribeUser).not.toHaveBeenCalled();
  });

  it('unsubscribe calls pushNotificationService.unsubscribeUser', async () => {
    const { result } = renderHook(() => useGuestPush('9876543210'));
    await act(async () => {
      await result.current.unsubscribe();
    });
    expect(mockUnsubscribeUser).toHaveBeenCalled();
  });
});

