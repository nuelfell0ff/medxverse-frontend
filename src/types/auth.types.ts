export enum AccountType {
  HOSPITAL = 'HOSPITAL',
  HMO = 'HMO',
  PATIENT_PORTAL = 'PATIENT_PORTAL',
}

export interface AccountPayload {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  accountType: AccountType;
  phone?: string;
  code?: string;
  address?: string;
  modules?: string[];
  userType?: 'ACCOUNT' | 'STAFF' | 'PATIENT';
  role?: string;
  staffId?: string;
  userId?: string;
  hospitalId?: string;
  patientId?: string;
  mrn?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  logoUrl?: string;
  isActive?: boolean;

  // Hospital context fields for multi-tenant isolation
  hospital?: string | { _id?: string; id?: string; name?: string };
}

export interface AuthResponseData {
  token: string;
  account: AccountPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse extends ApiResponse<AuthResponseData> {}

export interface LoginDTO {
  email: string;
  password?: string;
  code?: string;
  accountType?: AccountType;
  [key: string]: any;
}

export interface RegisterDTO {
  name?: string;
  email: string;
  password?: string;
  accountType: AccountType;
  phone?: string;
  code?: string;
  address?: string;
  [key: string]: any;
}