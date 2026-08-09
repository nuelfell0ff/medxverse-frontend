import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AccountPayload, AccountType } from '@/types/auth.types';

interface AuthState {
  account: AccountPayload | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (account: AccountPayload, token: string) => void;
  logout: () => void;

  // Helper Methods
  hasModule: (moduleKey: string | string[]) => boolean;
  isHmo: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      account: null,
      token: null,
      isAuthenticated: false,

      setAuth: (account, token) => {
        // Sync token to standard localStorage for direct fetch calls
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ account, token, isAuthenticated: true });
      },

      logout: () => {
        // Clean up direct localStorage token on sign out
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ account: null, token: null, isAuthenticated: false });
      },

      hasModule: (moduleKey: string | string[]) => {
        const userModules = get().account?.modules || [];

        // Fallback: If no modules list is defined for the account, allow access by default
        if (!userModules.length) return true;

        const normalizedUserModules = userModules.map((m) => m.toLowerCase());

        if (Array.isArray(moduleKey)) {
          return moduleKey.some((key) =>
            normalizedUserModules.includes(key.toLowerCase())
          );
        }

        return normalizedUserModules.includes(moduleKey.toLowerCase());
      },

      isHmo: () => get().account?.accountType === AccountType.HMO,
    }),
    {
      name: 'medxverse-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);