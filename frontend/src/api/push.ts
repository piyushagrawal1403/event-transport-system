import api from './http';
import type { PushSubscriptionPayload, PushSubscriptionEntry } from './types';

export const subscribeToPush = (subscription: PushSubscriptionPayload) =>
    api.post('/api/v1/push/subscribe', subscription);

export const unsubscribeFromPush = (endpoint: string) =>
    api.post('/api/v1/push/unsubscribe', { endpoint });

export const getVapidPublicKey = () =>
    api.get<{ vapidPublicKey: string }>('/api/v1/push/vapid-public-key');

export const getAdminPushSubscriptions = () =>
    api.get<{ total: number; adminCount: number; subscriptions: PushSubscriptionEntry[] }>(
        '/api/v1/push/admin/subscriptions'
    );

export const sendAdminTestPush = () =>
    api.post<{ success: boolean; message: string }>('/api/v1/push/admin/test');

