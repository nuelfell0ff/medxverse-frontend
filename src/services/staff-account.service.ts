import { apiClient } from '@/lib/api-client';

export interface StaffProfileResponse {
  account: {
    id: string;
    email: string;
    role: string;
    status: string;
    isActive: boolean;
    lastLoginAt?: string;
    presenceStatus?: string;
    lastSeenAt?: string;
  };
  staff: {
    id: string;
    staffId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    title?: string;
    professionalTitle?: string;
    jobTitle?: string;
    profilePhotoUrl?: string;
    role: string;
    category?: string;
    classification?: string;
    contact: {
      phone?: string;
      alternatePhone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    department?: { id: string; name: string; code: string };
  };
  hospital: {
    id: string;
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
  };
}

export const staffAccountService = {
  async getProfile(): Promise<StaffProfileResponse> {
    const response = await apiClient.get('/auth/staff/me');
    return response.data;
  },

  async updateProfile(input: Record<string, unknown>): Promise<StaffProfileResponse> {
    const response = await apiClient.patch('/auth/staff/me', input);
    return response.data;
  },

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ changedAt: string }> {
    const response = await apiClient.post('/auth/staff/change-password', input);
    return response.data;
  },
};
