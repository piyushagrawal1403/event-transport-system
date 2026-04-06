import { useState, useEffect } from 'react';
import { pushNotificationService } from '../../../services/PushNotificationService';

export function useGuestPush(guestPhone: string) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!guestPhone) return;

    let active = true;
    const enableGuestPush = async () => {
      try {
        await pushNotificationService.initialize();

        if (typeof Notification === 'undefined') return;

        let granted = Notification.permission === 'granted';
        if (!granted && Notification.permission === 'default') {
          granted = await pushNotificationService.requestPermission();
        }

        if (granted && active) {
          await pushNotificationService.subscribeUser(guestPhone, 'GUEST', {
            permissionAlreadyGranted: true,
          });
          setInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize guest push notifications:', error);
      }
    };

    enableGuestPush();
    return () => { active = false; };
  }, [guestPhone]);

  const unsubscribe = async () => {
    await pushNotificationService.unsubscribeUser();
  };

  return { initialized, unsubscribe };
}

