export enum TriagePriority {
  IMMEDIATE = 'IMMEDIATE',     // Red
  VERY_URGENT = 'VERY_URGENT', // Orange
  URGENT = 'URGENT',           // Yellow
  STANDARD = 'STANDARD',       // Green
  NON_URGENT = 'NON_URGENT',   // Blue
}

export enum ConsultationStatus {
  IN_QUEUE = 'IN_QUEUE',
  WITH_NURSE = 'WITH_NURSE',
  WAITING_FOR_DOCTOR = 'WAITING_FOR_DOCTOR',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IVitalSigns {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  height?: number;
  weight?: number;
  bmi?: number;
}

export interface IPatientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface IDoctorSummary {
  _id: string;
  firstName: string;
  lastName: string;
  role?: string;
  department?: string;
}

export interface IOutpatientEncounter {
  _id: string;
  hospitalId: string;
  patientId: IPatientSummary;
  doctorId?: IDoctorSummary;
  departmentId?: string;
  triagePriority: TriagePriority;
  status: ConsultationStatus;
  chiefComplaint: string;
  vitalSigns?: IVitalSigns;
  nursingNotes?: string;
  consultationNotes?: string;
  diagnoses?: string[];
  queuedAt: string;
  consultationStartedAt?: string;
  consultationEndedAt?: string;
  createdAt: string;
}

export const TRIAGE_CONFIG: Record<TriagePriority, { label: string; badge: string; border: string }> = {
  [TriagePriority.IMMEDIATE]: {
    label: 'Immediate',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    border: 'border-l-red-500',
  },
  [TriagePriority.VERY_URGENT]: {
    label: 'Very Urgent',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
    border: 'border-l-orange-500',
  },
  [TriagePriority.URGENT]: {
    label: 'Urgent',
    badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
    border: 'border-l-yellow-500',
  },
  [TriagePriority.STANDARD]: {
    label: 'Standard',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    border: 'border-l-emerald-500',
  },
  [TriagePriority.NON_URGENT]: {
    label: 'Non-Urgent',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    border: 'border-l-blue-500',
  },
};

export const STATUS_CONFIG: Record<ConsultationStatus, { label: string; badge: string }> = {
  [ConsultationStatus.IN_QUEUE]: { label: 'In Queue', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  [ConsultationStatus.WITH_NURSE]: { label: 'With Nurse', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  [ConsultationStatus.WAITING_FOR_DOCTOR]: { label: 'Awaiting Doctor', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  [ConsultationStatus.IN_CONSULTATION]: { label: 'In Consultation', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  [ConsultationStatus.COMPLETED]: { label: 'Completed', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  [ConsultationStatus.CANCELLED]: { label: 'Cancelled', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
};