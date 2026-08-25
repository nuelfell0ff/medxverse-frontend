'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  FileClock,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CalendarCheck2,
  ArrowLeftRight,
  ClipboardList,
  Download,
  LogIn,
  LogOut,
} from 'lucide-react';

/* ==========================================================================
   CONSTANTS
========================================================================== */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com';

const API_V1_URL = `${API_BASE_URL}/api/v1`;

const ROSTERING_API_URL = `${API_V1_URL}/rostering`;
const STAFF_API_URL = `${API_V1_URL}/staff`;

/* ==========================================================================
   TYPES
========================================================================== */

type RosterAreaType =
  | 'DEPARTMENT'
  | 'WARD'
  | 'THEATRE'
  | 'ICU'
  | 'EMERGENCY'
  | 'CLINIC_OPD'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'OTHER';

type ShiftType =
  | 'DAY'
  | 'EVENING'
  | 'NIGHT'
  | 'ON_CALL'
  | 'CUSTOM';

type ShiftStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

type RosterStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ARCHIVED';

type AssignmentStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'COMPLETED';

type AvailabilityStatus =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'PREFERRED';

type SwapStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

type AttendanceStatus =
  | 'SCHEDULED'
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'MISSED_SIGN_OUT';

interface AttendanceRow {
  rosterId: string;
  rosterName: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  areaType: RosterAreaType;
  departmentName?: string;
  wardName?: string;
  location?: string;
  staffId: string;
  role?: string;
  attendanceStatus: AttendanceStatus;
  signedInAt?: string;
  signedOutAt?: string;
  lateByMinutes?: number;
  attendanceNotes?: string;
}

interface AttendanceReport {
  startDate: string;
  endDate: string;
  graceMinutes: number;
  total: number;
  summary: {
    scheduled: number;
    present: number;
    late: number;
    absent: number;
    missedSignOut: number;
  };
  rows: AttendanceRow[];
}

interface Staff {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  department?: string;
  departmentName?: string;
  isActive?: boolean;
}

interface ShiftAssignment {
  _id?: string;
  staffId: string | Staff;
  role?: string;
  status: AssignmentStatus;
  acceptedAt?: string;
  declinedAt?: string;
  notes?: string;
  assignedAt?: string;
  attendanceStatus?: AttendanceStatus;
  signedInAt?: string;
  signedOutAt?: string;
  attendanceNotes?: string;
  lateByMinutes?: number;
}

interface Shift {
  _id?: string;
  rosterId?: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  status: ShiftStatus;
  areaType: RosterAreaType;
  departmentId?: string;
  departmentName?: string;
  wardId?: string;
  wardName?: string;
  location?: string;
  requiredStaffCount?: number;
  notes?: string;
  isOpenShift: boolean;
  assignedStaff: ShiftAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

interface Roster {
  _id?: string;
  name: string;
  code?: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: RosterStatus;
  areaType: RosterAreaType;
  departmentId?: string;
  departmentName?: string;
  wardId?: string;
  wardName?: string;
  isPublished: boolean;
  publishedAt?: string;
  version?: number;
  shifts: Shift[];
  createdAt?: string;
  updatedAt?: string;
}

interface Availability {
  _id?: string;
  staffId: string;
  date: string;
  status: AvailabilityStatus;
  preferredShiftTypes?: ShiftType[];
  availableFrom?: string;
  availableTo?: string;
  notes?: string;
}

interface ShiftSwap {
  _id?: string;
  shiftId: string;
  requesterStaffId: string;
  replacementStaffId?: string;
  reason?: string;
  status: SwapStatus;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface PaginatedRosters {
  rosters?: Roster[];
  items?: Roster[];
  results?: Roster[];
  total?: number;
  page?: number;
  pages?: number;
  totalPages?: number;
}

/* ==========================================================================
   FORM TYPES
========================================================================== */

interface RosterForm {
  name: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  areaType: RosterAreaType;
  departmentName: string;
  wardName: string;
}

interface ShiftForm {
  rosterId: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  areaType: RosterAreaType;
  departmentName: string;
  wardName: string;
  location: string;
  requiredStaffCount: string;
  notes: string;
  isOpenShift: boolean;
}

interface StaffForm {
  staffId: string;
  role: string;
  notes: string;
}

interface AvailabilityForm {
  staffId: string;
  date: string;
  status: AvailabilityStatus;
  preferredShiftTypes: ShiftType[];
  availableFrom: string;
  availableTo: string;
  notes: string;
}

/* ==========================================================================
   LABELS
========================================================================== */

const AREA_OPTIONS: {
  value: RosterAreaType;
  label: string;
}[] = [
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'WARD', label: 'Ward' },
  { value: 'THEATRE', label: 'Theatre' },
  { value: 'ICU', label: 'ICU' },
  { value: 'EMERGENCY', label: 'Emergency Department' },
  { value: 'CLINIC_OPD', label: 'Clinic / OPD' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'RADIOLOGY', label: 'Radiology' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'OTHER', label: 'Other' },
];

const SHIFT_OPTIONS: {
  value: ShiftType;
  label: string;
}[] = [
  { value: 'DAY', label: 'Day' },
  { value: 'EVENING', label: 'Evening' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'ON_CALL', label: 'On Call' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_OPTIONS: {
  value: RosterStatus;
  label: string;
}[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

/* ==========================================================================
   HELPERS
========================================================================== */

function formatLabel(value?: string | null): string {
  if (!value) return 'N/A';

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('authToken')
  );
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function getId(value?: string | Staff | null): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
}

function getStaffName(value?: string | Staff | null): string {
  if (!value) return 'Unknown Staff';

  if (typeof value === 'string') {
    return value;
  }

  const fullName =
    `${value.firstName || ''} ${value.lastName || ''}`.trim();

  return fullName || value.name || 'Unknown Staff';
}


function getStaffRole(value?: Staff | null): string {
  if (!value) return 'Staff member';

  return value.role
    ? formatLabel(value.role)
    : 'Staff member';
}

function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';

  for (const key of ['userId', 'staffId', 'currentUserId']) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  for (const key of ['user', 'currentUser', 'authUser', 'profile']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const id =
        parsed?._id ||
        parsed?.id ||
        parsed?.userId ||
        parsed?.staffId ||
        parsed?.user?._id ||
        parsed?.user?.id;

      if (id) return String(id);
    } catch {
      // Ignore malformed local-storage values.
    }
  }

  const token = getToken();
  if (!token) return '';

  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return '';

    const normalized = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded =
      normalized +
      '='.repeat((4 - (normalized.length % 4)) % 4);

    const payload = JSON.parse(
      atob(padded)
    );

    return String(
      payload?.userId ||
        payload?.staffId ||
        payload?.id ||
        payload?._id ||
        payload?.sub ||
        ''
    );
  } catch {
    return '';
  }
}

function getShiftDateTimeForUi(
  date: string,
  time: string
): Date {
  const result = new Date(date);
  const [hours, minutes] = String(time || '00:00')
    .split(':')
    .map(Number);

  result.setHours(
    hours || 0,
    minutes || 0,
    0,
    0
  );

  return result;
}

function getShiftEndDateTimeForUi(
  date: string,
  startTime: string,
  endTime: string
): Date {
  const start = getShiftDateTimeForUi(
    date,
    startTime
  );

  const end = getShiftDateTimeForUi(
    date,
    endTime
  );

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}

function getLiveAttendanceStatus(
  shift: Shift,
  assignment: ShiftAssignment
): AttendanceStatus {
  if (assignment.signedOutAt) {
    return assignment.attendanceStatus === 'LATE'
      ? 'LATE'
      : 'PRESENT';
  }

  const now = new Date();
  const shiftStart = getShiftDateTimeForUi(
    shift.date,
    shift.startTime
  );

  const graceEnd = new Date(
    shiftStart.getTime() + 10 * 60 * 1000
  );

  const shiftEnd = getShiftEndDateTimeForUi(
    shift.date,
    shift.startTime,
    shift.endTime
  );

  if (!assignment.signedInAt) {
    return now > graceEnd
      ? 'ABSENT'
      : 'SCHEDULED';
  }

  if (now > shiftEnd) {
    return 'MISSED_SIGN_OUT';
  }

  return assignment.attendanceStatus === 'LATE'
    ? 'LATE'
    : 'PRESENT';
}

function getAttendanceStatusClasses(
  status: AttendanceStatus
): string {
  switch (status) {
    case 'PRESENT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'LATE':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ABSENT':
      return 'bg-rose-50 text-rose-700 border-rose-100';
    case 'MISSED_SIGN_OUT':
      return 'bg-orange-50 text-orange-700 border-orange-100';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function formatCsvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(
  value?: string | Date | null
): string {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(
  value?: string | Date | null
): string {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortDate(
  value?: string | Date | null
): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function toInputDate(value?: string | Date): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function getStatusClasses(status?: string): string {
  switch (status) {
    case 'PUBLISHED':
    case 'ACCEPTED':
    case 'AVAILABLE':
    case 'APPROVED':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'DRAFT':
    case 'PENDING':
    case 'OPEN':
    case 'PREFERRED':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    case 'IN_PROGRESS':
      return 'bg-blue-50 text-blue-700 border-blue-100';

    case 'DECLINED':
    case 'REJECTED':
    case 'UNAVAILABLE':
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-100';

    case 'ASSIGNED':
      return 'bg-cyan-50 text-cyan-700 border-cyan-100';

    case 'PRESENT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'LATE':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    case 'ABSENT':
    case 'MISSED_SIGN_OUT':
      return 'bg-rose-50 text-rose-700 border-rose-100';

    case 'SCHEDULED':
      return 'bg-slate-50 text-slate-600 border-slate-200';

    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-600 border-slate-200';

    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function getShiftAccent(shiftType: ShiftType): string {
  switch (shiftType) {
    case 'DAY':
      return 'border-l-emerald-500';

    case 'EVENING':
      return 'border-l-amber-500';

    case 'NIGHT':
      return 'border-l-indigo-500';

    case 'ON_CALL':
      return 'border-l-rose-500';

    default:
      return 'border-l-slate-400';
  }
}

function emptyRosterForm(): RosterForm {
  return {
    name: '',
    code: '',
    description: '',
    startDate: '',
    endDate: '',
    areaType: 'DEPARTMENT',
    departmentName: '',
    wardName: '',
  };
}

function emptyShiftForm(rosterId = ''): ShiftForm {
  return {
    rosterId,
    date: '',
    startTime: '08:00',
    endTime: '16:00',
    shiftType: 'DAY',
    areaType: 'DEPARTMENT',
    departmentName: '',
    wardName: '',
    location: '',
    requiredStaffCount: '1',
    notes: '',
    isOpenShift: true,
  };
}

function emptyStaffForm(): StaffForm {
  return {
    staffId: '',
    role: '',
    notes: '',
  };
}

function emptyAvailabilityForm(): AvailabilityForm {
  return {
    staffId: '',
    date: '',
    status: 'AVAILABLE',
    preferredShiftTypes: [],
    availableFrom: '',
    availableTo: '',
    notes: '',
  };
}

/* ==========================================================================
   SMALL UI COMPONENTS
========================================================================== */

function StatusBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${className}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}

          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              {title}
            </h2>

            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="text-xs font-semibold text-slate-700 mt-1">
        {value || 'N/A'}
      </p>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
      <div
        className={`w-full ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        } max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5 rounded-t-3xl">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="text-xs text-slate-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSubmit,
  submitting,
  submitLabel = 'Save Changes',
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-5 mt-6 border-t border-slate-100">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#156354] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
      >
        {submitting && (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        )}

        {submitLabel}
      </button>
    </div>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function RosteringPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRoster, setSelectedRoster] =
    useState<Roster | null>(null);

  const [staffDirectory, setStaffDirectory] =
    useState<Staff[]>([]);

  const [openShifts, setOpenShifts] =
    useState<Shift[]>([]);

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [swaps, setSwaps] =
    useState<ShiftSwap[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [activeTab, setActiveTab] =
    useState<
      'rosters' | 'calendar' | 'open' | 'availability' | 'swaps' | 'attendance'
    >('rosters');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | RosterStatus>('ALL');

  const [areaFilter, setAreaFilter] =
    useState<'ALL' | RosterAreaType>('ALL');

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [calendarDate, setCalendarDate] =
    useState(new Date());

  const [attendanceStartDate, setAttendanceStartDate] =
    useState(toInputDate(new Date()));

  const [attendanceEndDate, setAttendanceEndDate] =
    useState(toInputDate(new Date()));

  const [attendanceReport, setAttendanceReport] =
    useState<AttendanceReport | null>(null);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  const [attendanceError, setAttendanceError] =
    useState<string | null>(null);

  const [attendanceStaffFilter, setAttendanceStaffFilter] =
    useState('');

  const [attendanceRosterFilter, setAttendanceRosterFilter] =
    useState('');

  const [attendanceAreaFilter, setAttendanceAreaFilter] =
    useState<'ALL' | RosterAreaType>('ALL');

  const [attendanceNote, setAttendanceNote] =
    useState('');

  const [attendanceSubmitting, setAttendanceSubmitting] =
    useState(false);

  /* ------------------------------------------------------------------------
     MODALS
  ------------------------------------------------------------------------ */

  const [showRosterModal, setShowRosterModal] =
    useState(false);

  const [showShiftModal, setShowShiftModal] =
    useState(false);

  const [showStaffModal, setShowStaffModal] =
    useState(false);

  const [showAvailabilityModal, setShowAvailabilityModal] =
    useState(false);

  /* ------------------------------------------------------------------------
     FORMS
  ------------------------------------------------------------------------ */

  const [rosterForm, setRosterForm] =
    useState<RosterForm>(emptyRosterForm());

  const [shiftForm, setShiftForm] =
    useState<ShiftForm>(emptyShiftForm());

  const [staffForm, setStaffForm] =
    useState<StaffForm>(emptyStaffForm());

  const [availabilityForm, setAvailabilityForm] =
    useState<AvailabilityForm>(
      emptyAvailabilityForm()
    );

  /* ------------------------------------------------------------------------
     MODAL STAFF SEARCH
  ------------------------------------------------------------------------ */

  const [staffSearch, setStaffSearch] =
    useState('');

  const [staffResults, setStaffResults] =
    useState<Staff[]>([]);

  const [staffLoading, setStaffLoading] =
    useState(false);

  /* ------------------------------------------------------------------------
     SUBMITTING STATES
  ------------------------------------------------------------------------ */

  const [submittingRoster, setSubmittingRoster] =
    useState(false);

  const [submittingShift, setSubmittingShift] =
    useState(false);

  const [submittingStaff, setSubmittingStaff] =
    useState(false);

  const [submittingAvailability, setSubmittingAvailability] =
    useState(false);

  /* ==========================================================================
     API
  ========================================================================== */

  const apiRequest = useCallback(
    async <T = any>(
      path: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const response = await fetch(
        `${ROSTERING_API_URL}${path}`,
        {
          ...options,
          headers: {
            ...getAuthHeaders(),
            ...(options.headers || {}),
          },
        }
      );

      const json: ApiResponse<T> =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json?.message ||
            'Something went wrong while processing the request.'
        );
      }

      return (
        json?.data !== undefined
          ? json.data
          : (json as unknown as T)
      );
    },
    []
  );

  /* ==========================================================================
     STAFF DIRECTORY
  ========================================================================== */

  const searchStaff = useCallback(
    async (query = '') => {
      try {
        setStaffLoading(true);

        const params = new URLSearchParams();

        params.set('isActive', 'true');

        if (query.trim()) {
          params.set(
            'search',
            query.trim()
          );
        }

        const response = await fetch(
          `${STAFF_API_URL}?${params.toString()}`,
          {
            headers: getAuthHeaders(),
          }
        );

        const json =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            json?.message ||
              'Failed to load staff.'
          );
        }

        const data = json?.data || json;

        const rows =
          data?.staff ||
          data?.items ||
          data?.results ||
          (Array.isArray(data) ? data : []);

        setStaffResults(
          Array.isArray(rows)
            ? rows
            : []
        );
      } catch (err) {
        console.error(
          'Failed to search staff:',
          err
        );

        setStaffResults([]);
      } finally {
        setStaffLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!showStaffModal && !showAvailabilityModal) return;

    const timer = setTimeout(() => {
      searchStaff(staffSearch);
    }, 300);

    return () =>
      clearTimeout(timer);
  }, [
    showStaffModal,
    showAvailabilityModal,
    staffSearch,
    searchStaff,
  ]);

  /* ==========================================================================
     LOAD ROSTERS
  ========================================================================== */

  const loadRosters = useCallback(
    async (
      requestedPage = 1,
      showRefreshState = false
    ) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const params =
          new URLSearchParams();

        params.set(
          'page',
          String(requestedPage)
        );

        params.set(
          'limit',
          '20'
        );

        if (statusFilter !== 'ALL') {
          params.set(
            'status',
            statusFilter
          );
        }

        if (areaFilter !== 'ALL') {
          params.set(
            'areaType',
            areaFilter
          );
        }

        const data =
          await apiRequest<
            PaginatedRosters
          >(
            `?${params.toString()}`
          );

        const rows =
          data?.rosters ||
          data?.items ||
          data?.results ||
          [];

        const nextRosters =
          Array.isArray(rows)
            ? rows
            : [];

        setRosters(nextRosters);

        setTotal(
          Number(data?.total || 0)
        );

        setPages(
          Number(
            data?.pages ||
              data?.totalPages ||
              1
          )
        );

        setPage(requestedPage);

        if (
          selectedRoster?._id
        ) {
          const updated =
            nextRosters.find(
              (roster) =>
                roster._id ===
                selectedRoster._id
            );

          if (updated) {
            setSelectedRoster(
              updated
            );
          }
        }
      } catch (err) {
        console.error(
          'Failed to load rosters:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load rosters.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      apiRequest,
      statusFilter,
      areaFilter,
      selectedRoster?._id,
    ]
  );

  useEffect(() => {
    loadRosters(1);
  }, [
    statusFilter,
    areaFilter,
  ]);

  /* ==========================================================================
     LOAD OPEN SHIFTS
  ========================================================================== */

  const loadOpenShifts =
    useCallback(async () => {
      try {
        const data =
          await apiRequest<Shift[]>(
            '/shifts/open'
          );

        setOpenShifts(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          'Failed to load open shifts:',
          err
        );

        setOpenShifts([]);
      }
    }, [apiRequest]);

  /* ==========================================================================
     LOAD AVAILABILITY
  ========================================================================== */

  const loadAvailability =
    useCallback(async () => {
      const staffId =
        availabilityForm.staffId;

      if (!staffId) {
        return;
      }

      try {
        const data =
          await apiRequest<Availability[]>(
            `/availability/${staffId}`
          );

        setAvailability(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error(
          'Failed to load availability:',
          err
        );

        setAvailability([]);
      }
    }, [
      apiRequest,
      availabilityForm.staffId,
    ]);

  /* ==========================================================================
     LOAD EVERYTHING
  ========================================================================== */

  const refreshAll =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await Promise.all([
          loadRosters(
            page,
            true
          ),
          loadOpenShifts(),
        ]);
      } finally {
        setRefreshing(false);
      }
    }, [
      loadRosters,
      loadOpenShifts,
      page,
    ]);

  useEffect(() => {
    loadOpenShifts();
  }, [loadOpenShifts]);

  /* ==========================================================================
     STAFF MAP
  ========================================================================== */

  const staffMap =
    useMemo(() => {
      const map =
        new Map<string, Staff>();

      staffDirectory.forEach(
        (staff) => {
          const id =
            getId(staff);

          if (id) {
            map.set(id, staff);
          }
        }
      );

      staffResults.forEach(
        (staff) => {
          const id =
            getId(staff);

          if (id) {
            map.set(id, staff);
          }
        }
      );

      return map;
    }, [
      staffDirectory,
      staffResults,
    ]);

  const resolveStaff =
    useCallback(
      (
        value:
          | string
          | Staff
          | null
          | undefined
      ): Staff | undefined => {
        if (!value) return undefined;

        if (
          typeof value !==
          'string'
        ) {
          return value;
        }

        return staffMap.get(
          value
        );
      },
      [staffMap]
    );

  /* ==========================================================================
     LOAD DIRECTORY WHEN PAGE OPENS
  ========================================================================== */

  useEffect(() => {
    let cancelled = false;

    const loadInitialStaff =
      async () => {
        try {
          const params =
            new URLSearchParams();

          params.set(
            'isActive',
            'true'
          );

          const response =
            await fetch(
              `${STAFF_API_URL}?${params.toString()}`,
              {
                headers:
                  getAuthHeaders(),
              }
            );

          if (!response.ok) {
            return;
          }

          const json =
            await response
              .json()
              .catch(
                () => ({})
              );

          const data =
            json?.data ||
            json;

          const rows =
            data?.staff ||
            data?.items ||
            data?.results ||
            (Array.isArray(data)
              ? data
              : []);

          if (
            !cancelled &&
            Array.isArray(rows)
          ) {
            setStaffDirectory(
              rows
            );
          }
        } catch (err) {
          console.error(
            'Failed to load staff directory:',
            err
          );
        }
      };

    loadInitialStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================================
     FILTERED ROSTERS
  ========================================================================== */

  const filteredRosters =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return rosters;
      }

      return rosters.filter(
        (roster) =>
          roster.name
            ?.toLowerCase()
            .includes(term) ||
          roster.code
            ?.toLowerCase()
            .includes(term) ||
          roster.departmentName
            ?.toLowerCase()
            .includes(term) ||
          roster.wardName
            ?.toLowerCase()
            .includes(term) ||
          formatLabel(
            roster.areaType
          )
            .toLowerCase()
            .includes(term)
      );
    }, [
      rosters,
      search,
    ]);

  /* ==========================================================================
     STATS
  ========================================================================== */

  const stats =
    useMemo(() => {
      const allShifts =
        rosters.flatMap(
          (roster) =>
            roster.shifts || []
        );

      const assigned =
        allShifts.filter(
          (shift) =>
            shift.assignedStaff
              ?.length > 0
        ).length;

      const open =
        allShifts.filter(
          (shift) =>
            shift.isOpenShift &&
            shift.status === 'OPEN'
        ).length;

      const published =
        rosters.filter(
          (roster) =>
            roster.status ===
            'PUBLISHED'
        ).length;

      const draft =
        rosters.filter(
          (roster) =>
            roster.status ===
            'DRAFT'
        ).length;

      const accepted =
        allShifts.filter(
          (shift) =>
            shift.status ===
            'ACCEPTED'
        ).length;

      return {
        rosters: rosters.length,
        published,
        draft,
        shifts: allShifts.length,
        assigned,
        open,
        accepted,
      };
    }, [rosters]);

  /* ==========================================================================
     CREATE ROSTER
  ========================================================================== */

  const handleCreateRoster =
    async () => {
      try {
        setSubmittingRoster(true);
        setActionError(null);

        if (
          !rosterForm.name.trim()
        ) {
          throw new Error(
            'Roster name is required.'
          );
        }

        if (
          !rosterForm.startDate ||
          !rosterForm.endDate
        ) {
          throw new Error(
            'Start date and end date are required.'
          );
        }

        if (
          new Date(
            rosterForm.startDate
          ) >
          new Date(
            rosterForm.endDate
          )
        ) {
          throw new Error(
            'Roster start date cannot be after the end date.'
          );
        }

        const payload: Record<
          string,
          unknown
        > = {
          name:
            rosterForm.name.trim(),
          startDate:
            rosterForm.startDate,
          endDate:
            rosterForm.endDate,
          areaType:
            rosterForm.areaType,
        };

        if (
          rosterForm.code.trim()
        ) {
          payload.code =
            rosterForm.code.trim();
        }

        if (
          rosterForm.description.trim()
        ) {
          payload.description =
            rosterForm.description.trim();
        }

        if (
          rosterForm.departmentName.trim()
        ) {
          payload.departmentName =
            rosterForm.departmentName.trim();
        }

        if (
          rosterForm.wardName.trim()
        ) {
          payload.wardName =
            rosterForm.wardName.trim();
        }

        const created =
          await apiRequest<Roster>(
            '',
            {
              method: 'POST',
              body: JSON.stringify(
                payload
              ),
            }
          );

        setShowRosterModal(
          false
        );

        setRosterForm(
          emptyRosterForm()
        );

        setSuccessMessage(
          'Roster created successfully.'
        );

        if (created?._id) {
          setSelectedRoster(
            created
          );
        }

        await loadRosters(
          1,
          true
        );
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to create roster.'
        );
      } finally {
        setSubmittingRoster(false);
      }
    };

  /* ==========================================================================
     CREATE SHIFT
  ========================================================================== */

  const handleCreateShift =
    async () => {
      try {
        setSubmittingShift(true);
        setActionError(null);

        if (
          !shiftForm.rosterId
        ) {
          throw new Error(
            'Please select a roster.'
          );
        }

        if (!shiftForm.date) {
          throw new Error(
            'Shift date is required.'
          );
        }

        if (
          !shiftForm.startTime ||
          !shiftForm.endTime
        ) {
          throw new Error(
            'Shift start and end time are required.'
          );
        }

        const payload: Record<
          string,
          unknown
        > = {
          rosterId:
            shiftForm.rosterId,
          date:
            shiftForm.date,
          startTime:
            shiftForm.startTime,
          endTime:
            shiftForm.endTime,
          shiftType:
            shiftForm.shiftType,
          areaType:
            shiftForm.areaType,
          requiredStaffCount:
            Math.max(
              Number(
                shiftForm.requiredStaffCount ||
                  1
              ),
              0
            ),
          isOpenShift:
            shiftForm.isOpenShift,
        };

        if (
          shiftForm.departmentName.trim()
        ) {
          payload.departmentName =
            shiftForm.departmentName.trim();
        }

        if (
          shiftForm.wardName.trim()
        ) {
          payload.wardName =
            shiftForm.wardName.trim();
        }

        if (
          shiftForm.location.trim()
        ) {
          payload.location =
            shiftForm.location.trim();
        }

        if (
          shiftForm.notes.trim()
        ) {
          payload.notes =
            shiftForm.notes.trim();
        }

        const created =
          await apiRequest<Shift>(
            '/shifts',
            {
              method: 'POST',
              body: JSON.stringify(
                payload
              ),
            }
          );

        setShowShiftModal(
          false
        );

        setShiftForm(
          emptyShiftForm(
            selectedRoster?._id ||
              ''
          )
        );

        setSuccessMessage(
          'Shift created successfully.'
        );

        if (
          selectedRoster?._id &&
          created
        ) {
          await loadRosters(
            page,
            true
          );
        } else {
          await loadRosters(
            1,
            true
          );
        }

        await loadOpenShifts();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to create shift.'
        );
      } finally {
        setSubmittingShift(false);
      }
    };

  /* ==========================================================================
     ASSIGN STAFF
  ========================================================================== */

  const handleAssignStaff =
    async () => {
      try {
        setSubmittingStaff(true);
        setActionError(null);

        if (
          !selectedRoster?._id
        ) {
          throw new Error(
            'Please select a roster.'
          );
        }

        if (
          !shiftForm.rosterId
        ) {
          throw new Error(
            'Roster is required.'
          );
        }

        const shiftId =
          shiftForm.rosterId
            ? selectedRoster.shifts.find(
                (shift) =>
                  shift._id ===
                  shiftForm.rosterId
              )?._id
            : undefined;

        if (!shiftId) {
          throw new Error(
            'Please open the staff assignment from a shift.'
          );
        }

        if (
          !staffForm.staffId
        ) {
          throw new Error(
            'Please select a staff member.'
          );
        }

        await apiRequest(
          `/${selectedRoster._id}/shifts/${shiftId}/staff`,
          {
            method: 'POST',
            body: JSON.stringify({
              staffId:
                staffForm.staffId,
              role:
                staffForm.role.trim() ||
                undefined,
              notes:
                staffForm.notes.trim() ||
                undefined,
            }),
          }
        );

        setShowStaffModal(
          false
        );

        setStaffForm(
          emptyStaffForm()
        );

        setStaffSearch('');
        setStaffResults([]);

        setSuccessMessage(
          'Staff assigned successfully.'
        );

        await loadRosters(
          page,
          true
        );

        await loadOpenShifts();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to assign staff.'
        );
      } finally {
        setSubmittingStaff(false);
      }
    };

  /* ==========================================================================
     REMOVE STAFF
  ========================================================================== */

  const handleRemoveStaff =
    async (
      rosterId: string,
      shiftId: string,
      staffId: string
    ) => {
      try {
        setActionError(null);

        await apiRequest(
          `/${rosterId}/shifts/${shiftId}/staff/${staffId}`,
          {
            method: 'DELETE',
          }
        );

        setSuccessMessage(
          'Staff removed from shift.'
        );

        await loadRosters(
          page,
          true
        );

        await loadOpenShifts();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to remove staff.'
        );
      }
    };

  /* ==========================================================================
     SHIFT ATTENDANCE
  ========================================================================== */

  const loadAttendanceReport = useCallback(
    async (
      startDate = attendanceStartDate,
      endDate = attendanceEndDate
    ) => {
      if (!startDate || !endDate) {
        setAttendanceError(
          'Please select both a start date and an end date.'
        );
        return;
      }

      if (startDate > endDate) {
        setAttendanceError(
          'The report start date cannot be after the end date.'
        );
        return;
      }

      try {
        setAttendanceLoading(true);
        setAttendanceError(null);

        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        if (attendanceStaffFilter) {
          params.set('staffId', attendanceStaffFilter);
        }

        if (attendanceRosterFilter) {
          params.set('rosterId', attendanceRosterFilter);
        }

        if (attendanceAreaFilter !== 'ALL') {
          params.set('areaType', attendanceAreaFilter);
        }

        const report =
          await apiRequest<AttendanceReport>(
            `/attendance/report?${params.toString()}`
          );

        setAttendanceReport(report);
      } catch (err) {
        setAttendanceError(
          err instanceof Error
            ? err.message
            : 'Failed to load attendance report.'
        );
        setAttendanceReport(null);
      } finally {
        setAttendanceLoading(false);
      }
    },
    [
      apiRequest,
      attendanceStartDate,
      attendanceEndDate,
      attendanceStaffFilter,
      attendanceRosterFilter,
      attendanceAreaFilter,
    ]
  );

  const handleSignIn = async (
    shift: Shift,
    assignment: ShiftAssignment
  ) => {
    if (!shift._id) return;

    const currentUserId = getCurrentUserId();
    const staffId = getId(assignment.staffId);

    if (!currentUserId || currentUserId !== staffId) {
      setActionError(
        'You can only sign in for your own assigned shift.'
      );
      return;
    }

    try {
      setAttendanceSubmitting(true);
      setActionError(null);

      await apiRequest(
        `/shifts/${shift._id}/sign-in`,
        {
          method: 'POST',
          body: JSON.stringify({
            notes:
              attendanceNote.trim() ||
              undefined,
          }),
        }
      );

      setAttendanceNote('');
      setSuccessMessage(
        'Shift sign-in recorded successfully. The exact time was logged automatically.'
      );

      await loadRosters(page, true);
      await loadOpenShifts();

      if (attendanceStartDate && attendanceEndDate) {
        await loadAttendanceReport();
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to sign in to the shift.'
      );
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const handleSignOut = async (
    shift: Shift,
    assignment: ShiftAssignment
  ) => {
    if (!shift._id) return;

    const currentUserId = getCurrentUserId();
    const staffId = getId(assignment.staffId);

    if (!currentUserId || currentUserId !== staffId) {
      setActionError(
        'You can only sign out of your own assigned shift.'
      );
      return;
    }

    try {
      setAttendanceSubmitting(true);
      setActionError(null);

      await apiRequest(
        `/shifts/${shift._id}/sign-out`,
        {
          method: 'POST',
          body: JSON.stringify({
            notes:
              attendanceNote.trim() ||
              undefined,
          }),
        }
      );

      setAttendanceNote('');
      setSuccessMessage(
        'Shift sign-out recorded successfully. The exact time was logged automatically.'
      );

      await loadRosters(page, true);
      await loadOpenShifts();

      if (attendanceStartDate && attendanceEndDate) {
        await loadAttendanceReport();
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Failed to sign out of the shift.'
      );
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  const downloadAttendanceReport = () => {
    if (!attendanceReport) return;

    const headers = [
      'Date',
      'Roster',
      'Shift',
      'Shift Type',
      'Area',
      'Department',
      'Ward',
      'Location',
      'Staff ID',
      'Staff Name',
      'Role',
      'Status',
      'Signed In',
      'Signed Out',
      'Late By Minutes',
      'Attendance Notes',
    ];

    const rows = attendanceReport.rows.map(
      (row) => {
        const staff =
          resolveStaff(row.staffId);

        return [
          formatDate(row.date),
          row.rosterName,
          `${row.startTime} - ${row.endTime}`,
          formatLabel(row.shiftType),
          formatLabel(row.areaType),
          row.departmentName || '',
          row.wardName || '',
          row.location || '',
          row.staffId,
          getStaffName(
            staff || row.staffId
          ),
          row.role ||
            getStaffRole(staff),
          formatLabel(
            row.attendanceStatus
          ),
          row.signedInAt
            ? formatDateTime(
                row.signedInAt
              )
            : '',
          row.signedOutAt
            ? formatDateTime(
                row.signedOutAt
              )
            : '',
          row.lateByMinutes || 0,
          row.attendanceNotes || '',
        ];
      }
    );

    const summary = [
      'Staff Attendance Report',
      `Date Range: ${attendanceReport.startDate} to ${attendanceReport.endDate}`,
      `Grace Period: ${attendanceReport.graceMinutes} minutes`,
      `Scheduled: ${attendanceReport.summary.scheduled}`,
      `Present: ${attendanceReport.summary.present}`,
      `Late: ${attendanceReport.summary.late}`,
      `Absent: ${attendanceReport.summary.absent}`,
      `Missed Sign-Out: ${attendanceReport.summary.missedSignOut}`,
      '',
    ].join('\\r\\n');

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(formatCsvCell)
          .join(',')
      )
      .join('\\r\\n');

    const blob = new Blob(
      [summary + csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `staff-attendance-report-${attendanceReport.startDate}-to-${attendanceReport.endDate}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  /* ==========================================================================
     PUBLISH ROSTER
  ========================================================================== */

  const handlePublishRoster =
    async (
      rosterId: string
    ) => {
      try {
        setActionError(null);

        await apiRequest(
          `/${rosterId}/publish`,
          {
            method: 'POST',
          }
        );

        setSuccessMessage(
          'Roster published successfully.'
        );

        await loadRosters(
          page,
          true
        );
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to publish roster.'
        );
      }
    };

  /* ==========================================================================
     SAVE AVAILABILITY
  ========================================================================== */

  const handleSaveAvailability =
    async () => {
      try {
        setSubmittingAvailability(
          true
        );

        setActionError(null);

        if (
          !availabilityForm.staffId
        ) {
          throw new Error(
            'Please select a staff member.'
          );
        }

        if (
          !availabilityForm.date
        ) {
          throw new Error(
            'Availability date is required.'
          );
        }

        await apiRequest(
          '/availability',
          {
            method: 'POST',
            body: JSON.stringify({
              staffId:
                availabilityForm.staffId,
              date:
                availabilityForm.date,
              status:
                availabilityForm.status,
              preferredShiftTypes:
                availabilityForm.preferredShiftTypes,
              availableFrom:
                availabilityForm.availableFrom ||
                undefined,
              availableTo:
                availabilityForm.availableTo ||
                undefined,
              notes:
                availabilityForm.notes.trim() ||
                undefined,
            }),
          }
        );

        setSuccessMessage(
          'Staff availability saved.'
        );

        setShowAvailabilityModal(
          false
        );

        await loadAvailability();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : 'Failed to save availability.'
        );
      } finally {
        setSubmittingAvailability(
          false
        );
      }
    };

  /* ==========================================================================
     OPEN MODALS
  ========================================================================== */

  const openCreateRoster =
    () => {
      setActionError(null);
      setRosterForm(
        emptyRosterForm()
      );
      setShowRosterModal(true);
    };

  const openCreateShift =
    (roster?: Roster) => {
      setActionError(null);

      setShiftForm(
        emptyShiftForm(
          roster?._id ||
            selectedRoster?._id ||
            ''
        )
      );

      if (roster) {
        setSelectedRoster(
          roster
        );

        setShiftForm(
          (current) => ({
            ...current,
            rosterId:
              roster._id || '',
            areaType:
              roster.areaType,
            departmentName:
              roster.departmentName ||
              '',
            wardName:
              roster.wardName ||
              '',
          })
        );
      }

      setShowShiftModal(true);
    };

  const openAssignStaff =
    (
      roster: Roster,
      shift: Shift
    ) => {
      setActionError(null);

      setSelectedRoster(
        roster
      );

      setShiftForm(
        (current) => ({
          ...current,
          rosterId:
            shift._id || '',
        })
      );

      setStaffForm(
        emptyStaffForm()
      );

      setStaffSearch('');
      setStaffResults([]);

      setShowStaffModal(true);
    };

  /* ==========================================================================
     DELETE ASSIGNMENT UI HANDLER
  ========================================================================== */

  const handleStaffRemoveClick =
    (
      roster: Roster,
      shift: Shift,
      assignment: ShiftAssignment
    ) => {
      const staffId =
        getId(
          assignment.staffId
        );

      if (
        !roster._id ||
        !shift._id ||
        !staffId
      ) {
        return;
      }

      void handleRemoveStaff(
        roster._id,
        shift._id,
        staffId
      );
    };

  /* ==========================================================================
     CALENDAR
  ========================================================================== */

  const calendarDays =
    useMemo(() => {
      const base =
        new Date(
          calendarDate
        );

      base.setHours(
        0,
        0,
        0,
        0
      );

      const day =
        base.getDay();

      const mondayOffset =
        day === 0
          ? -6
          : 1 - day;

      const monday =
        new Date(base);

      monday.setDate(
        base.getDate() +
          mondayOffset
      );

      return Array.from(
        { length: 7 },
        (_, index) => {
          const date =
            new Date(
              monday
            );

          date.setDate(
            monday.getDate() +
              index
          );

          return date;
        }
      );
    }, [
      calendarDate,
    ]);

  const calendarShifts =
    useMemo(() => {
      const all =
        rosters.flatMap(
          (roster) =>
            (roster.shifts || []).map(
              (shift) => ({
                shift,
                roster,
              })
            )
        );

      return all;
    }, [rosters]);

  const shiftsForDay =
    useCallback(
      (date: Date) => {
        return calendarShifts.filter(
          ({
            shift,
          }) => {
            const shiftDate =
              new Date(
                shift.date
              );

            return (
              shiftDate.getFullYear() ===
                date.getFullYear() &&
              shiftDate.getMonth() ===
                date.getMonth() &&
              shiftDate.getDate() ===
                date.getDate()
            );
          }
        );
      },
      [calendarShifts]
    );

  /* ==========================================================================
     ROSTER SELECTION
  ========================================================================== */

  const selectRoster =
    (roster: Roster) => {
      setSelectedRoster(
        roster
      );
    };

  /* ==========================================================================
     NOTIFICATION AUTO CLEAR
  ========================================================================== */

  useEffect(() => {
    if (
      !successMessage &&
      !actionError
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        setSuccessMessage(null);
        setActionError(null);
      }, 5000);

    return () =>
      clearTimeout(timer);
  }, [
    successMessage,
    actionError,
  ]);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="min-h-full bg-slate-50/30 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans pb-12">
      {/* =====================================================================
         HEADER
      ===================================================================== */}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="w-9 h-9 mt-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Staff Rostering
              </h1>

              <StatusBadge className="bg-[#e8f5f3] text-[#1b7b68] border-[#1b7b68]/10">
                Workforce Management
              </StatusBadge>
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Build, manage and publish staff
              rosters across every hospital area.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              refreshAll()
            }
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={
              openCreateRoster
            }
            className="px-4 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#156354] text-white text-xs font-bold flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Roster
          </button>
        </div>
      </div>

      {/* =====================================================================
         ALERTS
      ===================================================================== */}

      {(error ||
        actionError ||
        successMessage) && (
        <div className="mb-5 space-y-2">
          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">
                  Unable to load rostering data
                </p>

                <p className="text-[11px] text-rose-600 mt-0.5">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {actionError && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">
                  Action failed
                </p>

                <p className="text-[11px] text-rose-600 mt-0.5">
                  {actionError}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActionError(null)
                }
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />

              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-800">
                  Success
                </p>

                <p className="text-[11px] text-emerald-600 mt-0.5">
                  {successMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
         STAT CARDS
      ===================================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Rosters
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.rosters}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Total rosters
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Published
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.published}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Active rosters
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Drafts
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.draft}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Awaiting publishing
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Clock3 className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Shifts
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.shifts}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Scheduled shifts
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Assigned
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.assigned}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Staffed shifts
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Open
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.open}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Need staffing
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>

            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
              Accepted
            </span>
          </div>

          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.accepted}
          </p>

          <p className="text-[10px] text-slate-400 mt-1">
            Staff accepted
          </p>
        </div>
      </div>

      {/* =====================================================================
         TABS
      ===================================================================== */}

      <div className="bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm mb-5 flex flex-wrap gap-1">
        {[
          {
            key: 'rosters' as const,
            label: 'Rosters',
            icon: CalendarDays,
          },
          {
            key: 'calendar' as const,
            label: 'Roster Calendar',
            icon: CalendarCheck2,
          },
          {
            key: 'open' as const,
            label: 'Open Shifts',
            icon: BriefcaseBusiness,
          },
          {
            key: 'availability' as const,
            label: 'Availability',
            icon: UserCheck,
          },
          {
            key: 'swaps' as const,
            label: 'Shift Swaps',
            icon: ArrowLeftRight,
          },
          {
            key: 'attendance' as const,
            label: 'Attendance',
            icon: ClipboardCheck,
          },
        ].map(
          ({
            key,
            label,
            icon: Icon,
          }) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setActiveTab(
                  key
                )
              }
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === key
                  ? 'bg-[#1b7b68] text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        )}
      </div>

      {/* =====================================================================
         ROSTERS TAB
      ===================================================================== */}

      {activeTab === 'rosters' && (
        <div className="space-y-5">
          {/* FILTER BAR */}

          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search rosters, departments, wards..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div className="relative">
                <select
                  value={
                    statusFilter
                  }
                  onChange={(event) =>
                    setStatusFilter(
                      event.target
                        .value as
                        | 'ALL'
                        | RosterStatus
                    )
                  }
                  className="appearance-none min-w-40 pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="ALL">
                    All Statuses
                  </option>

                  {STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={
                    areaFilter
                  }
                  onChange={(event) =>
                    setAreaFilter(
                      event.target
                        .value as
                        | 'ALL'
                        | RosterAreaType
                    )
                  }
                  className="appearance-none min-w-44 pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="ALL">
                    All Areas
                  </option>

                  {AREA_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter(
                    'ALL'
                  );
                  setAreaFilter(
                    'ALL'
                  );
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-2"
              >
                <Filter className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>

          {/* ROSTER LIST */}

          {loading ? (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl py-20 text-center">
              <Loader2 className="w-7 h-7 text-[#1b7b68] animate-spin mx-auto" />

              <p className="text-xs text-slate-400 mt-3">
                Loading rosters...
              </p>
            </div>
          ) : filteredRosters.length === 0 ? (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl py-20 text-center">
              <CalendarDays className="w-9 h-9 text-slate-300 mx-auto" />

              <p className="text-sm font-bold text-slate-700 mt-3">
                No rosters found
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Create a roster to start scheduling staff.
              </p>

              <button
                type="button"
                onClick={
                  openCreateRoster
                }
                className="mt-4 px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold"
              >
                Create Roster
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredRosters.map(
                (roster) => (
                  <div
                    key={
                      roster._id ||
                      roster.code ||
                      roster.name
                    }
                    className={`bg-white border rounded-2xl shadow-sm p-5 transition-all ${
                      selectedRoster?._id ===
                      roster._id
                        ? 'border-[#1b7b68]/30 ring-1 ring-[#1b7b68]/10'
                        : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#e8f5f3] text-[#1b7b68] flex items-center justify-center shrink-0">
                          <CalendarDays className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-slate-800 truncate">
                              {roster.name}
                            </h3>

                            <StatusBadge
                              className={getStatusClasses(
                                roster.status
                              )}
                            >
                              {formatLabel(
                                roster.status
                              )}
                            </StatusBadge>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-1">
                            {formatLabel(
                              roster.areaType
                            )}

                            {roster.departmentName
                              ? ` • ${roster.departmentName}`
                              : ''}

                            {roster.wardName
                              ? ` • ${roster.wardName}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openCreateShift(
                              roster
                            )
                          }
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#1b7b68] hover:border-[#1b7b68]/20 flex items-center justify-center"
                          title="Add shift"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                      <Field
                        label="Start"
                        value={formatDate(
                          roster.startDate
                        )}
                      />

                      <Field
                        label="End"
                        value={formatDate(
                          roster.endDate
                        )}
                      />

                      <Field
                        label="Shifts"
                        value={
                          roster.shifts
                            ?.length || 0
                        }
                      />

                      <Field
                        label="Version"
                        value={`v${
                          roster.version ||
                          1
                        }`}
                      />
                    </div>

                    {roster.description && (
                      <p className="text-[11px] text-slate-500 mt-4 line-clamp-2">
                        {roster.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          selectRoster(
                            roster
                          )
                        }
                        className="text-[11px] font-bold text-[#1b7b68] hover:underline"
                      >
                        Manage shifts
                      </button>

                      <div className="flex items-center gap-2">
                        {roster.status ===
                          'DRAFT' && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePublishRoster(
                                roster._id ||
                                  ''
                              )
                            }
                            disabled={
                              !roster._id
                            }
                            className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            Publish
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            openCreateShift(
                              roster
                            )
                          }
                          className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3" />
                          Add Shift
                        </button>
                      </div>
                    </div>

                    {selectedRoster?._id ===
                      roster._id && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                              Shift Schedule
                            </p>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {roster.shifts?.length ||
                                0}{' '}
                              shift
                              {(roster.shifts
                                ?.length ||
                                0) ===
                              1
                                ? ''
                                : 's'}{' '}
                              configured
                            </p>
                          </div>
                        </div>

                        {!roster.shifts?.length ? (
                          <div className="rounded-2xl bg-slate-50 border border-slate-100 py-7 text-center">
                            <Clock3 className="w-6 h-6 text-slate-300 mx-auto" />

                            <p className="text-xs font-semibold text-slate-500 mt-2">
                              No shifts yet
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                openCreateShift(
                                  roster
                                )
                              }
                              className="mt-3 text-[10px] font-bold text-[#1b7b68]"
                            >
                              Add first shift
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {roster.shifts.map(
                              (
                                shift
                              ) => (
                                <div
                                  key={
                                    shift._id
                                  }
                                  className={`rounded-2xl border border-slate-100 border-l-4 ${getShiftAccent(
                                    shift.shiftType
                                  )} bg-slate-50/50 p-3`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-xs font-extrabold text-slate-800">
                                          {formatShortDate(
                                            shift.date
                                          )}
                                        </p>

                                        <StatusBadge
                                          className={getStatusClasses(
                                            shift.status
                                          )}
                                        >
                                          {formatLabel(
                                            shift.status
                                          )}
                                        </StatusBadge>
                                      </div>

                                      <p className="text-[10px] text-slate-500 mt-1">
                                        {
                                          shift.startTime
                                        }{' '}
                                        –{' '}
                                        {
                                          shift.endTime
                                        }{' '}
                                        •{' '}
                                        {formatLabel(
                                          shift.shiftType
                                        )}
                                      </p>

                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {shift.location ||
                                          shift.departmentName ||
                                          shift.wardName ||
                                          formatLabel(
                                            shift.areaType
                                          )}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openAssignStaff(
                                            roster,
                                            shift
                                          )
                                        }
                                        className="w-7 h-7 rounded-lg bg-[#1b7b68] text-white flex items-center justify-center"
                                        title="Assign staff"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-3 space-y-2">
                                    {shift.assignedStaff?.length ===
                                    0 ? (
                                      <div className="rounded-xl bg-white border border-dashed border-slate-200 px-3 py-3 text-center">
                                        <p className="text-[10px] text-slate-400">
                                          No staff assigned
                                        </p>
                                      </div>
                                    ) : (
                                      shift.assignedStaff.map(
                                        (
                                          assignment,
                                          index
                                        ) => {
                                          const staff =
                                            resolveStaff(
                                              assignment.staffId
                                            );

                                          const staffId =
                                            getId(
                                              assignment.staffId
                                            );

                                          return (
                                            <div
                                              key={`${staffId}-${assignment.role}-${index}`}
                                              className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-100 p-2.5"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                                  <User className="w-3.5 h-3.5" />
                                                </div>

                                                <div className="min-w-0">
                                                  <p className="text-[11px] font-bold text-slate-800 truncate">
                                                    {getStaffName(
                                                      staff ||
                                                        assignment.staffId
                                                    )}
                                                  </p>

                                                  <p className="text-[9px] text-[#1b7b68] font-semibold mt-0.5">
                                                    {assignment.role ||
                                                      getStaffRole(
                                                        staff
                                                      )}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                                                {(() => {
                                                  const attendanceStatus =
                                                    getLiveAttendanceStatus(
                                                      shift,
                                                      assignment
                                                    );

                                                  const currentUserId =
                                                    getCurrentUserId();

                                                  const isOwnAssignment =
                                                    !!currentUserId &&
                                                    currentUserId ===
                                                      staffId;

                                                  return (
                                                    <>
                                                      <StatusBadge
                                                        className={getStatusClasses(
                                                          assignment.status
                                                        )}
                                                      >
                                                        {formatLabel(
                                                          assignment.status
                                                        )}
                                                      </StatusBadge>

                                                      <StatusBadge
                                                        className={getAttendanceStatusClasses(
                                                          attendanceStatus
                                                        )}
                                                      >
                                                        {formatLabel(
                                                          attendanceStatus
                                                        )}
                                                      </StatusBadge>

                                                      {isOwnAssignment &&
                                                        !assignment.signedInAt &&
                                                        attendanceStatus !==
                                                          'ABSENT' && (
                                                          <button
                                                            type="button"
                                                            disabled={
                                                              attendanceSubmitting
                                                            }
                                                            onClick={() =>
                                                              void handleSignIn(
                                                                shift,
                                                                assignment
                                                              )
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg bg-[#1b7b68] text-white text-[9px] font-bold flex items-center gap-1 disabled:opacity-50"
                                                            title="Sign in to this shift"
                                                          >
                                                            <LogIn className="w-3 h-3" />
                                                            Sign In
                                                          </button>
                                                        )}

                                                      {isOwnAssignment &&
                                                        assignment.signedInAt &&
                                                        !assignment.signedOutAt && (
                                                          <button
                                                            type="button"
                                                            disabled={
                                                              attendanceSubmitting
                                                            }
                                                            onClick={() =>
                                                              void handleSignOut(
                                                                shift,
                                                                assignment
                                                              )
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[9px] font-bold flex items-center gap-1 disabled:opacity-50"
                                                            title="Sign out of this shift"
                                                          >
                                                            <LogOut className="w-3 h-3" />
                                                            Sign Out
                                                          </button>
                                                        )}

                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleStaffRemoveClick(
                                                            roster,
                                                            shift,
                                                            assignment
                                                          )
                                                        }
                                                        className="text-slate-300 hover:text-rose-600"
                                                        title="Remove assignment"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          );
                                        }
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* PAGINATION */}

          {!loading &&
            filteredRosters.length >
              0 && (
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  Showing page{' '}
                  <strong className="text-slate-700">
                    {page}
                  </strong>{' '}
                  of{' '}
                  <strong className="text-slate-700">
                    {pages}
                  </strong>

                  {total > 0 &&
                    ` • ${total} total`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      page <= 1 ||
                      loading
                    }
                    onClick={() =>
                      loadRosters(
                        page - 1
                      )
                    }
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={
                      page >= pages ||
                      loading
                    }
                    onClick={() =>
                      loadRosters(
                        page + 1
                      )
                    }
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* =====================================================================
         CALENDAR TAB
      ===================================================================== */}

      {activeTab === 'calendar' && (
        <SectionCard
          title="Roster Calendar"
          subtitle="Weekly view of scheduled shifts across the hospital"
          icon={
            <CalendarDays className="w-4 h-4" />
          }
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const date =
                    new Date(
                      calendarDate
                    );

                  date.setDate(
                    date.getDate() -
                      7
                  );

                  setCalendarDate(
                    date
                  );
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCalendarDate(
                    new Date()
                  )
                }
                className="px-3 h-7 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  const date =
                    new Date(
                      calendarDate
                    );

                  date.setDate(
                    date.getDate() +
                      7
                  );

                  setCalendarDate(
                    date
                  );
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {calendarDays.map(
              (date) => {
                const dayShifts =
                  shiftsForDay(
                    date
                  );

                const isToday =
                  new Date().toDateString() ===
                  date.toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={`rounded-2xl border ${
                      isToday
                        ? 'border-[#1b7b68]/20 bg-[#e8f5f3]/30'
                        : 'border-slate-100 bg-slate-50/30'
                    } min-h-230px`}
                  >
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                        {date.toLocaleDateString(
                          undefined,
                          {
                            weekday:
                              'long',
                          }
                        )}
                      </p>

                      <p
                        className={`text-sm font-black mt-1 ${
                          isToday
                            ? 'text-[#1b7b68]'
                            : 'text-slate-800'
                        }`}
                      >
                        {date.toLocaleDateString(
                          undefined,
                          {
                            month:
                              'short',
                            day:
                              'numeric',
                          }
                        )}
                      </p>
                    </div>

                    <div className="p-2 space-y-2">
                      {dayShifts.length ===
                      0 ? (
                        <div className="py-8 text-center">
                          <CalendarDays className="w-5 h-5 text-slate-200 mx-auto" />

                          <p className="text-[9px] text-slate-400 mt-2">
                            No shifts
                          </p>
                        </div>
                      ) : (
                        dayShifts.map(
                          ({
                            shift,
                            roster,
                          }) => (
                            <button
                              key={
                                shift._id
                              }
                              type="button"
                              onClick={() =>
                                selectRoster(
                                  roster
                                )
                              }
                              className={`w-full text-left rounded-xl border border-slate-100 border-l-4 ${getShiftAccent(
                                shift.shiftType
                              )} bg-white p-2.5 hover:shadow-sm transition-all`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-extrabold text-slate-800 truncate">
                                  {formatLabel(
                                    shift.shiftType
                                  )}
                                </p>

                                <span className="text-[8px] font-bold text-slate-400">
                                  {
                                    shift.startTime
                                  }
                                </span>
                              </div>

                              <p className="text-[9px] text-slate-500 mt-1 truncate">
                                {roster.name}
                              </p>

                              <p className="text-[9px] text-slate-400 mt-1">
                                {shift.assignedStaff
                                  ?.length ||
                                  0}{' '}
                                assigned
                              </p>
                            </button>
                          )
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </SectionCard>
      )}

      {/* =====================================================================
         OPEN SHIFTS TAB
      ===================================================================== */}

      {activeTab === 'open' && (
        <SectionCard
          title="Open Shifts"
          subtitle="Published shifts that still require staff coverage"
          icon={
            <BriefcaseBusiness className="w-4 h-4" />
          }
          action={
            <StatusBadge className="bg-rose-50 text-rose-700 border-rose-100">
              {openShifts.length} Open
            </StatusBadge>
          }
        >
          {openShifts.length ===
          0 ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />

              <p className="text-sm font-bold text-slate-700 mt-3">
                No open shifts
              </p>

              <p className="text-xs text-slate-400 mt-1">
                All published shifts currently have coverage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {openShifts.map(
                (shift) => (
                  <div
                    key={
                      shift._id
                    }
                    className={`rounded-2xl border border-slate-100 border-l-4 ${getShiftAccent(
                      shift.shiftType
                    )} bg-slate-50/50 p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          {formatShortDate(
                            shift.date
                          )}
                        </p>

                        <p className="text-[10px] text-slate-500 mt-1">
                          {shift.startTime}{' '}
                          –{' '}
                          {shift.endTime}
                        </p>
                      </div>

                      <StatusBadge className="bg-rose-50 text-rose-700 border-rose-100">
                        Open
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <Field
                        label="Shift"
                        value={formatLabel(
                          shift.shiftType
                        )}
                      />

                      <Field
                        label="Area"
                        value={formatLabel(
                          shift.areaType
                        )}
                      />

                      <Field
                        label="Required"
                        value={
                          shift.requiredStaffCount ??
                          1
                        }
                      />

                      <Field
                        label="Assigned"
                        value={
                          shift.assignedStaff
                            ?.length ||
                          0
                        }
                      />
                    </div>

                    {shift.location && (
                      <p className="text-[10px] text-slate-400 mt-3">
                        Location:{' '}
                        {shift.location}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* =====================================================================
         AVAILABILITY TAB
      ===================================================================== */}

      {activeTab === 'availability' && (
        <div className="space-y-5">
          <SectionCard
            title="Staff Availability"
            subtitle="Record availability, preferences and unavailable periods"
            icon={
              <UserCheck className="w-4 h-4" />
            }
            action={
              <button
                type="button"
                onClick={() => {
                  setAvailabilityForm(
                    emptyAvailabilityForm()
                  );
                  setStaffSearch('');
                  setStaffResults([]);
                  setShowAvailabilityModal(
                    true
                  );
                }}
                className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[10px] font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                Add Availability
              </button>
            }
          >
            <div className="rounded-2xl bg-[#e8f5f3]/50 border border-[#1b7b68]/10 p-4 mb-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#1b7b68] mt-0.5" />

                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Leave-aware scheduling
                  </p>

                  <p className="text-[10px] text-slate-500 mt-1">
                    Use staff availability records before assigning shifts so unavailable staff are not accidentally rostered.
                  </p>
                </div>
              </div>
            </div>

            {availability.length ===
            0 ? (
              <div className="py-12 text-center">
                <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto" />

                <p className="text-xs font-semibold text-slate-500 mt-3">
                  Select a staff member to view availability
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setAvailabilityForm(
                      emptyAvailabilityForm()
                    );

                    setShowAvailabilityModal(
                      true
                    );
                  }}
                  className="mt-3 text-[10px] font-bold text-[#1b7b68]"
                >
                  Record availability
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {availability.map(
                  (item) => {
                    const staff =
                      resolveStaff(
                        item.staffId
                      );

                    return (
                      <div
                        key={
                          item._id ||
                          `${item.staffId}-${item.date}`
                        }
                        className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                            <User className="w-3.5 h-3.5" />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {getStaffName(
                                staff ||
                                  item.staffId
                              )}
                            </p>

                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatDate(
                                item.date
                              )}
                            </p>
                          </div>
                        </div>

                        <StatusBadge
                          className={getStatusClasses(
                            item.status
                          )}
                        >
                          {formatLabel(
                            item.status
                          )}
                        </StatusBadge>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* =====================================================================
         SWAPS TAB
      ===================================================================== */}

      {activeTab === 'swaps' && (
        <SectionCard
          title="Shift Swap Management"
          subtitle="Review staff swap requests and manager decisions"
          icon={
            <ArrowLeftRight className="w-4 h-4" />
          }
        >
          {swaps.length ===
          0 ? (
            <div className="py-14 text-center">
              <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto" />

              <p className="text-sm font-bold text-slate-700 mt-3">
                No shift swap requests loaded
              </p>

              <p className="text-xs text-slate-400 mt-1">
                The current backend provides swap creation and approval endpoints.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {swaps.map(
                (swap) => {
                  const requester =
                    resolveStaff(
                      swap.requesterStaffId
                    );

                  const replacement =
                    resolveStaff(
                      swap.replacementStaffId
                    );

                  return (
                    <div
                      key={
                        swap._id
                      }
                      className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {getStaffName(
                              requester ||
                                swap.requesterStaffId
                            )}
                          </p>

                          <p className="text-[10px] text-slate-400 mt-1">
                            Replacement:{' '}
                            {getStaffName(
                              replacement ||
                                swap.replacementStaffId
                            )}
                          </p>
                        </div>

                        <StatusBadge
                          className={getStatusClasses(
                            swap.status
                          )}
                        >
                          {formatLabel(
                            swap.status
                          )}
                        </StatusBadge>
                      </div>

                      {swap.reason && (
                        <p className="text-[10px] text-slate-500 mt-3">
                          {swap.reason}
                        </p>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* =====================================================================
         ATTENDANCE TAB
      ===================================================================== */}

      {activeTab === 'attendance' && (
        <div className="space-y-5">
          <SectionCard
            title="Staff Shift Attendance"
            subtitle="Sign in and out of assigned shifts, monitor lateness and review attendance history."
            icon={<ClipboardCheck className="w-4 h-4" />}
            action={
              <StatusBadge className="bg-[#e8f5f3] text-[#1b7b68] border-[#1b7b68]/10">
                10 min grace
              </StatusBadge>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={attendanceStartDate}
                  onChange={(event) =>
                    setAttendanceStartDate(
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={attendanceEndDate}
                  onChange={(event) =>
                    setAttendanceEndDate(
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Staff
                </label>
                <select
                  value={attendanceStaffFilter}
                  onChange={(event) =>
                    setAttendanceStaffFilter(
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="">All staff</option>
                  {staffDirectory.map(
                    (staff) => {
                      const id = getId(staff);
                      if (!id) return null;

                      return (
                        <option
                          key={id}
                          value={id}
                        >
                          {getStaffName(staff)}
                        </option>
                      );
                    }
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Roster
                </label>
                <select
                  value={attendanceRosterFilter}
                  onChange={(event) =>
                    setAttendanceRosterFilter(
                      event.target.value
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="">
                    All rosters
                  </option>
                  {rosters.map(
                    (roster) =>
                      roster._id ? (
                        <option
                          key={roster._id}
                          value={roster._id}
                        >
                          {roster.name}
                        </option>
                      ) : null
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Area
                </label>
                <select
                  value={attendanceAreaFilter}
                  onChange={(event) =>
                    setAttendanceAreaFilter(
                      event.target.value as
                        | 'ALL'
                        | RosterAreaType
                    )
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
                >
                  <option value="ALL">
                    All areas
                  </option>
                  {AREA_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  void loadAttendanceReport(
                    attendanceStartDate,
                    attendanceEndDate
                  )
                }
                disabled={attendanceLoading}
                className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {attendanceLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                View Attendance
              </button>

              <button
                type="button"
                onClick={downloadAttendanceReport}
                disabled={
                  !attendanceReport ||
                  attendanceReport.rows.length === 0
                }
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </button>
            </div>

            {attendanceError && (
              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                {attendanceError}
              </div>
            )}

            {attendanceReport && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                  {[
                    {
                      label: 'Scheduled',
                      value:
                        attendanceReport.summary.scheduled,
                      className:
                        'bg-slate-50 border-slate-100 text-slate-700',
                    },
                    {
                      label: 'Present',
                      value:
                        attendanceReport.summary.present,
                      className:
                        'bg-emerald-50 border-emerald-100 text-emerald-700',
                    },
                    {
                      label: 'Late',
                      value:
                        attendanceReport.summary.late,
                      className:
                        'bg-amber-50 border-amber-100 text-amber-700',
                    },
                    {
                      label: 'Absent',
                      value:
                        attendanceReport.summary.absent,
                      className:
                        'bg-rose-50 border-rose-100 text-rose-700',
                    },
                    {
                      label: 'Missed Sign-Out',
                      value:
                        attendanceReport.summary.missedSignOut,
                      className:
                        'bg-orange-50 border-orange-100 text-orange-700',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border p-3 ${item.className}`}
                    >
                      <p className="text-[9px] uppercase tracking-wider font-extrabold">
                        {item.label}
                      </p>
                      <p className="text-xl font-black mt-1">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[1150px] text-left">
                    <thead className="bg-slate-50 text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                      <tr>
                        <th className="px-4 py-3">
                          Staff
                        </th>
                        <th className="px-4 py-3">
                          Date
                        </th>
                        <th className="px-4 py-3">
                          Shift
                        </th>
                        <th className="px-4 py-3">
                          Role
                        </th>
                        <th className="px-4 py-3">
                          Status
                        </th>
                        <th className="px-4 py-3">
                          Signed In
                        </th>
                        <th className="px-4 py-3">
                          Signed Out
                        </th>
                        <th className="px-4 py-3">
                          Late
                        </th>
                        <th className="px-4 py-3">
                          Notes
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {attendanceReport.rows.length ===
                      0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="py-14 text-center"
                          >
                            <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-sm font-bold text-slate-600 mt-3">
                              No attendance records found
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Try another date range or filter.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        attendanceReport.rows.map(
                          (row, index) => {
                            const staff =
                              resolveStaff(
                                row.staffId
                              );

                            return (
                              <tr
                                key={`${row.shiftId}-${row.staffId}-${index}`}
                                className="hover:bg-[#e8f5f3]/20 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800">
                                        {getStaffName(
                                          staff ||
                                            row.staffId
                                        )}
                                      </p>
                                      <p className="text-[9px] text-slate-400">
                                        {row.departmentName ||
                                          row.wardName ||
                                          formatLabel(
                                            row.areaType
                                          )}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  {formatDate(
                                    row.date
                                  )}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                  <p className="font-semibold text-slate-700">
                                    {row.startTime} –{' '}
                                    {row.endTime}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {formatLabel(
                                      row.shiftType
                                    )}
                                  </p>
                                </td>

                                <td className="px-4 py-3">
                                  {row.role ||
                                    getStaffRole(
                                      staff
                                    )}
                                </td>

                                <td className="px-4 py-3">
                                  <StatusBadge
                                    className={getAttendanceStatusClasses(
                                      row.attendanceStatus
                                    )}
                                  >
                                    {formatLabel(
                                      row.attendanceStatus
                                    )}
                                  </StatusBadge>
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap text-[10px]">
                                  {row.signedInAt
                                    ? formatDateTime(
                                        row.signedInAt
                                      )
                                    : '—'}
                                </td>

                                <td className="px-4 py-3 whitespace-nowrap text-[10px]">
                                  {row.signedOutAt
                                    ? formatDateTime(
                                        row.signedOutAt
                                      )
                                    : '—'}
                                </td>

                                <td className="px-4 py-3">
                                  {row.lateByMinutes
                                    ? `${row.lateByMinutes} min`
                                    : '—'}
                                </td>

                                <td className="px-4 py-3 max-w-[260px]">
                                  <span className="text-[10px] text-slate-500">
                                    {row.attendanceNotes ||
                                      '—'}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="Today's Assigned Shift"
            subtitle="Sign in or sign out of your own assigned shift. The server records the exact time automatically."
            icon={<Clock3 className="w-4 h-4" />}
          >
            {(() => {
              const currentUserId =
                getCurrentUserId();

              const todayShifts =
                calendarShifts.filter(
                  ({ shift }) => {
                    const today =
                      new Date();

                    const date =
                      new Date(
                        shift.date
                      );

                    return (
                      date.getFullYear() ===
                        today.getFullYear() &&
                      date.getMonth() ===
                        today.getMonth() &&
                      date.getDate() ===
                        today.getDate()
                    );
                  }
                );

              const myAssignments =
                todayShifts.flatMap(
                  ({
                    shift,
                    roster,
                  }) =>
                    shift.assignedStaff
                      .filter(
                        (assignment) =>
                          !!currentUserId &&
                          getId(
                            assignment.staffId
                          ) === currentUserId
                      )
                      .map(
                        (
                          assignment,
                          index
                        ) => ({
                          shift,
                          roster,
                          assignment,
                          index,
                        })
                      )
                );

              if (
                myAssignments.length === 0
              ) {
                return (
                  <div className="py-10 text-center">
                    <Users className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-500 mt-2">
                      You have no assigned shift today
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Your sign-in controls will appear here when you are rostered.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {myAssignments.map(
                    ({
                      shift,
                      roster,
                      assignment,
                      index,
                    }) => {
                      const status =
                        getLiveAttendanceStatus(
                          shift,
                          assignment
                        );

                      return (
                        <div
                          key={`${shift._id}-${assignment._id || index}`}
                          className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                              <p className="text-xs font-extrabold text-slate-800">
                                {roster.name}
                              </p>

                              <p className="text-[10px] text-slate-500 mt-1">
                                {formatLabel(
                                  shift.shiftType
                                )}{' '}
                                • {shift.startTime} –{' '}
                                {shift.endTime}
                              </p>

                              <p className="text-[10px] text-slate-400 mt-1">
                                {shift.location ||
                                  shift.departmentName ||
                                  shift.wardName ||
                                  formatLabel(
                                    shift.areaType
                                  )}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                className={getAttendanceStatusClasses(
                                  status
                                )}
                              >
                                {formatLabel(status)}
                              </StatusBadge>

                              {assignment.signedInAt && (
                                <span className="text-[10px] text-slate-400">
                                  In:{' '}
                                  {formatDateTime(
                                    assignment.signedInAt
                                  )}
                                </span>
                              )}

                              {assignment.signedOutAt && (
                                <span className="text-[10px] text-slate-400">
                                  Out:{' '}
                                  {formatDateTime(
                                    assignment.signedOutAt
                                  )}
                                </span>
                              )}

                              {!assignment.signedInAt &&
                                status !==
                                  'ABSENT' && (
                                  <button
                                    type="button"
                                    disabled={
                                      attendanceSubmitting
                                    }
                                    onClick={() =>
                                      void handleSignIn(
                                        shift,
                                        assignment
                                      )
                                    }
                                    className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <LogIn className="w-3 h-3" />
                                    Sign In
                                  </button>
                                )}

                              {assignment.signedInAt &&
                                !assignment.signedOutAt && (
                                  <button
                                    type="button"
                                    disabled={
                                      attendanceSubmitting
                                    }
                                    onClick={() =>
                                      void handleSignOut(
                                        shift,
                                        assignment
                                      )
                                    }
                                    className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    Sign Out
                                  </button>
                                )}
                            </div>
                          </div>

                          <div className="mt-4">
                            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                              Attendance note
                            </label>

                            <textarea
                              rows={2}
                              value={
                                attendanceNote
                              }
                              onChange={(event) =>
                                setAttendanceNote(
                                  event.target.value
                                )
                              }
                              placeholder="Optional note about anything that happened during the shift..."
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
                            />
                          </div>

                          {assignment.attendanceNotes && (
                            <p className="text-[10px] text-slate-500 mt-2">
                              Previous note:{' '}
                              {
                                assignment.attendanceNotes
                              }
                            </p>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              );
            })()}
          </SectionCard>
        </div>
      )}

      {/* =====================================================================
         CREATE ROSTER MODAL
      ===================================================================== */}

      <Modal
        open={showRosterModal}
        title="Create Staff Roster"
        subtitle="Create a new roster period for a hospital area."
        onClose={() => {
          if (
            !submittingRoster
          ) {
            setShowRosterModal(
              false
            );
          }
        }}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Roster Name *
              </label>

              <input
                value={
                  rosterForm.name
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      name:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="e.g. August Nursing Roster"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Code
              </label>

              <input
                value={
                  rosterForm.code
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      code:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="AUG-2026"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs uppercase focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Area *
              </label>

              <select
                value={
                  rosterForm.areaType
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      areaType:
                        event.target
                          .value as RosterAreaType,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              >
                {AREA_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Start Date *
              </label>

              <input
                type="date"
                value={
                  rosterForm.startDate
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      startDate:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                End Date *
              </label>

              <input
                type="date"
                value={
                  rosterForm.endDate
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      endDate:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Department
              </label>

              <input
                value={
                  rosterForm.departmentName
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      departmentName:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="e.g. Nursing"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ward
              </label>

              <input
                value={
                  rosterForm.wardName
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      wardName:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="e.g. Medical Ward"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Description
              </label>

              <textarea
                rows={3}
                value={
                  rosterForm.description
                }
                onChange={(event) =>
                  setRosterForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Describe the purpose or coverage plan for this roster..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <ModalActions
            onCancel={() =>
              setShowRosterModal(
                false
              )
            }
            onSubmit={
              handleCreateRoster
            }
            submitting={
              submittingRoster
            }
            submitLabel="Create Roster"
          />
        </div>
      </Modal>

      {/* =====================================================================
         CREATE SHIFT MODAL
      ===================================================================== */}

      <Modal
        open={showShiftModal}
        title="Create Shift"
        subtitle="Add a shift to the selected roster."
        onClose={() => {
          if (
            !submittingShift
          ) {
            setShowShiftModal(
              false
            );
          }
        }}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#e8f5f3]/50 border border-[#1b7b68]/10 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#1b7b68]">
              Roster
            </p>

            <p className="text-xs font-bold text-slate-800 mt-1">
              {rosters.find(
                (roster) =>
                  roster._id ===
                  shiftForm.rosterId
              )?.name ||
                selectedRoster?.name ||
                'Select a roster'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date *
              </label>

              <input
                type="date"
                value={
                  shiftForm.date
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      date:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Type *
              </label>

              <select
                value={
                  shiftForm.shiftType
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      shiftType:
                        event.target
                          .value as ShiftType,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              >
                {SHIFT_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Start Time *
              </label>

              <input
                type="time"
                value={
                  shiftForm.startTime
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      startTime:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                End Time *
              </label>

              <input
                type="time"
                value={
                  shiftForm.endTime
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      endTime:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Area
              </label>

              <select
                value={
                  shiftForm.areaType
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      areaType:
                        event.target
                          .value as RosterAreaType,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              >
                {AREA_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Required Staff
              </label>

              <input
                type="number"
                min={0}
                value={
                  shiftForm.requiredStaffCount
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      requiredStaffCount:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Department
              </label>

              <input
                value={
                  shiftForm.departmentName
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      departmentName:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ward
              </label>

              <input
                value={
                  shiftForm.wardName
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      wardName:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Location
              </label>

              <input
                value={
                  shiftForm.location
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      location:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Ward, theatre, room or unit..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notes
              </label>

              <textarea
                rows={3}
                value={
                  shiftForm.notes
                }
                onChange={(event) =>
                  setShiftForm(
                    (current) => ({
                      ...current,
                      notes:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={
                shiftForm.isOpenShift
              }
              onChange={(event) =>
                setShiftForm(
                  (current) => ({
                    ...current,
                    isOpenShift:
                      event.target
                        .checked,
                  })
                )
              }
              className="w-4 h-4 accent-[#1b7b68]"
            />

            <div>
              <p className="text-xs font-bold text-slate-700">
                Open shift
              </p>

              <p className="text-[10px] text-slate-400 mt-0.5">
                Allow this shift to appear in open-shift management.
              </p>
            </div>
          </label>

          <ModalActions
            onCancel={() =>
              setShowShiftModal(
                false
              )
            }
            onSubmit={
              handleCreateShift
            }
            submitting={
              submittingShift
            }
            submitLabel="Create Shift"
          />
        </div>
      </Modal>

      {/* =====================================================================
         STAFF ASSIGNMENT MODAL
      ===================================================================== */}

      <Modal
        open={showStaffModal}
        title="Assign Staff"
        subtitle="Search the hospital staff directory and assign a staff member to this shift."
        onClose={() => {
          if (
            !submittingStaff
          ) {
            setShowStaffModal(
              false
            );
          }
        }}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Staff Member *
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

              <input
                value={
                  staffSearch
                }
                onChange={(event) =>
                  setStaffSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search by name, role or department..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {staffLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1b7b68]" />

                Searching staff...
              </div>
            ) : staffResults.length ===
              0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />

                No staff found.
              </div>
            ) : (
              staffResults.map(
                (staff) => {
                  const id =
                    getId(
                      staff
                    );

                  const selected =
                    staffForm.staffId ===
                    id;

                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() =>
                        setStaffForm(
                          (
                            current
                          ) => ({
                            ...current,
                            staffId:
                              id,
                          })
                        )
                      }
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        selected
                          ? 'border-[#1b7b68] bg-[#e8f5f3]/60'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {getStaffName(
                            staff
                          )}
                        </p>

                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {getStaffRole(
                            staff
                          )}

                          {staff.department ||
                          staff.departmentName
                            ? ` • ${
                                staff.department ||
                                staff.departmentName
                              }`
                            : ''}
                        </p>
                      </div>

                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-[#1b7b68] shrink-0" />
                      )}
                    </button>
                  );
                }
              )
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assignment Role
            </label>

            <input
              value={
                staffForm.role
              }
              onChange={(event) =>
                setStaffForm(
                  (current) => ({
                    ...current,
                    role:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="e.g. Nurse, Radiologist, Pharmacist"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes
            </label>

            <textarea
              rows={3}
              value={
                staffForm.notes
              }
              onChange={(event) =>
                setStaffForm(
                  (current) => ({
                    ...current,
                    notes:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <ModalActions
            onCancel={() =>
              setShowStaffModal(
                false
              )
            }
            onSubmit={
              handleAssignStaff
            }
            submitting={
              submittingStaff
            }
            submitLabel="Assign Staff"
          />
        </div>
      </Modal>

      {/* =====================================================================
         AVAILABILITY MODAL
      ===================================================================== */}

      <Modal
        open={
          showAvailabilityModal
        }
        title="Staff Availability"
        subtitle="Set availability for a staff member on a specific date."
        onClose={() => {
          if (
            !submittingAvailability
          ) {
            setShowAvailabilityModal(
              false
            );
          }
        }}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Staff Member *
            </label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

              <input
                value={
                  staffSearch
                }
                onChange={(event) =>
                  setStaffSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search staff..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {staffLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1b7b68]" />
                Searching staff...
              </div>
            ) : staffResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                No staff found.
              </div>
            ) : (
              staffResults.map((staff) => {
                const id = getId(staff);
                const selected =
                  availabilityForm.staffId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setAvailabilityForm((current) => ({
                        ...current,
                        staffId: id,
                      }))
                    }
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      selected
                        ? 'border-[#1b7b68] bg-[#e8f5f3]/60'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <User className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        {getStaffName(staff)}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {getStaffRole(staff)}
                      </p>
                    </div>

                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-[#1b7b68]" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Date *
              </label>

              <input
                type="date"
                value={
                  availabilityForm.date
                }
                onChange={(event) =>
                  setAvailabilityForm(
                    (current) => ({
                      ...current,
                      date:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status *
              </label>

              <select
                value={
                  availabilityForm.status
                }
                onChange={(event) =>
                  setAvailabilityForm(
                    (current) => ({
                      ...current,
                      status:
                        event.target
                          .value as AvailabilityStatus,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              >
                <option value="AVAILABLE">
                  Available
                </option>

                <option value="PREFERRED">
                  Preferred
                </option>

                <option value="UNAVAILABLE">
                  Unavailable
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Available From
              </label>

              <input
                type="time"
                value={
                  availabilityForm.availableFrom
                }
                onChange={(event) =>
                  setAvailabilityForm(
                    (current) => ({
                      ...current,
                      availableFrom:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Available To
              </label>

              <input
                type="time"
                value={
                  availabilityForm.availableTo
                }
                onChange={(event) =>
                  setAvailabilityForm(
                    (current) => ({
                      ...current,
                      availableTo:
                        event.target
                          .value,
                    })
                  )
                }
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Preferred Shift Types
            </label>

            <div className="flex flex-wrap gap-2">
              {SHIFT_OPTIONS.map(
                (option) => {
                  const checked =
                    availabilityForm.preferredShiftTypes.includes(
                      option.value
                    );

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setAvailabilityForm(
                          (
                            current
                          ) => ({
                            ...current,
                            preferredShiftTypes:
                              checked
                                ? current.preferredShiftTypes.filter(
                                    (
                                      item
                                    ) =>
                                      item !==
                                      option.value
                                  )
                                : [
                                    ...current.preferredShiftTypes,
                                    option.value,
                                  ],
                          })
                        )
                      }
                      className={`px-3 py-2 rounded-xl border text-[10px] font-bold ${
                        checked
                          ? 'border-[#1b7b68] bg-[#e8f5f3] text-[#1b7b68]'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Notes
            </label>

            <textarea
              rows={3}
              value={
                availabilityForm.notes
              }
              onChange={(event) =>
                setAvailabilityForm(
                  (current) => ({
                    ...current,
                    notes:
                      event.target
                        .value,
                  })
                )
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <ModalActions
            onCancel={() =>
              setShowAvailabilityModal(
                false
              )
            }
            onSubmit={
              handleSaveAvailability
            }
            submitting={
              submittingAvailability
            }
            submitLabel="Save Availability"
          />
        </div>
      </Modal>
    </div>
  );
}