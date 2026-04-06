import { useState, useEffect } from 'react';
import { pushNotificationService } from '../../../services/PushNotificationService';

export function useDriverPush(phone: string) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!phone) return;

    let active = true;
    const ensureDriverPushSubscription = async () => {
      try {
        await pushNotificationService.initialize();

        if (typeof Notification === 'undefined') return;

        let granted = Notification.permission === 'granted';
        if (!granted && Notification.permission === 'default') {
          granted = await pushNotificationService.requestPermission();
        }

        if (granted && active) {
          await pushNotificationService.subscribeUser(phone, 'DRIVER', {
            permissionAlreadyGranted: true,
          });
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize driver push notifications:', error);
      }
    };

    ensureDriverPushSubscription();
    return () => { active = false; };
  }, [phone]);

  const unsubscribe = async () => {
    await pushNotificationService.unsubscribeUser();
  };

  return { initialized, unsubscribe };
}

