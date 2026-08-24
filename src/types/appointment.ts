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

export interface IPopulatedPatient {
  _id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface IPopulatedDoctor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
}

export interface IAppointment {
  _id: string;
  hospitalId: string;
  patientId: IPopulatedPatient | string;
  doctorId: IPopulatedDoctor | string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  type: AppointmentType;
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
  status?: AppointmentStatus;
  date?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAppointmentsResponse {
  success: boolean;
  appointments: IAppointment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}