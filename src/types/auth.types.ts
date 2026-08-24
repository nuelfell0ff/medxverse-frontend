export enum AccountType {
  HOSPITAL = 'HOSPITAL',
  HMO = 'HMO',
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

  // Hospital context fields for multi-tenant isolation
  hospitalId?: string;
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