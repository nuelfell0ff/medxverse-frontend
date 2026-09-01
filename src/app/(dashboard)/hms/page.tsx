'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  FileText,
  UserCheck,
  Plus,
  UserPlus,
  Clock,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppointmentApiService } from '@/services/appointment.service';
import type {
  AppointmentStatus,
  IAppointment,
  IPopulatedDoctor,
  IPopulatedPatient,
} from '@/types/appointment';
import { PatientApiService } from '@/services/patient.service';
import { StaffApiService } from '@/services/staff.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com';

type DashboardKpi = {
  title: string;
  value: number | null;
  sub: string;
  icon: typeof Users;
};

type RevenuePeriod = 'week' | 'month' | 'year';

type BillingChartTransaction = {
  amount?: number;
  netAmount?: number;
  grossAmount?: number;
  chargeDate?: string;
  paidAt?: string;
  createdAt?: string;
};

type RevenuePoint = {
  label: string;
  charges: number;
  payments: number;
};

function buildSmoothRevenuePath(
  points: RevenuePoint[],
  valueKey: 'charges' | 'payments',
  maximum: number
): string {
  const chartPoints = points.map((point, index) => ({
    x: points.length === 1 ? 150 : (index / (points.length - 1)) * 300,
    y: 94 - (point[valueKey] / maximum) * 78,
  }));

  if (chartPoints.length === 0) return '';
  if (chartPoints.length === 1) {
    return `M ${chartPoints[0].x} ${chartPoints[0].y}`;
  }

  let path = `M ${chartPoints[0].x} ${chartPoints[0].y}`;

  chartPoints.slice(0, -1).forEach((point, index) => {
    const nextPoint = chartPoints[index + 1];
    const previousPoint = chartPoints[index - 1] || point;
    const followingPoint = chartPoints[index + 2] || nextPoint;
    const controlOne = {
      x: point.x + (nextPoint.x - previousPoint.x) / 6,
      y: point.y + (nextPoint.y - previousPoint.y) / 6,
    };
    const controlTwo = {
      x: nextPoint.x - (followingPoint.x - point.x) / 6,
      y: nextPoint.y - (followingPoint.y - point.y) / 6,
    };

    path += ` C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${nextPoint.x} ${nextPoint.y}`;
  });

  return path;
}

function getDashboardToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken')
  );
}

function getDashboardHeaders(): HeadersInit {
  const token = getDashboardToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatAppointmentTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function getAppointmentStatusLabel(status: AppointmentStatus): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAppointmentStatusClass(status: AppointmentStatus): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-600';
    case 'CHECKED_IN':
      return 'bg-violet-50 text-violet-600';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-600';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-rose-50 text-rose-600';
    default:
      return 'bg-amber-50 text-amber-600';
  }
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(19);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('week');
  const [revenueTransactions, setRevenueTransactions] = useState<{
    charges: BillingChartTransaction[];
    payments: BillingChartTransaction[];
  }>({ charges: [], payments: [] });
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [kpiData, setKpiData] = useState<DashboardKpi[]>([
    { title: 'Total Patients', value: null, sub: 'Loading patient count...', icon: Users },
    { title: 'Outpatients Today', value: null, sub: 'Loading today\'s outpatient count...', icon: Calendar },
    { title: 'Invoices', value: null, sub: 'Loading charges and payments...', icon: FileText },
    { title: 'Staff', value: null, sub: 'Loading active staff count...', icon: UserCheck },
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardKpis = async () => {
      const today = new Date();
      const dateKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-');

      const [patientsResult, outpatientsResult, billingResult, staffResult] =
        await Promise.allSettled([
          PatientApiService.getPatients({ page: 1, limit: 1 }),
          fetch(`${API_BASE_URL}/api/v1/outpatients/queue`, {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }).then(async (response) => {
            if (!response.ok) throw new Error('Failed to load outpatient queue');
            return response.json();
          }),
          Promise.all([
            fetch(`${API_BASE_URL}/api/v1/billing/charges?page=1&limit=1`, {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }).then((response) => response.json()),
            fetch(`${API_BASE_URL}/api/v1/billing/payments?page=1&limit=1`, {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }).then((response) => response.json()),
          ]),
          StaffApiService.getStaff({ isActive: true }),
        ]);

      if (cancelled) return;

      const patientCount =
        patientsResult.status === 'fulfilled'
          ? Number(patientsResult.value.total || 0)
          : null;

      const outpatientData =
        outpatientsResult.status === 'fulfilled'
          ? outpatientsResult.value?.data ?? outpatientsResult.value
          : [];
      const outpatientRows = Array.isArray(outpatientData)
        ? outpatientData
        : outpatientData?.encounters || outpatientData?.queue || [];
      const outpatientCount = Array.isArray(outpatientRows)
        ? outpatientRows.filter((encounter: { queuedAt?: string; createdAt?: string }) => {
            const encounterDate = encounter.queuedAt || encounter.createdAt;
            return encounterDate
              ? new Date(encounterDate).toISOString().slice(0, 10) === dateKey
              : false;
          }).length
        : null;

      const billingCount =
        billingResult.status === 'fulfilled'
          ? billingResult.value.reduce(
              (total: number, result: { data?: { total?: number }; total?: number }) =>
                total + Number(result.data?.total ?? result.total ?? 0),
              0
            )
          : null;

      const staffCount =
        staffResult.status === 'fulfilled'
          ? Number(staffResult.value.count ?? staffResult.value.data?.length ?? 0)
          : null;

      setKpiData([
        {
          title: 'Total Patients',
          value: patientCount,
          sub: 'Registered patients',
          icon: Users,
        },
        {
          title: 'Outpatients Today',
          value: outpatientCount,
          sub: 'Current-day outpatient encounters',
          icon: Calendar,
        },
        {
          title: 'Invoices',
          value: billingCount,
          sub: 'Charges plus payments',
          icon: FileText,
        },
        {
          title: 'Staff on duty',
          value: staffCount,
          sub: 'Active staff members',
          icon: UserCheck,
        },
      ]);
    };

    void loadDashboardKpis();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRevenue = async () => {
      setRevenueLoading(true);

      try {
        const [chargesResponse, paymentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/billing/charges?page=1&limit=100`, {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }),
          fetch(`${API_BASE_URL}/api/v1/billing/payments?page=1&limit=100`, {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }),
        ]);

        if (!chargesResponse.ok || !paymentsResponse.ok) {
          throw new Error('Failed to load revenue data');
        }

        const [chargesJson, paymentsJson] = await Promise.all([
          chargesResponse.json(),
          paymentsResponse.json(),
        ]);

        const getItems = (json: { data?: { items?: BillingChartTransaction[] }; items?: BillingChartTransaction[] }) =>
          json?.data?.items || json?.items || [];

        if (!cancelled) {
          setRevenueTransactions({
            charges: getItems(chargesJson),
            payments: getItems(paymentsJson),
          });
        }
      } catch (error) {
        console.error('Failed to load revenue data:', error);
        if (!cancelled) {
          setRevenueTransactions({ charges: [], payments: [] });
        }
      } finally {
        if (!cancelled) setRevenueLoading(false);
      }
    };

    void loadRevenue();

    return () => {
      cancelled = true;
    };
  }, []);

  const revenuePoints = useMemo<RevenuePoint[]>(() => {
    const today = new Date();
    const points: RevenuePoint[] = revenuePeriod === 'week'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => ({ label, charges: 0, payments: 0 }))
      : revenuePeriod === 'month'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((label) => ({ label, charges: 0, payments: 0 }))
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label) => ({ label, charges: 0, payments: 0 }));

    const getBucket = (dateValue?: string): number | null => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== today.getFullYear()) {
        return null;
      }

      if (revenuePeriod === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const dayDifference = Math.floor((date.getTime() - startOfWeek.getTime()) / 86400000);
        return dayDifference >= 0 && dayDifference < 7 ? dayDifference : null;
      }

      if (revenuePeriod === 'month') {
        if (date.getMonth() !== today.getMonth()) return null;
        return Math.min(3, Math.floor((date.getDate() - 1) / 7));
      }

      return date.getMonth();
    };

    revenueTransactions.charges.forEach((transaction) => {
      const bucket = getBucket(transaction.chargeDate || transaction.createdAt);
      if (bucket !== null) points[bucket].charges += Number(transaction.netAmount ?? transaction.grossAmount ?? 0);
    });

    revenueTransactions.payments.forEach((transaction) => {
      const bucket = getBucket(transaction.paidAt || transaction.createdAt);
      if (bucket !== null) points[bucket].payments += Number(transaction.amount ?? 0);
    });

    return points;
  }, [revenuePeriod, revenueTransactions]);

  const revenueMax = Math.max(
    ...revenuePoints.flatMap((point) => [point.charges, point.payments]),
    1
  );

  useEffect(() => {
    let cancelled = false;

    const loadTodayAppointments = async () => {
      try {
        const response = await AppointmentApiService.getAppointments({
          date: getLocalDateString(),
          page: 1,
          limit: 100,
        });

        if (!cancelled) {
          setAppointments(response.appointments || []);
        }
      } catch (error) {
        console.error('Failed to load today\'s appointments:', error);
        if (!cancelled) setAppointments([]);
      }
    };

    void loadTodayAppointments();

    return () => {
      cancelled = true;
    };
  }, []);

  const timelineTasks = [
    { id: '1', title: 'Morning Staff Meeting', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '2', title: 'Patient Consultation', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '3', title: 'Meeting with Guards', time: '08:00 AM', desc: 'Discuss team task for the day.' },
    { id: '4', title: 'Surgery', time: '08:00 AM', desc: 'Discuss team task for the day.' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300 font-sans">
      
      {/* Central Workspace (Left 8 Columns) */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Page Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Welcome back! Here's what's happening today.</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hms/appointments"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-2xl shadow-sm transition-all active:scale-98"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>New Appointment</span>
            </Link>
            <Link
              href="/hms/patients"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1b7b68] hover:bg-[#146253] text-white text-xs font-bold rounded-2xl shadow-md shadow-[#1b7b68]/20 transition-all active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Patient</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 font-semibold">{kpi.title}</span>
                  </div>
                  <span className="text-slate-300 hover:text-slate-500 cursor-pointer text-xs font-bold">•••</span>
                </div>

                <div className="flex items-baseline justify-between my-1">
                  <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    {kpi.value === null ? '—' : kpi.value.toLocaleString()}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Analytics Section (Revenue & Patient Overview Charts) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Revenue</h3>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                {(['week', 'month', 'year'] as RevenuePeriod[]).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setRevenuePeriod(period)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg transition-colors capitalize',
                      revenuePeriod === period
                        ? 'bg-[#1b7b68] text-white shadow-sm'
                        : 'hover:text-slate-800'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1b7b68]" /> charges</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> payments</span>
            </div>

            <div className="h-40 flex items-center justify-center border-b border-slate-50">
              {revenueLoading ? (
                <div className="w-full flex items-center justify-center text-xs text-slate-400">
                  Loading revenue...
                </div>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <path
                    d={buildSmoothRevenuePath(revenuePoints, 'charges', revenueMax)}
                    fill="none"
                    stroke="#1b7b68"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {revenuePoints.map((point, index) => {
                    const x = revenuePoints.length === 1
                      ? 150
                      : (index / (revenuePoints.length - 1)) * 300;
                    const y = 94 - (point.charges / revenueMax) * 78;

                    return (
                      <g key={`charges-${point.label}`}>
                        <circle cx={x} cy={y} r="3" fill="#1b7b68">
                          <title>
                            {`${point.label}: Charges ${point.charges.toLocaleString()}`}
                          </title>
                        </circle>
                      </g>
                    );
                  })}
                  <path
                    d={buildSmoothRevenuePath(revenuePoints, 'payments', revenueMax)}
                    fill="none"
                    stroke="#99f6e4"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {revenuePoints.map((point, index) => {
                    const x = revenuePoints.length === 1
                      ? 150
                      : (index / (revenuePoints.length - 1)) * 300;
                    const y = 94 - (point.payments / revenueMax) * 78;

                    return (
                      <g key={`payments-${point.label}`}>
                        <circle cx={x} cy={y} r="3" fill="#99f6e4">
                          <title>
                            {`${point.label}: Payments ${point.payments.toLocaleString()}`}
                          </title>
                        </circle>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              {revenuePoints.map((point) => <span key={point.label}>{point.label}</span>)}
            </div>
          </div>

          {/* Patient Overview Box */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">Patient Overview</h3>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                <span className="px-2.5 py-1 bg-[#1b7b68] text-white rounded-lg shadow-sm">Week</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Month</span>
                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">Year</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1b7b68]" /> incomes</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-300" /> incomes</span>
            </div>

            <div className="h-40 flex items-end justify-between px-2 gap-2 border-b border-slate-50 pb-2">
              {[60, 85, 70, 95, 65, 80, 90].map((h, i) => (
                <div key={i} className="flex gap-1 items-end h-full w-full justify-center">
                  <div className="w-2 bg-[#1b7b68] rounded-t-md transition-all duration-300 hover:opacity-80" style={{ height: `${h}%` }} />
                  <div className="w-2 bg-teal-200 rounded-t-md transition-all duration-300 hover:opacity-80" style={{ height: `${h - 25}%` }} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
          </div>
        </div>

        {/* Lower Grid: Today's Appointments & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Appointments (7 cols) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-slate-800">Today's Appointments</h3>
              <p className="text-[10px] text-slate-400">Upcoming and ongoing appointments</p>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-600 mt-3">
                    No appointments today
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    There are no appointments scheduled for the present day.
                  </p>
                </div>
              ) : appointments.map((item) => {
                const patient = typeof item.patientId === 'object'
                  ? item.patientId as IPopulatedPatient
                  : null;
                const doctor = typeof item.doctorId === 'object'
                  ? item.doctorId as IPopulatedDoctor
                  : null;
                const patientName = patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : 'Unknown patient';
                const doctorName = doctor
                  ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                  : 'Assigned doctor';

                return (
                <div key={item._id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(patientName)}`}
                        alt={patientName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{patientName}</h4>
                      <p className="text-[10px] text-slate-400">
                        {doctorName}{doctor?.department ? ` • ${doctor.department}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatAppointmentTime(item.startTime)}</span>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full',
                        getAppointmentStatusClass(item.status)
                      )}
                    >
                      {getAppointmentStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Alerts & Notifications (5 cols) */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-0.5">Alters & Notifications</h3>
              <p className="text-[10px] text-slate-400 mb-4">Important updates</p>

              <div className="space-y-2.5">
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">Low stock alert: Paracetamol tablets</span>
                </div>
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">3 appointments pending confirmation</span>
                </div>
                <div className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                  <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />
                  <span className="text-[11px] font-medium">Equipment maintenance due: MRI Machine</span>
                </div>
              </div>
            </div>

            {/* Bed Occupancy & Staff Indicator */}
            <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Bed Occupancy</span>
                  <span className="text-[#1b7b68]">83%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-1.5">248/300 beds occupied</p>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1b7b68] rounded-full" style={{ width: '83%' }} />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Staff on Duty</span>
                  <span className="text-[10px] text-slate-400">Today's shift</span>
                </div>
                <span className="text-base font-extrabold text-[#1b7b68]">165</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right Schedule Drawer (Right 4 Columns) */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Interactive Calendar Widget */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">September 2021</h3>
            <button className="p-1 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDate;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'bg-[#1b7b68] text-white font-bold shadow-md shadow-[#1b7b68]/30'
                      : 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline Schedule Cards */}
        <div className="space-y-3">
          {timelineTasks.map((task) => (
            <div key={task.id} className="relative pl-6">
              <div className="absolute left-0 top-5 w-3 h-3 rounded-full bg-[#1b7b68] ring-4 ring-white" />
              
              <div className="bg-[#1b7b68] text-white p-4 rounded-3xl shadow-lg shadow-[#1b7b68]/20 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold">{task.title}</h4>
                  <span className="text-[10px] font-semibold opacity-90">{task.time}</span>
                </div>
                <p className="text-[10px] opacity-80 mb-3">{task.desc}</p>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1b7b68] bg-emerald-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} alt="user" />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button className="p-1 bg-white text-[#1b7b68] rounded-lg transition-colors shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}