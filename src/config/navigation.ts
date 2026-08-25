import {
  Users,
  Calendar,
  CalendarClock,
  FileCheck,
  ShieldCheck,
  Receipt,
  Bed,
  Pill,
  Building2,
  BarChart3,
  CreditCard,
  Settings,
  UserCog,
  Stethoscope,
  Syringe,
  ScanLine,
  FlaskConical,
} from 'lucide-react';

import { AccountType } from '@/types/auth.types';

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  moduleKey?: string;
}

export const NAV_CONFIG: Record<AccountType, NavItem[]> = {
  [AccountType.HOSPITAL]: [
    {
      label: 'Hospital Overview',
      href: '/hms',
      icon: Building2,
    },

    {
      label: 'Patients EMR',
      href: '/hms/patients',
      icon: Users,
      moduleKey: 'patients',
    },

    {
      label: 'Outpatient Clinic',
      href: '/hms/outpatients',
      icon: Stethoscope,
      moduleKey: 'outpatient',
    },

    {
      label: 'Surgery & OT',
      href: '/hms/surgery',
      icon: Syringe,
      moduleKey: 'surgery',
    },

    {
      label: 'Radiology',
      href: '/hms/radiology',
      icon: ScanLine,
      moduleKey: 'radiology',
    },

    {
      label: 'Laboratory',
      href: '/hms/lab',
      icon: FlaskConical,
      moduleKey: 'lab',
    },

    {
      label: 'Appointments',
      href: '/hms/appointments',
      icon: Calendar,
      moduleKey: 'appointments',
    },

    {
      label: 'Staff Management',
      href: '/hms/staff',
      icon: UserCog,
      moduleKey: 'staff',
    },

    {
      label: 'Staff Rostering',
      href: '/hms/staff-roster',
      icon: CalendarClock,
      moduleKey: 'staff_roster',
    },

    {
      label: 'Pharmacy',
      href: '/hms/pharmacy',
      icon: Pill,
      moduleKey: 'pharmacy',
    },

    // {
    //   label: 'Bed Management',
    //   href: '/hms/beds',
    //   icon: Bed,
    //   moduleKey: 'beds',
    // },

    {
      label: 'Billing & Invoices',
      href: '/hms/billing',
      icon: Receipt,
      moduleKey: 'billing',
    },
  ],

  [AccountType.HMO]: [
    {
      label: 'HMO Hub',
      href: '/hmo',
      icon: BarChart3,
    },

    {
      label: 'Claims Adjudication',
      href: '/hmo/claims',
      icon: FileCheck,
      moduleKey: 'claims',
    },

    {
      label: 'Pre-Authorizations',
      href: '/hmo/pre-auth',
      icon: ShieldCheck,
      moduleKey: 'pre_auth',
    },

    {
      label: 'Enrollee Registry',
      href: '/hmo/enrollees',
      icon: Users,
      moduleKey: 'enrollees',
    },

    {
      label: 'Tariffs & Plans',
      href: '/hmo/tariffs',
      icon: CreditCard,
      moduleKey: 'tariffs',
    },

    {
      label: 'Settings',
      href: '/hmo/settings',
      icon: Settings,
    },
  ],
};