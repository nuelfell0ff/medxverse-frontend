import {
  RadiologyOrder,
  RadiologyOrdersResponse,
  CreateRadiologyOrderInput,
  ImagingModality,
  RadiologyOrderStatus,
  PriorityLevel,
  ExaminationQueueStatus,
  AssignmentRole,
  ContrastStatus,
  PregnancyScreeningStatus,
  CriticalResultStatus,
  AIStudyPriority,
} from '@/types/radiology';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com';

const BASE_URL = `${API_BASE_URL}/api/v1/radiology`;

const getHeaders = (): HeadersInit => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token')
      : null;

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        `Radiology request failed (${response.status})`
    );
  }

  return json?.data ?? json;
}

export const RadiologyApiService = {
  async getOrders(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: RadiologyOrderStatus;
    modality?: ImagingModality;
    priority?: PriorityLevel;
    queueStatus?: ExaminationQueueStatus;
    scheduledDate?: string;
  }): Promise<RadiologyOrdersResponse> {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        query.set(key, String(value));
      }
    });

    return request<RadiologyOrdersResponse>(
      `?${query.toString()}`
    );
  },

  async getOrder(id: string): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}`);
  },

  async createOrder(
    payload: CreateRadiologyOrderInput
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateOrder(
    id: string,
    payload: Partial<CreateRadiologyOrderInput>
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async scheduleOrder(
    id: string,
    payload: {
      scheduledDate: string;
      scheduledStartTime?: string;
      scheduledEndTime?: string;
      estimatedDurationMinutes?: number;
      modalityId?: string;
      theatreOrRoom?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async assignStaff(
    id: string,
    payload: {
      userId: string;
      role: AssignmentRole;
      notes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/staff`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async removeStaff(
    id: string,
    userId: string,
    role: AssignmentRole
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(
      `/${id}/staff?userId=${encodeURIComponent(
        userId
      )}&role=${encodeURIComponent(role)}`,
      {
        method: 'DELETE',
      }
    );
  },

  async updateStatus(
    id: string,
    payload: {
      status: RadiologyOrderStatus;
      notes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateQueue(
    id: string,
    payload: {
      queuePosition?: number;
      queueStatus?: ExaminationQueueStatus;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/queue`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updatePacs(
    id: string,
    payload: Record<string, unknown>
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/pacs`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateContrast(
    id: string,
    payload: {
      status?: ContrastStatus;
      contrastName?: string;
      contrastType?: string;
      dose?: number;
      doseUnit?: string;
      route?: string;
      reactionObserved?: boolean;
      reactionDescription?: string;
      notes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/contrast`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updatePregnancyScreening(
    id: string,
    payload: {
      status?: PregnancyScreeningStatus;
      testType?: string;
      testResult?: string;
      notes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(
      `/${id}/pregnancy-screening`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  async updateRadiation(
    id: string,
    payload: Record<string, unknown>
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/radiation`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async completeReport(
    id: string,
    payload: {
      findings: string;
      impression: string;
      radiologistNotes?: string;
      templateId?: string;
      criticalResult?: {
        status?: CriticalResultStatus;
        finding?: string;
        notifiedUserId?: string;
        notificationMethod?:
          | 'PHONE'
          | 'SMS'
          | 'EMAIL'
          | 'IN_APP';
        notificationNotes?: string;
      };
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/report`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async signReport(id: string): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/report/sign`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  },

  async amendReport(
    id: string,
    payload: {
      findings: string;
      impression: string;
      radiologistNotes?: string;
      amendmentReason: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/report/amend`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateCriticalResult(
    id: string,
    payload: {
      status?: CriticalResultStatus;
      finding?: string;
      notifiedUserId?: string;
      notificationMethod?:
        | 'PHONE'
        | 'SMS'
        | 'EMAIL'
        | 'IN_APP';
      notificationNotes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(
      `/${id}/report/critical-result`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  async updateAIAnalysis(
    id: string,
    payload: {
      enabled?: boolean;
      modelName?: string;
      modelVersion?: string;
      priority?: AIStudyPriority;
      confidence?: number;
      findings?: string[];
      measurements?: Record<string, number>;
      recommendations?: string[];
      qualityPassed?: boolean;
      qualityNotes?: string;
    }
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/ai-analysis`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async cancelOrder(
    id: string,
    cancellationReason: string
  ): Promise<RadiologyOrder> {
    return request<RadiologyOrder>(`/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({
        cancellationReason,
      }),
    });
  },
};