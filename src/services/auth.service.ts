import { apiClient } from '@/lib/api-client';
import { ApiResponse, AuthResponseData, LoginDTO, RegisterDTO, AccountPayload } from '@/types/auth.types';

export const authService = {
  register: async (dto: RegisterDTO): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post('/auth/register', dto);
  },

  login: async (dto: LoginDTO): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post('/auth/login', dto);
  },

  getProfile: async (): Promise<ApiResponse<AccountPayload>> => {
    return apiClient.get('/auth/me');
  },

  updateProfile: async (input: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
  }): Promise<ApiResponse<AccountPayload>> => {
    return apiClient.patch('/auth/me', input);
  },

  changePassword: async (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse<{ changedAt: string }>> => {
    return apiClient.post('/auth/change-password', input);
  },
};
