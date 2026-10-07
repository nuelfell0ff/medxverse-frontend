export type WorkModuleKey =
  | 'patients'
  | 'emergency'
  | 'icu'
  | 'bed_ward'
  | 'outpatient'
  | 'surgery'
  | 'radiology'
  | 'lab'
  | 'appointments'
  | 'pharmacy'
  | 'rostering'
  | 'other';

export type WorkTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE';

export type WorkTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type WorkTaskCategory =
  | 'GENERAL'
  | 'CLINICAL'
  | 'FOLLOW_UP'
  | 'REVIEW'
  | 'DOCUMENTATION'
  | 'ADMINISTRATIVE';

export type WorkTicketStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED';

export type WorkTicketPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'
  | 'CRITICAL';

export type WorkTicketCategory =
  | 'PATIENT'
  | 'CLINICAL'
  | 'APPOINTMENT'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'SURGERY'
  | 'EMERGENCY'
  | 'TECHNICAL'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export interface WorkStaffRef {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  staffId?: string;
  email?: string;
}

export interface WorkPatientRef {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
}

export interface WorkTask {
  _id: string;
  title: string;
  description?: string;
  category: WorkTaskCategory;
  priority: WorkTaskPriority;
  status: WorkTaskStatus;
  assignedTo?: WorkStaffRef;
  patientId?: WorkPatientRef;
  relatedModule?: WorkModuleKey;
  relatedRecordId?: string;
  dueAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkTicketComment {
  authorUserId?: string;
  authorStaffId?: string;
  body: string;
  createdAt?: string;
}

export interface WorkTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: WorkTicketCategory;
  priority: WorkTicketPriority;
  status: WorkTicketStatus;
  requesterStaffId?: WorkStaffRef;
  assignedTo?: WorkStaffRef;
  patientId?: WorkPatientRef;
  relatedModule?: WorkModuleKey;
  relatedRecordId?: string;
  comments?: WorkTicketComment[];
  resolvedAt?: string;
  closedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkActivityPatient {
  id: string;
  mrn?: string;
  name?: string;
}

export interface WorkActivity {
  id: string;
  sourceModule: WorkModuleKey;
  sourceType: string;
  sourceRecordId: string;
  title: string;
  summary: string;
  status?: string;
  priority?: string;
  occurredAt: string;
  patient?: WorkActivityPatient;
  readOnly: true;
  details: Record<string, unknown>;
}

export interface PaginatedWorkResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface WorkActivityResponse extends PaginatedWorkResponse<WorkActivity> {
  readOnly: true;
  modules: WorkModuleKey[];
}
