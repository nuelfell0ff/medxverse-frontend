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
  getHospitalId: () => string | null;
}

// Helper to safely extract hospitalId across all account types and backend payloads
const extractHospitalId = (account: AccountPayload | null): string | null => {
  if (!account) return null;

  // 1. If this is a direct HOSPITAL account, its own account ID is the hospital ID
  if (account.accountType === AccountType.HOSPITAL) {
    return account.id || account._id || null;
  }

  // 2. Direct hospitalId field
  if (account.hospitalId) {
    return account.hospitalId;
  }

  // 3. Nested or string reference in hospital property
  if (typeof account.hospital === 'string') {
    return account.hospital;
  }

  if (account.hospital && typeof account.hospital === 'object') {
    return account.hospital._id || account.hospital.id || null;
  }

  // Fallback to top-level ID
  return account.id || account._id || null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      account: null,
      token: null,
      isAuthenticated: false,

      setAuth: (account, token) => {
        const hospitalId = extractHospitalId(account);

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          if (hospitalId) {
            localStorage.setItem('hospitalId', hospitalId);
          } else {
            localStorage.removeItem('hospitalId');
          }
        }

        set({ account, token, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('hospitalId');
        }

        set({ account: null, token: null, isAuthenticated: false });
      },

      getHospitalId: () => {
        return extractHospitalId(get().account);
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
      // Syncs standalone 'token' and 'hospitalId' whenever page refreshes or store rehydrates
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined' && state) {
          if (state.token) {
            localStorage.setItem('token', state.token);
          } else {
            localStorage.removeItem('token');
          }

          const hospitalId = extractHospitalId(state.account);
          if (hospitalId) {
            localStorage.setItem('hospitalId', hospitalId);
          } else {
            localStorage.removeItem('hospitalId');
          }
        }
      },
    }
  )
);