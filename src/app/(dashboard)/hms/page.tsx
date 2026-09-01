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
  url?: string; 
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

type DashboardLowStockItem = {
  _id?: string;
  name?: string;
  genericName?: string;
  quantityInStock?: number;
  reorderLevel?: number;
  isLowStock?: boolean;
  unitOfMeasure?: string;
};

type DashboardShiftAssignment = {
  staffId?: string | { _id?: string; id?: string };
  status?: string;
  signedInAt?: string;
  signedOutAt?: string;
};

type DashboardOpenShift = {
  _id?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isOpenShift?: boolean;
  status?: string;
  assignedStaff?: DashboardShiftAssignment[];
};

type RevenuePoint = {
  label: string;
  charges: number;
  payments: number;
};

type OutpatientEncounterDate = {
  queuedAt?: string;
  createdAt?: string;
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

/**
 * Returns YYYY-MM-DD using the user's local calendar date.
 *
 * We intentionally do not use toISOString() here because that can
 * move the date backward/forward depending on the user's timezone.
 */
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

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  /**
   * The selected date is a real Date object.
   * It starts at today's actual local date.
   */
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  /**
   * This controls which month the calendar is currently displaying.
   */
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
  });

  const [revenuePeriod, setRevenuePeriod] =
    useState<RevenuePeriod>('week');

  const [revenueTransactions, setRevenueTransactions] = useState<{
    charges: BillingChartTransaction[];
    payments: BillingChartTransaction[];
  }>({
    charges: [],
    payments: [],
  });

  const [revenueLoading, setRevenueLoading] = useState(true);

  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [outpatientLoading, setOutpatientLoading] =
    useState(false);

  const [lowStockItems, setLowStockItems] = useState<DashboardLowStockItem[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [openShiftStaffCount, setOpenShiftStaffCount] = useState<number | null>(null);
  const [openShiftLoading, setOpenShiftLoading] = useState(true);

  const [kpiData, setKpiData] = useState<DashboardKpi[]>([
    {
      title: 'Total Patients',
      value: null,
      sub: 'Loading patient count...',
      icon: Users,
    },
    {
      title: 'Outpatients',
      value: null,
      sub: 'Loading outpatient count...',
      icon: Calendar,
    },
    {
      title: 'Invoices',
      value: null,
      sub: 'Loading charges and payments...',
      icon: FileText,
    },
    {
      title: 'Staff',
      value: null,
      sub: 'Loading active staff count...',
      icon: UserCheck,
    },
  ]);

  /**
   * Calendar generation.
   *
   * This dynamically creates the correct days for whatever month
   * is currently displayed.
   */
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const firstWeekday = firstDayOfMonth.getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const days: Array<Date | null> = [];

    // Empty spaces before the first day of the month.
    for (let i = 0; i < firstWeekday; i += 1) {
      days.push(null);
    }

    // Actual days in the month.
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [calendarMonth]);

  /**
   * Compare two dates using only their local calendar date.
   */
  const isSameDate = (first: Date, second: Date): boolean => {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  };

  /**
   * Navigate to the previous month.
   */
  const goToPreviousMonth = () => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() - 1,
          1
        )
    );
  };

  /**
   * Navigate to the next month.
   */
  const goToNextMonth = () => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          1
        )
    );
  };

  /**
   * Dashboard KPI data.
   *
   * Total patients and staff are global values.
   * Outpatients is tied to the currently selected calendar date.
   */
  useEffect(() => {
    let cancelled = false;

    const loadDashboardKpis = async () => {
      const selectedDateKey = getLocalDateString(selectedDate);

      setOutpatientLoading(true);

      const [
        patientsResult,
        outpatientsResult,
        billingResult,
        staffResult,
      ] = await Promise.allSettled([
        PatientApiService.getPatients({
          page: 1,
          limit: 1,
        }),

        fetch(
          `${API_BASE_URL}/api/v1/outpatients/queue`,
          {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }
        ).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              'Failed to load outpatient queue'
            );
          }

          return response.json();
        }),

        Promise.all([
          fetch(
            `${API_BASE_URL}/api/v1/billing/charges?page=1&limit=1`,
            {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }
          ).then((response) => response.json()),

          fetch(
            `${API_BASE_URL}/api/v1/billing/payments?page=1&limit=1`,
            {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }
          ).then((response) => response.json()),
        ]),

        StaffApiService.getStaff({
          isActive: true,
        }),
      ]);

      if (cancelled) return;

      const patientCount =
        patientsResult.status === 'fulfilled'
          ? Number(
              patientsResult.value.total || 0
            )
          : null;

      const outpatientData =
        outpatientsResult.status === 'fulfilled'
          ? outpatientsResult.value?.data ??
            outpatientsResult.value
          : [];

      const outpatientRows =
        Array.isArray(outpatientData)
          ? outpatientData
          : outpatientData?.encounters ||
            outpatientData?.queue ||
            [];

      const outpatientCount =
        Array.isArray(outpatientRows)
          ? outpatientRows.filter(
              (
                encounter: OutpatientEncounterDate
              ) => {
                const encounterDate =
                  encounter.queuedAt ||
                  encounter.createdAt;

                if (!encounterDate) {
                  return false;
                }

                return (
                  getLocalDateString(
                    new Date(encounterDate)
                  ) === selectedDateKey
                );
              }
            ).length
          : null;

      const billingCount =
        billingResult.status === 'fulfilled'
          ? billingResult.value.reduce(
              (
                total: number,
                result: {
                  data?: {
                    total?: number;
                  };
                  total?: number;
                }
              ) =>
                total +
                Number(
                  result.data?.total ??
                    result.total ??
                    0
                ),
              0
            )
          : null;

      const staffCount =
        staffResult.status === 'fulfilled'
          ? Number(
              staffResult.value.count ??
                staffResult.value.data?.length ??
                0
            )
          : null;

      setKpiData([
        {
          title: 'Total Patients',
          value: patientCount,
          sub: 'Registered patients',
          icon: Users,
          url: '/hms/patients',
        },
        {
          title: 'Outpatients',
          value: outpatientCount,
          sub: `Outpatient encounters on ${formatSelectedDate(
            selectedDate
          )}`,
          icon: Calendar,
          url: '/hms/outpatients',
        },
        {
          title: 'Invoices',
          value: billingCount,
          sub: 'Charges plus payments',
          icon: FileText,
          url: '/hms/billing',
        },
        {
          title: 'Staff',
          value: staffCount,
          sub: 'Active staff members',
          icon: UserCheck,
          url: '/hms/staff',
        },
      ]);

      setOutpatientLoading(false);
    };

    void loadDashboardKpis();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /**
   * Load real pharmacy low-stock notifications.
   *
   * The pharmacy module already exposes `isLowStock`, so the dashboard
   * consumes that existing source of truth instead of calculating a
   * separate stock threshold.
   */
  useEffect(() => {
    let cancelled = false;

    const loadLowStockItems = async () => {
      setLowStockLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/pharmacy/inventory?page=1&limit=100&isLowStock=true`,
          {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setLowStockItems([]);
          }
          return;
        }

        const json = await response.json();
        const data = json?.data ?? json;
        const items = Array.isArray(data)
          ? data
          : data?.items || data?.inventory || data?.results || [];

        if (!cancelled) {
          setLowStockItems(
            Array.isArray(items)
              ? items.filter(
                  (item: DashboardLowStockItem) => item?.isLowStock !== false
                )
              : []
          );
        }
      } catch (_error) {
        if (!cancelled) {
          setLowStockItems([]);
        }
      } finally {
        if (!cancelled) {
          setLowStockLoading(false);
        }
      }
    };

    // Load pharmacy stock once when the dashboard mounts.
    void loadLowStockItems();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load staff currently working on open shifts from the staff rostering
   * module. The rostering page uses /shifts/open and its live shift window
   * logic, including overnight shifts, so the dashboard mirrors that logic.
   */
  useEffect(() => {
    let cancelled = false;

    const getShiftDateTime = (dateValue: string, timeValue: string): Date => {
      const result = new Date(dateValue);
      const [hours, minutes] = String(timeValue || '00:00')
        .split(':')
        .map(Number);

      result.setHours(hours || 0, minutes || 0, 0, 0);
      return result;
    };

    const getShiftEndDateTime = (
      dateValue: string,
      startTime: string,
      endTime: string
    ): Date => {
      const start = getShiftDateTime(dateValue, startTime);
      const end = getShiftDateTime(dateValue, endTime);

      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      return end;
    };

    const isShiftCurrentlyOpen = (
      shift: DashboardOpenShift,
      now: Date
    ): boolean => {
      if (!shift.date || !shift.startTime || !shift.endTime) {
        return false;
      }

      const shiftStart = getShiftDateTime(shift.date, shift.startTime);
      const shiftEnd = getShiftEndDateTime(
        shift.date,
        shift.startTime,
        shift.endTime
      );

      return now >= shiftStart && now <= shiftEnd;
    };

    const getStaffId = (
      staffId?: string | { _id?: string; id?: string }
    ): string => {
      if (!staffId) return '';
      return typeof staffId === 'string'
        ? staffId
        : String(staffId._id || staffId.id || '');
    };

    const loadOpenShiftStaff = async () => {
      setOpenShiftLoading(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/rostering/shifts/open`,
          {
            headers: getDashboardHeaders(),
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setOpenShiftStaffCount(null);
          }
          return;
        }

        const json = await response.json();
        const data = json?.data ?? json;
        const shifts = Array.isArray(data)
          ? data
          : data?.items || data?.shifts || data?.results || [];

        const now = new Date();
        const activeStaffIds = new Set<string>();

        (Array.isArray(shifts) ? shifts : []).forEach(
          (shift: DashboardOpenShift) => {
            if (!isShiftCurrentlyOpen(shift, now)) return;

            (shift.assignedStaff || []).forEach((assignment) => {
              const staffId = getStaffId(assignment.staffId);

              if (
                staffId &&
                assignment.status !== 'DECLINED' &&
                assignment.status !== 'CANCELLED' &&
                assignment.status !== 'COMPLETED'
              ) {
                activeStaffIds.add(staffId);
              }
            });
          }
        );

        if (!cancelled) {
          setOpenShiftStaffCount(activeStaffIds.size);
        }
      } catch (_error) {
        if (!cancelled) {
          setOpenShiftStaffCount(null);
        }
      } finally {
        if (!cancelled) {
          setOpenShiftLoading(false);
        }
      }
    };

    // Load current open-shift staff once when the dashboard mounts.
    void loadOpenShiftStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Load appointments whenever the selected calendar date changes.
   */
  useEffect(() => {
    let cancelled = false;

    const loadAppointmentsForSelectedDate =
      async () => {
        setAppointmentsLoading(true);

        try {
          const response =
            await AppointmentApiService.getAppointments(
              {
                date: getLocalDateString(selectedDate),
                page: 1,
                limit: 100,
              }
            );

          if (!cancelled) {
            setAppointments(
              response.appointments || []
            );
          }
        } catch (error) {
          console.error(
            'Failed to load appointments for selected date:',
            error
          );

          if (!cancelled) {
            setAppointments([]);
          }
        } finally {
          if (!cancelled) {
            setAppointmentsLoading(false);
          }
        }
      };

    void loadAppointmentsForSelectedDate();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /**
   * Revenue data.
   */
  useEffect(() => {
    let cancelled = false;

    const loadRevenue = async () => {
      setRevenueLoading(true);

      try {
        const [
          chargesResponse,
          paymentsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/v1/billing/charges?page=1&limit=100`,
            {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }
          ),

          fetch(
            `${API_BASE_URL}/api/v1/billing/payments?page=1&limit=100`,
            {
              headers: getDashboardHeaders(),
              cache: 'no-store',
            }
          ),
        ]);

        if (
          !chargesResponse.ok ||
          !paymentsResponse.ok
        ) {
          throw new Error(
            'Failed to load revenue data'
          );
        }

        const [
          chargesJson,
          paymentsJson,
        ] = await Promise.all([
          chargesResponse.json(),
          paymentsResponse.json(),
        ]);

        const getItems = (
          json: {
            data?: {
              items?: BillingChartTransaction[];
            };
            items?: BillingChartTransaction[];
          }
        ) =>
          json?.data?.items ||
          json?.items ||
          [];

        if (!cancelled) {
          setRevenueTransactions({
            charges: getItems(chargesJson),
            payments: getItems(paymentsJson),
          });
        }
      } catch (error) {
        console.error(
          'Failed to load revenue data:',
          error
        );

        if (!cancelled) {
          setRevenueTransactions({
            charges: [],
            payments: [],
          });
        }
      } finally {
        if (!cancelled) {
          setRevenueLoading(false);
        }
      }
    };

    void loadRevenue();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Revenue chart buckets.
   */
  const revenuePoints = useMemo<
    RevenuePoint[]
  >(() => {
    const today = new Date();

    const points: RevenuePoint[] =
      revenuePeriod === 'week'
        ? [
            'Sun',
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
          ].map((label) => ({
            label,
            charges: 0,
            payments: 0,
          }))
        : revenuePeriod === 'month'
          ? [
              'Week 1',
              'Week 2',
              'Week 3',
              'Week 4',
            ].map((label) => ({
              label,
              charges: 0,
              payments: 0,
            }))
          : [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ].map((label) => ({
              label,
              charges: 0,
              payments: 0,
            }));

    const getBucket = (
      dateValue?: string
    ): number | null => {
      if (!dateValue) return null;

      const date = new Date(dateValue);

      if (
        Number.isNaN(date.getTime()) ||
        date.getFullYear() !==
          today.getFullYear()
      ) {
        return null;
      }

      if (revenuePeriod === 'week') {
        const startOfWeek = new Date(today);

        startOfWeek.setHours(0, 0, 0, 0);

        startOfWeek.setDate(
          today.getDate() - today.getDay()
        );

        const dayDifference = Math.floor(
          (date.getTime() -
            startOfWeek.getTime()) /
            86400000
        );

        return dayDifference >= 0 &&
          dayDifference < 7
          ? dayDifference
          : null;
      }

      if (revenuePeriod === 'month') {
        if (
          date.getMonth() !==
          today.getMonth()
        ) {
          return null;
        }

        return Math.min(
          3,
          Math.floor(
            (date.getDate() - 1) / 7
          )
        );
      }

      return date.getMonth();
    };

    revenueTransactions.charges.forEach(
      (transaction) => {
        const bucket = getBucket(
          transaction.chargeDate ||
            transaction.createdAt
        );

        if (bucket !== null) {
          points[bucket].charges += Number(
            transaction.netAmount ??
              transaction.grossAmount ??
              0
          );
        }
      }
    );

    revenueTransactions.payments.forEach(
      (transaction) => {
        const bucket = getBucket(
          transaction.paidAt ||
            transaction.createdAt
        );

        if (bucket !== null) {
          points[bucket].payments += Number(
            transaction.amount ?? 0
          );
        }
      }
    );

    return points;
  }, [
    revenuePeriod,
    revenueTransactions,
  ]);

  const revenueMax = Math.max(
    ...revenuePoints.flatMap((point) => [
      point.charges,
      point.payments,
    ]),
    1
  );

  const today = new Date();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-300 font-sans">
      {/* Central Workspace */}
      <div className="xl:col-span-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Dashboard
            </h1>

            <p className="text-xs text-slate-400 mt-0.5">
              Welcome back! Here's what's happening today.
            </p>
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

        {/* KPI Cards */}
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

                    <span className="text-slate-600 font-semibold">
                      {kpi.title}
                    </span>
                  </div>

                  <Link href={`${kpi.url}`} className="text-slate-300 hover:text-slate-500 cursor-pointer text-s font-bold">
                    ›
                  </Link>
                </div>

                <div className="flex items-baseline justify-between my-1">
                  <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                    {kpi.value === null
                      ? '—'
                      : kpi.value.toLocaleString()}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  {kpi.sub}
                </p>
              </div>
            );
          })}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Revenue
                </h3>

                {/* <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> */}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                {(
                  [
                    'week',
                    'month',
                    'year',
                  ] as RevenuePeriod[]
                ).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() =>
                      setRevenuePeriod(period)
                    }
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
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1b7b68]" />
                charges
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-300" />
                payments
              </span>
            </div>

            <div className="h-40 flex items-center justify-center border-b border-slate-50">
              {revenueLoading ? (
                <div className="w-full flex items-center justify-center text-xs text-slate-400">
                  Loading revenue...
                </div>
              ) : (
                <svg
                  className="w-full h-full"
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d={buildSmoothRevenuePath(
                      revenuePoints,
                      'charges',
                      revenueMax
                    )}
                    fill="none"
                    stroke="#1b7b68"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />

                  {revenuePoints.map(
                    (point, index) => {
                      const x =
                        revenuePoints.length ===
                        1
                          ? 150
                          : (index /
                              (revenuePoints.length -
                                1)) *
                            300;

                      const y =
                        94 -
                        (point.charges /
                          revenueMax) *
                          78;

                      return (
                        <g
                          key={`charges-${point.label}`}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#1b7b68"
                          >
                            <title>
                              {`${point.label}: Charges ${point.charges.toLocaleString()}`}
                            </title>
                          </circle>
                        </g>
                      );
                    }
                  )}

                  <path
                    d={buildSmoothRevenuePath(
                      revenuePoints,
                      'payments',
                      revenueMax
                    )}
                    fill="none"
                    stroke="#99f6e4"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />

                  {revenuePoints.map(
                    (point, index) => {
                      const x =
                        revenuePoints.length ===
                        1
                          ? 150
                          : (index /
                              (revenuePoints.length -
                                1)) *
                            300;

                      const y =
                        94 -
                        (point.payments /
                          revenueMax) *
                          78;

                      return (
                        <g
                          key={`payments-${point.label}`}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#99f6e4"
                          >
                            <title>
                              {`${point.label}: Payments ${point.payments.toLocaleString()}`}
                            </title>
                          </circle>
                        </g>
                      );
                    }
                  )}
                </svg>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              {revenuePoints.map((point) => (
                <span key={point.label}>
                  {point.label}
                </span>
              ))}
            </div>
          </div>

          {/* Patient Overview */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-800">
                  Patient Overview
                </h3>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold text-slate-500">
                <span className="px-2.5 py-1 bg-[#1b7b68] text-white rounded-lg shadow-sm">
                  Week
                </span>

                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">
                  Month
                </span>

                <span className="px-2.5 py-1 hover:text-slate-800 cursor-pointer">
                  Year
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1b7b68]" />
                incomes
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-300" />
                incomes
              </span>
            </div>

            <div className="h-40 flex items-end justify-between px-2 gap-2 border-b border-slate-50 pb-2">
              {[60, 85, 70, 95, 65, 80, 90].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex gap-1 items-end h-full w-full justify-center"
                  >
                    <div
                      className="w-2 bg-[#1b7b68] rounded-t-md transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${height}%`,
                      }}
                    />

                    <div
                      className="w-2 bg-teal-200 rounded-t-md transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${height - 25}%`,
                      }}
                    />
                  </div>
                )
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-3">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
          </div>
        </div>

        {/* Lower Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Appointments */}
          <div className="md:col-span-7 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-slate-800">
                Appointments for{' '}
                {formatSelectedDate(
                  selectedDate
                )}
              </h3>

              <p className="text-[10px] text-slate-400">
                Appointments scheduled for the selected date
              </p>
            </div>

            <div className="space-y-3">
              {appointmentsLoading ? (
                <div className="py-8 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />

                  <p className="text-sm font-bold text-slate-600 mt-3">
                    Loading appointments...
                  </p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto" />

                  <p className="text-sm font-bold text-slate-600 mt-3">
                    No appointments on this date
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1">
                    There are no appointments scheduled for{' '}
                    {formatSelectedDate(
                      selectedDate
                    )}.
                  </p>
                </div>
              ) : (
                appointments.map((item) => {
                  const patient =
                    typeof item.patientId ===
                    'object'
                      ? (item.patientId as IPopulatedPatient)
                      : null;

                  const doctor =
                    typeof item.doctorId ===
                    'object'
                      ? (item.doctorId as IPopulatedDoctor)
                      : null;

                  const patientName = patient
                    ? `${patient.firstName} ${patient.lastName}`
                    : 'Unknown patient';

                  const doctorName = doctor
                    ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                    : 'Assigned doctor';

                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              patientName
                            )}`}
                            alt={patientName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            {patientName}
                          </h4>

                          <p className="text-[10px] text-slate-400">
                            {doctorName}
                            {doctor?.department
                              ? ` • ${doctor.department}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />

                          <span>
                            {formatAppointmentTime(
                              item.startTime
                            )}
                          </span>
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full',
                            getAppointmentStatusClass(
                              item.status
                            )
                          )}
                        >
                          {getAppointmentStatusLabel(
                            item.status
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="md:col-span-5 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 mb-0.5">
                Alerts & Notifications
              </h3>

              <p className="text-[10px] text-slate-400 mb-4">
                Pharmacy stock alerts
              </p>

              <div className="space-y-2.5">
                {lowStockLoading ? (
                  <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-400 font-medium">
                    Checking pharmacy stock levels...
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <div className="p-3 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />

                    <span className="text-[11px] font-medium">
                      No low-stock drugs at the moment.
                    </span>
                  </div>
                ) : (
                  lowStockItems.map((item, index) => {
                    const quantity = Number(item.quantityInStock ?? 0);

                    const unit = item.unitOfMeasure
                      ? ` ${String(item.unitOfMeasure).toLowerCase()}`
                      : '';

                    return (
                      <Link
                        key={item._id || `${item.name || 'drug'}-${index}`}
                        href="/hms/pharmacy"
                        className="p-2.5 bg-[#e8f5f3] rounded-2xl flex items-center gap-2.5 text-xs text-slate-700 hover:bg-[#dff1ed] transition-colors"
                      >
                        <AlertCircle className="w-4 h-4 text-[#1b7b68] flex-shrink-0" />

                        <span className="text-[11px] font-medium">
                          Low stock: {item.name || 'Unnamed drug'} — {quantity.toLocaleString()}
                          {unit} remaining
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Current Staff on Open Shifts */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Staff on Open Shifts
                  </span>

                  <span className="text-[10px] text-slate-400">
                    Currently active
                  </span>
                </div>

                <span className="text-base font-extrabold text-[#1b7b68]">
                  {openShiftLoading
                    ? '—'
                    : openShiftStaffCount === null
                      ? '—'
                      : openShiftStaffCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Schedule Drawer */}
      <div className="xl:col-span-4 space-y-6">
        {/* Functional Calendar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
              className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {formatMonthYear(calendarMonth)}
            </h3>

            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
            {calendarDays.map(
              (date, index) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-8 w-8 mx-auto"
                    />
                  );
                }

                const isSelected =
                  isSameDate(
                    date,
                    selectedDate
                  );

                const isToday =
                  isSameDate(
                    date,
                    today
                  );

                return (
                  <button
                    key={getLocalDateString(
                      date
                    )}
                    type="button"
                    onClick={() => {
                      setSelectedDate(
                        date
                      );
                    }}
                    aria-label={`Select ${date.toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    )}`}
                    className={cn(
                      'h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all duration-200',
                      isSelected
                        ? 'bg-[#1b7b68] text-white font-bold shadow-md shadow-[#1b7b68]/30'
                        : isToday
                          ? 'bg-[#e8f5f3] text-[#1b7b68] font-extrabold ring-1 ring-[#1b7b68]/30'
                          : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              }
            )}
          </div>

          {/* Selected date information */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-400">
                  Selected date
                </p>

                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {formatSelectedDate(
                    selectedDate
                  )}
                </p>
              </div>

              {isSameDate(
                selectedDate,
                today
              ) && (
                <span className="text-[9px] font-bold text-[#1b7b68] bg-[#e8f5f3] px-2 py-1 rounded-full">
                  TODAY
                </span>
              )}
            </div>

            {outpatientLoading && (
              <p className="text-[9px] text-slate-400 mt-2">
                Updating outpatient data...
              </p>
            )}
          </div>
        </div>

        {/* Timeline Schedule Cards */}
        <div className="space-y-3">
          {[
            {
              id: '1',
              title: 'Morning Staff Meeting',
              time: '08:00 AM',
              desc: 'Discuss team task for the day.',
            },
            {
              id: '2',
              title: 'Patient Consultation',
              time: '08:00 AM',
              desc: 'Discuss team task for the day.',
            },
            {
              id: '3',
              title: 'Meeting with Guards',
              time: '08:00 AM',
              desc: 'Discuss team task for the day.',
            },
            {
              id: '4',
              title: 'Surgery',
              time: '08:00 AM',
              desc: 'Discuss team task for the day.',
            },
          ].map((task) => (
            <div
              key={task.id}
              className="relative pl-6"
            >
              <div className="absolute left-0 top-5 w-3 h-3 rounded-full bg-[#1b7b68] ring-4 ring-white" />

              <div className="bg-[#1b7b68] text-white p-4 rounded-3xl shadow-lg shadow-[#1b7b68]/20 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold">
                    {task.title}
                  </h4>

                  <span className="text-[10px] font-semibold opacity-90">
                    {task.time}
                  </span>
                </div>

                <p className="text-[10px] opacity-80 mb-3">
                  {task.desc}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/20">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {[1, 2, 3, 4].map(
                      (user) => (
                        <div
                          key={user}
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-[#1b7b68] bg-emerald-800 overflow-hidden"
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${user}`}
                            alt="user"
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="p-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>

                    <button
                      type="button"
                      className="p-1 bg-white text-[#1b7b68] rounded-lg transition-colors shadow-sm"
                    >
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