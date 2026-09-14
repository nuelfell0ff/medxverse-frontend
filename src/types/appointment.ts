export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  FOLLOW_UP = 'FOLLOW_UP',
  EMERGENCY = 'EMERGENCY',
  ROUTINE_CHECKUP = 'ROUTINE_CHECKUP',
  SURGERY_PREP = 'SURGERY_PREP',
}

export enum QueuePriority {
  ROUTINE = 'ROUTINE',
  PRIORITY = 'PRIORITY',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY',
}

export enum QueueTicketStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_SERVICE = 'IN_SERVICE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface IPopulatedPatient {
  _id: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface IPopulatedDoctor {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
}

export interface IAppointment {
  _id: string;
  hospitalId?: string;
  patientId?: IPopulatedPatient | string | null;
  doctorId?: IPopulatedDoctor | string | null;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  department?: string;
  durationMinutes?: number;
  priority?: QueuePriority;
  source?: string;
  reason?: string;
  notes?: string;
  noShowRiskScore?: number;
  noShowRiskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  reminderPolicyMinutes?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  type: AppointmentType;
  department?: string;
  durationMinutes?: number;
  priority?: QueuePriority;
  source?: string;
  reminderPolicyMinutes?: number[];
  reason?: string;
  notes?: string;
}

export interface UpdateAppointmentStatusDTO {
  status: AppointmentStatus;
  notes?: string;
}

export interface GetAppointmentsQueryDTO {
  patientId?: string;
  doctorId?: string;
  providerId?: string;
  status?: AppointmentStatus | string;
  date?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAppointmentsResponse {
  success: boolean;
  appointments?: IAppointment[];
  data?: IAppointment[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
}

export interface IQueueTicket {
  _id: string;
  hospitalId?: string;
  patientId?: IPopulatedPatient | string | null;
  appointmentId?: string;
  providerId?: string;
  department?: string;
  ticketNumber?: string;
  priority: QueuePriority;
  status: QueueTicketStatus;
  position?: number;
  delayMinutes?: number;
  sequenceScore?: number;
  checkedInAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  notes?: string;
}

export interface IProviderSchedule {
  _id?: string;
  providerId: string;
  department?: string;
  timezone?: string;
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  blockedTimes: Array<{
    startAt: string;
    endAt: string;
    reason?: string;
  }>;
  rules: Array<{
    type: AppointmentType;
    durationMinutes: number;
    bufferMinutes?: number;
  }>;
  queueRules: {
    appointmentWeight: number;
    arrivalWeight: number;
    priorityWeight: number;
    delayWeight: number;
  };
  reminderMinutes: number[];
  active: boolean;
}
