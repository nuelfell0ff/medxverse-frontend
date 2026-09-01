'use client';

import React, { useState } from 'react';
import {
  Activity,
  Microscope,
  Pill,
  Stethoscope,
  Syringe,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
} from 'lucide-react';
import type { ClinicalSummaryItem, PatientClinicalSummary } from '@/types/patient';

interface PatientClinicalSummaryProps {
  clinicalSummary: PatientClinicalSummary;
  isLoading?: boolean;
  patientBilling?: {
    totalCharges?: number | string | null;
    totalPaid?: number | string | null;
    totalPayments?: number | string | null;
    outstandingBalance?: number | string | null;
  } | null;
  isLoadingBilling?: boolean;
  billingError?: string | null;
  formatMoney?: (value: number | string | null | undefined) => string;
}

type DepartmentKey = 'surgery' | 'radiology' | 'laboratory' | 'pharmacy' | 'outpatient';

const departmentConfig: Record<
  DepartmentKey,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  surgery: {
    icon: <Syringe className="w-4 h-4" />,
    label: 'Surgery',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  radiology: {
    icon: <Microscope className="w-4 h-4" />,
    label: 'Radiology',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  laboratory: {
    icon: <Activity className="w-4 h-4" />,
    label: 'Laboratory',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  pharmacy: {
    icon: <Pill className="w-4 h-4" />,
    label: 'Pharmacy',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  outpatient: {
    icon: <Stethoscope className="w-4 h-4" />,
    label: 'Outpatient',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
};

const DepartmentSection: React.FC<{
  department: DepartmentKey;
  items: ClinicalSummaryItem[];
}> = ({ department, items }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = departmentConfig[department];

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 ${config.bgColor} ${config.color}`}>
            {config.icon}
          </span>
          <span>{config.label}</span>
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">
          {items.length} record{items.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 hover:bg-slate-100/50 transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">{config.label}</p>
            <p className="text-[11px] text-slate-400">Latest entries and notes</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="px-4 py-3.5 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 mb-1 leading-relaxed">
                      {item.title}
                    </p>
                    {item.date && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {item.status && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${getStatusBadgeClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>

                {item.summary && (
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {item.summary}
                  </p>
                )}

                {item.details && Object.keys(item.details).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {Object.entries(item.details).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-[11px]">
                        <span className="text-slate-400 block mb-0.5">
                          {formatLabel(key)}
                        </span>
                        <span className="text-slate-700 font-semibold">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BillingSection: React.FC<{
  patientBilling?: {
    totalCharges?: number | string | null;
    totalPaid?: number | string | null;
    totalPayments?: number | string | null;
    outstandingBalance?: number | string | null;
  } | null;
  isLoading?: boolean;
  error?: string | null;
  formatMoney?: (value: number | string | null | undefined) => string;
  clinicalBilling?: PatientClinicalSummary['billing'];
}> = ({
  patientBilling,
  isLoading,
  error,
  formatMoney,
  clinicalBilling,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const billing = patientBilling || clinicalBilling;
  const defaultFormatter = (value: number | string | null | undefined) => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const format = formatMoney || defaultFormatter;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-100 bg-amber-50 text-amber-600">
            <DollarSign className="w-4 h-4" />
          </span>
          <span>Billing & Payments</span>
        </h3>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 hover:bg-slate-100/50 transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">Billing Summary</p>
            <p className="text-[11px] text-slate-400">Charges, payments, and balance</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <div className="w-4 h-4 rounded-full border-2 border-[#1b7b68]/30 border-t-[#1b7b68] animate-spin" />
                  Loading billing information...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                <p className="text-xs font-semibold text-rose-600">{error}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-[10px] font-medium text-slate-400">Total Charges</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-800">
                      {format(billing?.totalCharges)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[10px] font-medium text-slate-400">Amount Paid</p>
                    <p className="mt-1 text-sm font-extrabold text-emerald-700">
                      {format((billing as any)?.totalPaid ?? (billing as any)?.totalPayments)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="text-[10px] font-medium text-slate-400">Balance Owed</p>
                    <p className="mt-1 text-sm font-extrabold text-amber-700">
                      {format((billing as any)?.outstandingBalance ?? (clinicalBilling?.balance ?? 0))}
                    </p>
                  </div>
                </div>

                {clinicalBilling?.items && clinicalBilling.items.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-1">
                    {clinicalBilling.items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                          {item.title}
                        </p>
                        {item.date && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const PatientClinicalSummaryView: React.FC<PatientClinicalSummaryProps> = ({
  clinicalSummary,
  isLoading,
  patientBilling,
  isLoadingBilling,
  billingError,
  formatMoney,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div className="w-8 h-8 rounded-full border-2 border-[#1b7b68]/20 border-t-[#1b7b68] animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            Loading clinical summary...
          </p>
        </div>
      </div>
    );
  }

  if (!clinicalSummary) {
    return (
      <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-100">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No clinical summary available</p>
      </div>
    );
  }

  const departments: DepartmentKey[] = [
    'surgery',
    'radiology',
    'laboratory',
    'pharmacy',
    'outpatient',
  ];
  const hasAnyClinicalData = departments.some(
    (dept) => clinicalSummary[dept]?.length > 0
  );

  return (
    <div className="space-y-6">
      {hasAnyClinicalData ? (
        departments.map((dept) =>
          clinicalSummary[dept]?.length > 0 ? (
            <DepartmentSection
              key={dept}
              department={dept}
              items={clinicalSummary[dept]}
            />
          ) : null
        )
      ) : (
        <div className="bg-slate-50 rounded-3xl p-8 text-center border border-slate-100">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No clinical records available</p>
        </div>
      )}

      <BillingSection
        patientBilling={patientBilling}
        isLoading={isLoadingBilling}
        error={billingError}
        formatMoney={formatMoney}
        clinicalBilling={clinicalSummary.billing}
      />
    </div>
  );
};

function getStatusBadgeClass(status: string): string {
  const lowerStatus = status.toLowerCase();
  if (
    lowerStatus.includes('complete') ||
    lowerStatus.includes('closed') ||
    lowerStatus.includes('paid')
  ) {
    return 'bg-green-100 text-green-700';
  }
  if (
    lowerStatus.includes('pending') ||
    lowerStatus.includes('progress') ||
    lowerStatus.includes('active')
  ) {
    return 'bg-blue-100 text-blue-700';
  }
  if (lowerStatus.includes('critical') || lowerStatus.includes('abnormal')) {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-slate-100 text-slate-700';
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || 'N/A';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export { PatientClinicalSummaryView as PatientClinicalSummary };
