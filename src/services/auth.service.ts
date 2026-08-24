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
};