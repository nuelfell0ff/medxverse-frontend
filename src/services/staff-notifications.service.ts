import { apiClient } from '@/lib/api-client';
import { StaffNotificationFeed } from '@/types/staff-notifications';

export const staffNotificationsService = {
  async getFeed(params: { windowMinutes?: number; limit?: number } = {}): Promise<StaffNotificationFeed> {
    const response = await apiClient.get('/staff-notifications', { params });
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/staff-notifications/unread-count');
    return Number(response.data?.unreadCount || 0);
  },
};
