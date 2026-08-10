import { IStaff, CreateStaffDTO, UpdateStaffDTO, GetStaffFilters } from '@/types/staff';
import { useAuthStore } from '@/store/useAuthStore';

// Normalize base URL so it ALWAYS resolves to https://medxverse-backend.onrender.com/api/v1
const DEFAULT_HOST = 'https://medxverse-backend.onrender.com';
const RAW_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_HOST).trim().replace(/\/+$/, '');
const API_BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`;

/**
 * Multi-layered token retrieval:
 * 1. Zustand state in memory (`useAuthStore.getState().token`)
 * 2. Standalone `localStorage.getItem('token')`
 * 3. Persisted Zustand state object (`medxverse-auth-storage`)
 */
const getAuthHeaders = (): Record<string, string> => {
  let token = '';

  // 1. Direct from active Zustand store
  try {
    token = useAuthStore.getState().token || '';
  } catch {
    // Fail silently if store is uninitialized
  }

  // 2. Fallback to standalone localStorage key
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('token') || '';
  }

  // 3. Fallback to parsing Zustand persisted storage directly
  if (!token && typeof window !== 'undefined') {
    try {
      const authStorage = localStorage.getItem('medxverse-auth-storage');
      if (authStorage) {
        token = JSON.parse(authStorage)?.state?.token || '';
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Helper to safely handle non-JSON responses (404/500 HTML pages)
 * and prevent "Unexpected token '<'" JSON parse crashes.
 */
async function handleResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!isJson) {
    throw new Error(
      `Server returned ${res.status} (${res.statusText}) instead of JSON. Endpoint '${res.url}' may be incorrect or unavailable.`
    );
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || defaultErrorMessage);
  }

  return json;
}

export class StaffApiService {
  public static async getStaff(filters?: GetStaffFilters): Promise<{ success: boolean; count: number; data: IStaff[] }> {
    const params = new URLSearchParams();

    if (filters?.role && filters.role !== 'ALL') params.append('role', filters.role);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    if (filters?.isActive !== undefined && filters.isActive !== 'ALL') {
      params.append('isActive', String(filters.isActive));
    }

    const queryString = params.toString();
    const url = queryString ? `${API_BASE_URL}/staff?${queryString}` : `${API_BASE_URL}/staff`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });

    return handleResponse<{ success: boolean; count: number; data: IStaff[] }>(
      res,
      'Failed to fetch staff members'
    );
  }

  public static async getStaffById(id: string): Promise<IStaff> {
    const res = await fetch(`${API_BASE_URL}/staff/${id}`, {
      headers: getAuthHeaders(),
    });

    const json = await handleResponse<{ data: IStaff }>(res, 'Failed to fetch staff details');
    return json.data;
  }

  public static async createStaff(dto: CreateStaffDTO): Promise<IStaff> {
    const res = await fetch(`${API_BASE_URL}/staff`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    const json = await handleResponse<{ data: IStaff }>(res, 'Failed to create staff member');
    return json.data;
  }

  public static async updateStaff(id: string, dto: UpdateStaffDTO): Promise<IStaff> {
    const res = await fetch(`${API_BASE_URL}/staff/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto),
    });

    const json = await handleResponse<{ data: IStaff }>(res, 'Failed to update staff member');
    return json.data;
  }

  public static async toggleStaffStatus(id: string): Promise<IStaff> {
    const res = await fetch(`${API_BASE_URL}/staff/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    const json = await handleResponse<{ data: IStaff }>(res, 'Failed to toggle staff status');
    return json.data;
  }
}