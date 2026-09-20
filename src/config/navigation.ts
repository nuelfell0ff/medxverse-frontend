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
  Siren,
  HeartPulse,
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
      label: 'Emergency Department',
      href: '/hms/emergency',
      icon: Siren,
      moduleKey: 'emergency',
    },

    {
      label: 'Intensive Care Unit',
      href: '/hms/icu',
      icon: HeartPulse,
      moduleKey: 'icu',
    },

    {
      label: 'Bed & Ward Management',
      href: '/hms/bed-ward',
      icon: Bed,
      moduleKey: 'bed_ward',
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