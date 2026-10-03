import { useAuthStore } from '@/store/useAuthStore';

export const AUTH_LOGIN_PATH = '/auth/login';

export function handleUnauthorizedResponse() {
  if (typeof window === 'undefined') return;

  if (window.location.pathname === AUTH_LOGIN_PATH) return;

  useAuthStore.getState().logout();

  const currentPath = `${window.location.pathname}${window.location.search}`;

  window.location.replace(
    `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(currentPath)}`
  );
}
