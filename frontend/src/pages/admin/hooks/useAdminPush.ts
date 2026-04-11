import { useState, useEffect, useCallback } from 'react';
import { getAdminPushSubscriptions, sendAdminTestPush } from '../../../api/client';
import { pushNotificationService } from '../../../services/PushNotificationService';
import type { PushSubscriptionEntry } from '../../../api/client';

export interface AdminPushState {
  adminPushPermission: 'default' | 'granted' | 'denied' | 'unsupported';
  adminPushEnabled: boolean;
  enablingAdminPush: boolean;
  pushSubCount: { total: number; adminCount: number; subscriptions: PushSubscriptionEntry[] } | null;
  loadingPushSubCount: boolean;
  sendingTestPush: boolean;
  testPushResult: { success: boolean; message: string } | null;
}

export interface AdminPushActions {
  handleEnableAdminNotifications: () => Promise<void>;
  handleLoadPushSubCount: () => Promise<void>;
  handleSendTestPush: () => Promise<void>;
  resetPushDebug: () => void;
}

export function useAdminPush(adminPhone: string): AdminPushState & AdminPushActions {
  const [adminPushPermission, setAdminPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [adminPushEnabled, setAdminPushEnabled] = useState(false);
  const [enablingAdminPush, setEnablingAdminPush] = useState(false);
  const [pushSubCount, setPushSubCount] = useState<{ total: number; adminCount: number; subscriptions: PushSubscriptionEntry[] } | null>(null);
  const [loadingPushSubCount, setLoadingPushSubCount] = useState(false);
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{ success: boolean; message: string } | null>(null);

  const ensureAdminPushSubscription = useCallback(async () => {
    await pushNotificationService.initialize();

    if (typeof Notification === 'undefined') {
      setAdminPushPermission('unsupported');
      setAdminPushEnabled(false);
      return;
    }

    const permission = Notification.permission;
    setAdminPushPermission(permission);

    if (permission === 'default') {
      const granted = await pushNotificationService.requestPermission();
      setAdminPushPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
      if (granted) {
        const subscribed = await pushNotificationService.subscribeUser(adminPhone, 'ADMIN', {
          permissionAlreadyGranted: true,
        });
        setAdminPushEnabled(subscribed);
      } else {
        setAdminPushEnabled(false);
      }
    } else if (permission === 'granted') {
      const subscribed = await pushNotificationService.subscribeUser(adminPhone, 'ADMIN', {
        permissionAlreadyGranted: true,
      });
      setAdminPushEnabled(subscribed);
    } else {
      setAdminPushEnabled(false);
    }
  }, [adminPhone]);

  // Keep admin notifications auto-on by re-checking subscription state
  useEffect(() => {
    ensureAdminPushSubscription();

    const onFocus = () => { ensureAdminPushSubscription(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureAdminPushSubscription();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => {
      if (!adminPushEnabled) {
        ensureAdminPushSubscription();
      }
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [adminPushEnabled, ensureAdminPushSubscription]);

  const handleEnableAdminNotifications = useCallback(async () => {
    setEnablingAdminPush(true);
    try {
      await pushNotificationService.initialize();
      const granted = await pushNotificationService.requestPermission();
      setAdminPushPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

      if (!granted) {
        setAdminPushEnabled(false);
        return;
      }

      const subscribed = await pushNotificationService.subscribeUser(adminPhone, 'ADMIN', {
        permissionAlreadyGranted: true,
      });
      setAdminPushEnabled(subscribed);
    } catch (error) {
      console.error('Failed to enable admin push notifications:', error);
      setAdminPushEnabled(false);
    } finally {
      setEnablingAdminPush(false);
    }
  }, [adminPhone]);

  const handleLoadPushSubCount = useCallback(async () => {
    setLoadingPushSubCount(true);
    setTestPushResult(null);
    try {
      const res = await getAdminPushSubscriptions();
      setPushSubCount({
        total: res.data.total,
        adminCount: res.data.adminCount,
        subscriptions: res.data.subscriptions ?? [],
      });
    } catch {
      setPushSubCount(null);
    } finally {
      setLoadingPushSubCount(false);
    }
  }, []);

  const handleSendTestPush = useCallback(async () => {
    setSendingTestPush(true);
    setTestPushResult(null);
    try {
      const res = await sendAdminTestPush();
      setTestPushResult(res.data);
    } catch {
      setTestPushResult({ success: false, message: 'Request failed — check backend logs.' });
    } finally {
      setSendingTestPush(false);
    }
  }, []);

  const resetPushDebug = useCallback(() => {
    setPushSubCount(null);
    setTestPushResult(null);
  }, []);

  return {
    adminPushPermission,
    adminPushEnabled,
    enablingAdminPush,
    pushSubCount,
    loadingPushSubCount,
    sendingTestPush,
    testPushResult,
    handleEnableAdminNotifications,
    handleLoadPushSubCount,
    handleSendTestPush,
    resetPushDebug,
  };
}

