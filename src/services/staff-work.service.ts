import { apiClient } from '@/lib/api-client';
import {
  WorkActivityResponse,
  WorkModuleKey,
  WorkTask,
  WorkTaskStatus,
  WorkTicket,
  WorkTicketStatus,
  PaginatedWorkResponse,
} from '@/types/staff-work';

type ListParams = {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  module?: WorkModuleKey;
  search?: string;
  from?: string;
  to?: string;
};

export const staffWorkService = {
  async getTasks(params: ListParams = {}): Promise<PaginatedWorkResponse<WorkTask>> {
    const response = await apiClient.get('/staff-work/tasks', { params });
    return response.data;
  },

  async getTask(id: string): Promise<WorkTask> {
    const response = await apiClient.get(`/staff-work/tasks/${encodeURIComponent(id)}`);
    return response.data;
  },

  async createTask(input: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: WorkTaskStatus;
    assignedTo: string;
    patientId?: string;
    relatedModule?: WorkModuleKey;
    relatedRecordId?: string;
    dueAt?: string;
  }): Promise<WorkTask> {
    const response = await apiClient.post('/staff-work/tasks', input);
    return response.data;
  },

  async updateTask(id: string, input: Record<string, unknown>): Promise<WorkTask> {
    const response = await apiClient.patch(`/staff-work/tasks/${encodeURIComponent(id)}`, input);
    return response.data;
  },

  async getTickets(params: ListParams = {}): Promise<PaginatedWorkResponse<WorkTicket>> {
    const response = await apiClient.get('/staff-work/tickets', { params });
    return response.data;
  },

  async getTicket(id: string): Promise<WorkTicket> {
    const response = await apiClient.get(`/staff-work/tickets/${encodeURIComponent(id)}`);
    return response.data;
  },

  async createTicket(input: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    patientId?: string;
    relatedModule?: WorkModuleKey;
    relatedRecordId?: string;
  }): Promise<WorkTicket> {
    const response = await apiClient.post('/staff-work/tickets', input);
    return response.data;
  },

  async updateTicket(id: string, input: Record<string, unknown>): Promise<WorkTicket> {
    const response = await apiClient.patch(`/staff-work/tickets/${encodeURIComponent(id)}`, input);
    return response.data;
  },

  async addTicketComment(id: string, body: string): Promise<WorkTicket> {
    const response = await apiClient.post(
      `/staff-work/tickets/${encodeURIComponent(id)}/comments`,
      { body },
    );
    return response.data;
  },

  async getActivity(params: ListParams = {}): Promise<WorkActivityResponse> {
    const response = await apiClient.get('/staff-work/activity', { params });
    return response.data;
  },
};
