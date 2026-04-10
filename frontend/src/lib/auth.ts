export type UserRole = 'GUEST' | 'DRIVER' | 'ADMIN';

export interface AuthUser {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const AUTH_STORAGE_KEY = 'authSession';

const LEGACY_ROLE_KEYS = ['guestName', 'guestPhone', 'driverPhone'] as const;

const parseSession = (raw: string): AuthSession | null => {
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const getLegacyAwareValue = (key: (typeof LEGACY_ROLE_KEYS)[number]): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key) ?? '';
};

export const getAuthSession = (): AuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    const parsed = parseSession(raw);
    if (parsed) {
      return parsed;
    }
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  const legacyRaw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (legacyRaw) {
    const parsedLegacy = parseSession(legacyRaw);
    if (parsedLegacy) {
      // One-time migration from older app versions that used sessionStorage.
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedLegacy));
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return parsedLegacy;
    }
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return null;
};

export const getAuthToken = (): string | null => getAuthSession()?.token ?? null;

export const getHomeRouteForRole = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'DRIVER':
      return '/driver';
    case 'GUEST':
    default:
      return '/home';
  }
};

export const saveAuthSession = (session: AuthSession): void => {
  if (typeof window === 'undefined') {
    return;
  }

  clearLegacyRoleState();
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);

  if (session.user.role === 'GUEST') {
    window.localStorage.setItem('guestName', session.user.name);
    window.localStorage.setItem('guestPhone', session.user.phone);
  }

  if (session.user.role === 'DRIVER') {
    window.localStorage.setItem('driverPhone', session.user.phone);
  }
};

export const clearAuthSession = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  clearLegacyRoleState();
};

export const getGuestIdentity = (): { name: string; phone: string } => {
  const session = getAuthSession();
  if (session?.user.role === 'GUEST') {
    return { name: session.user.name, phone: session.user.phone };
  }

  return {
    name: getLegacyAwareValue('guestName'),
    phone: getLegacyAwareValue('guestPhone'),
  };
};

export const getDriverPhone = (): string => {
  const session = getAuthSession();
  if (session?.user.role === 'DRIVER') {
    return session.user.phone;
  }

  return getLegacyAwareValue('driverPhone');
};

const clearLegacyRoleState = () => {
  LEGACY_ROLE_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
};

