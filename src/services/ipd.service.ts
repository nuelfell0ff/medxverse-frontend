import { apiClient } from '@/lib/api-client';

export interface IWard {
  _id: string;
  hospitalId: string;
  name: string;
  type: string;
  capacity: number;
  isOperational: boolean;
}

export interface IBed {
  _id: string;
  hospitalId: string;
  wardId: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING';
  dailyRate: number;
}

export const ipdService = {
  getWards: async (hospitalId: string): Promise<IWard[]> => {
    return apiClient.get(`/ipd/wards?hospitalId=${hospitalId}`);
  },

  getBedsByWard: async (hospitalId: string, wardId: string): Promise<IBed[]> => {
    return apiClient.get(`/ipd/beds?hospitalId=${hospitalId}&wardId=${wardId}`);
  },

  updateBedStatus: async (hospitalId: string, bedId: string, status: string): Promise<IBed> => {
    return apiClient.patch(`/ipd/beds/${bedId}/status`, { hospitalId, status });
  },

  admitPatient: async (payload: any) => {
    return apiClient.post('/ipd/admit', payload);
  },

  dischargePatient: async (admissionId: string, payload: any) => {
    return apiClient.post(`/ipd/admissions/${admissionId}/discharge`, payload);
  },
};