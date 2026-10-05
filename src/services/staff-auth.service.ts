import { apiClient } from '@/lib/api-client';

export interface StaffInvitationPreview {
  id: string;
  email: string;
  role?: string;
  expiresAt: string;
  staff?: {
    id: string;
    staffId?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  hospital?: {
    id: string;
    name?: string;
    code?: string;
    logoUrl?: string;
  };
}

export interface StaffAuthResponse {
  token: string;
  staff: {
    id: string;
    staffId: string;
    hospitalId: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export const staffAuthService = {
  previewInvitation: async (
    token: string
  ): Promise<{ success: boolean; data: StaffInvitationPreview }> => {
    return apiClient.get(`/auth/staff/invitation/${encodeURIComponent(token)}`);
  },

  acceptInvitation: async (
    token: string,
    password: string
  ): Promise<{ success: boolean; data: StaffAuthResponse }> => {
    return apiClient.post('/auth/staff/invitation/accept', {
      token,
      password,
    });
  },

  login: async (
    email: string,
    password: string,
    hospitalCode?: string
  ): Promise<{ success: boolean; data: StaffAuthResponse }> => {
    return apiClient.post('/auth/staff/login', {
      email,
      password,
      ...(hospitalCode?.trim()
        ? { hospitalCode: hospitalCode.trim() }
        : {}),
    });
  },
};
