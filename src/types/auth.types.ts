export enum AccountType {
  HOSPITAL = 'HOSPITAL',
  HMO = 'HMO',
}

export interface AccountPayload {
  id?: string;
  name: string;
  email: string;
  accountType: AccountType;
  phone?: string;
  code?: string;
  address?: string;
  modules?: string[]; // <--- Added module permissions array
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    account: AccountPayload;
  };
}