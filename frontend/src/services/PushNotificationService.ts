// src/services/PushNotificationService.ts
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from '../api/client';
import {
  getAppServiceWorkerRegistration,
  getExistingAppServiceWorkerRegistration,
  registerAppServiceWorker,
} from '../lib/serviceWorker';

export class PushNotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private lastSubscriptionFingerprint = '';

  async initialize(): Promise<void> {
    if (!window.isSecureContext) {
      console.warn('Push notifications require a secure context');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      this.serviceWorkerRegistration = await getAppServiceWorkerRegistration();

      if (!this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration = await registerAppServiceWorker();
      }

      await navigator.serviceWorker.ready;
      this.serviceWorkerRegistration = await getAppServiceWorkerRegistration();
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission already denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  async subscribeUser(
    userPhone: string,
    userType: 'ADMIN' | 'DRIVER' | 'GUEST',
    options?: { permissionAlreadyGranted?: boolean }
  ): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      await this.initialize();
    }

    if (!this.serviceWorkerRegistration) {
      console.warn('Service Worker not registered');
      return false;
    }

    try {
      const permission = options?.permissionAlreadyGranted ?? await this.requestPermission();
      if (!permission) {
        console.warn('Notification permission denied');
        return false;
      }

      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (!subscription) {
        const { data } = await getVapidPublicKey();
        const vapidPublicKey = data.vapidPublicKey?.trim();

        if (!vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return false;
        }

        subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const fingerprint = `${userType}:${userPhone}:${subscription.endpoint}`;
      if (this.lastSubscriptionFingerprint === fingerprint) {
        return true;
      }

      await subscribeToPush({
          endpoint: subscription.endpoint,
          'keys.p256dh': this.arrayBufferToBase64Url(subscription.getKey('p256dh')),
          'keys.auth': this.arrayBufferToBase64Url(subscription.getKey('auth')),
          userPhone,
          userType,
      });

      this.lastSubscriptionFingerprint = fingerprint;
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribeUser(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration = await getExistingAppServiceWorkerRegistration();
    }

    if (!this.serviceWorkerRegistration) {
      this.lastSubscriptionFingerprint = '';
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (!subscription) {
        this.lastSubscriptionFingerprint = '';
        return;
      }

      await unsubscribeFromPush(subscription.endpoint);
      await subscription.unsubscribe();
      this.lastSubscriptionFingerprint = '';
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
    return window.btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

export const pushNotificationService = new PushNotificationService();

