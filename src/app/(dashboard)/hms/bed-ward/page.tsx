'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Droplets,
  Hospital,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Stethoscope,
  UserRound,
  Users,
  X,
  Wrench,
  UserSearch,
  SprayCan,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:5000/api/v1';

// REST routes are mounted under /api/v1. Accept either a full API base
// or just the backend origin from the Next.js environment.
const NORMALIZED_API_ORIGIN = RAW_API_URL.replace(/\/$/, '');
const API_BASE_URL = /\/api\/v1$/i.test(NORMALIZED_API_ORIGIN)
  ? NORMALIZED_API_ORIGIN
  : `${NORMALIZED_API_ORIGIN}/api/v1`;

type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'BLOCKED';
type ModalName =
  | 'bed'
  | 'ward'
  | 'match'
  | 'transfer'
  | 'status'
  | 'history'
  | 'wardCleaning'
  | null;

interface Ward {
  _id: string;
  code: string;
  name: string;
  department?: string;
  floor?: string;
  building?: string;
  specialty?: string;
  active?: boolean;
  cleaningStatus?: 'IDLE' | 'IN_PROGRESS';
  cleaningStartedAt?: string;
  cleaningCompletedAt?: string;
}

interface Bed {
  _id: string;
  hospitalId: string;
  wardId: string;
  bedNumber: string;
  bedType: string;
  status: BedStatus;
  version: number;
  patientId?: string;
  admissionId?: string;
  currentAssignmentId?: string;
  capabilities?: Record<string, boolean>;
  supportedAcuityLevels?: number[];
  genderRestriction?: string;
  notes?: string;
  blockedReason?: string;
  lastOccupiedAt?: string;
  lastReleasedAt?: string;
  cleaningStartedAt?: string;
  cleaningCompletedAt?: string;
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
  universalPatientId?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface WardDashboardItem {
  wardId: string;
  code: string;
  name: string;
  department?: string;
  totalBeds: number;
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  occupancyRate: number;
  projectedOccupied24h?: number;
  projectedAvailable24h?: number;
  cleaningStatus?: 'IDLE' | 'IN_PROGRESS';
  cleaningStartedAt?: string;
  cleaningCompletedAt?: string;
}

interface Dashboard {
  hospitalId: string;
  totalBeds: number;
  occupied: number;
  available: number;
  cleaning: number;
  blocked: number;
  occupancyRate: number;
  wards: WardDashboardItem[];
  generatedAt: string;
}

interface TransferRequest {
  _id: string;
  patientId: string;
  fromWardId?: string;
  fromBedId?: string;
  toWardId?: string;
  toBedId?: string;
  requirements: Requirements;
  source: string;
  status: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

interface Forecast {
  _id: string;
  wardId: string;
  forecastDate: string;
  horizonDays: number;
  projectedOccupied: number;
  projectedAvailable: number;
  projectedOccupancyRate: number;
  expectedAdmissions: number;
  expectedDischarges: number;
  confidence: number;
  methodology: string;
  generatedAt: string;
}

interface MatchSuggestion {
  bed: Bed;
  ward: Ward;
  score: number;
  reasons: string[];
  warnings: string[];
}

interface Requirements {
  acuityLevel?: number;
  department?: string;
  bedType?: string;
  isolation?: boolean;
  negativePressure?: boolean;
  oxygen?: boolean;
  cardiacMonitor?: boolean;
  pediatric?: boolean;
  bariatric?: boolean;
  mentalHealthSafeSpace?: boolean;
  gender?: string;
}

interface HistoryEvent {
  _id: string;
  fromStatus?: BedStatus;
  toStatus: BedStatus;
  eventType: string;
  actorId?: string;
  reason?: string;
  patientId?: string;
  occurredAt: string;
  version: number;
}

interface ApiError {
  message?: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const inputClass =
  'mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const textareaClass =
  'mt-2 min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium leading-6 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';
const selectClass =
  'mt-2 h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

const STATUS_META: Record<
  BedStatus,
  { label: string; icon: ComponentType<{ size?: number; className?: string }>; className: string; dot: string }
> = {
  AVAILABLE: {
    label: 'Available',
    icon: CheckCircle2,
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  OCCUPIED: {
    label: 'Occupied',
    icon: UserRound,
    className: 'border-blue-100 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  CLEANING: {
    label: 'Cleaning',
    icon: Droplets,
    className: 'border-amber-100 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  BLOCKED: {
    label: 'Blocked',
    icon: LockKeyhole,
    className: 'border-rose-100 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
};

function asId(value: unknown): string {
  return value ? String(value) : '';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getWardName(wardId: string, wards: Ward[], dashboard: Dashboard | null): string {
  const ward = wards.find((item) => asId(item._id) === asId(wardId));
  if (ward) return ward.name;
  const dashboardWard = dashboard?.wards.find((item) => asId(item.wardId) === asId(wardId));
  return dashboardWard?.name || 'Unknown ward';
}

function getStatusTransitions(status: BedStatus): BedStatus[] {
  if (status === 'AVAILABLE') return ['OCCUPIED', 'BLOCKED'];
  if (status === 'OCCUPIED') return ['CLEANING', 'BLOCKED'];
  if (status === 'CLEANING') return ['AVAILABLE', 'BLOCKED'];
  return ['AVAILABLE'];
}

function Badge({ status }: { status: BedStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{children}</div>;
}

function Modal({
  open,
  title,
  eyebrow,
  description,
  icon: Icon,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  description?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem] ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68]">
              <Icon size={20} />
            </div>
            <div>
              <SectionLabel>{eyebrow}</SectionLabel>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-800">{title}</h2>
              {description && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X size={19} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  helper: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  className?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${className || 'bg-[#1b7b68]/10 text-[#1b7b68]'}`}>
          <Icon size={19} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{helper}</span>
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight text-slate-800">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

export default function BedWardCommandCenterPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [selectedMatchPatient, setSelectedMatchPatient] = useState<Patient | null>(null);
  const [selectedTransferPatient, setSelectedTransferPatient] = useState<Patient | null>(null);
  const [cleaningWardId, setCleaningWardId] = useState('');
  const [modal, setModal] = useState<ModalName>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BedStatus>('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [view, setView] = useState<'wards' | 'beds'>('wards');

  const [bedForm, setBedForm] = useState({
    wardId: '',
    bedNumber: '',
    bedType: 'GENERAL',
    supportedAcuityLevels: [1, 2, 3, 4, 5],
    oxygen: false,
    cardiacMonitor: false,
    isolation: false,
    negativePressure: false,
    pediatric: false,
    bariatric: false,
    notes: '',
  });

  const [wardForm, setWardForm] = useState({
    code: '',
    name: '',
    department: '',
    floor: '',
    building: '',
    specialty: '',
    notes: '',
  });

  const [matchForm, setMatchForm] = useState<Requirements & { patientId: string; source: string; admissionId: string }>({
    patientId: '',
    admissionId: '',
    source: 'EMERGENCY',
    acuityLevel: 3,
    department: '',
    bedType: '',
    isolation: false,
    negativePressure: false,
    oxygen: false,
    cardiacMonitor: false,
    pediatric: false,
    bariatric: false,
    mentalHealthSafeSpace: false,
    gender: '',
  });

  const [transferForm, setTransferForm] = useState({
    patientId: '',
    fromWardId: '',
    fromBedId: '',
    source: 'INTERNAL_TRANSFER',
    acuityLevel: 3,
    department: '',
    bedType: '',
    reason: '',
    notes: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: 'BLOCKED' as BedStatus,
    reason: '',
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);

  const api = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as ApiResult<T> & ApiError;
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || payload.error || `Request failed (${response.status})`);
    }
    return payload as T;
  }, []);

  const loadCore = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const [dashboardResponse, wardsResponse, bedsResponse, transfersResponse, forecastsResponse] =
          await Promise.all([
            api<{ dashboard: Dashboard }>('/bed-ward/dashboard'),
            api<{ wards: Ward[] }>('/bed-ward/wards'),
            api<{ beds: Bed[] }>('/bed-ward/beds?page=1&limit=100'),
            api<{ requests: TransferRequest[] }>('/bed-ward/transfers'),
            api<{ forecasts: Forecast[] }>('/bed-ward/forecasts?horizonDays=7'),
          ]);
        setDashboard(dashboardResponse.dashboard);
        setWards(wardsResponse.wards || []);
        setBeds(bedsResponse.beds || []);
        setTransfers(transfersResponse.requests || []);
        setForecasts(forecastsResponse.forecasts || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load bed command center.';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api],
  );

  const applySnapshot = useCallback(
    (snapshot: { dashboard?: Dashboard; beds?: Bed[] }) => {
      if (snapshot.dashboard) setDashboard(snapshot.dashboard);
      if (Array.isArray(snapshot.beds)) setBeds(snapshot.beds);
      setError(null);
      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // WebSocket is mounted at the server root, not under /api/v1.
    const wsOrigin = NORMALIZED_API_ORIGIN.replace(/\/api\/v1$/i, '').replace(/^http/, 'ws');
    const wsUrl = `${wsOrigin}/ws/bed-ward?token=${encodeURIComponent(token)}`;
    intentionalCloseRef.current = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (intentionalCloseRef.current) return;

      const current = socketRef.current;
      if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        clearReconnect();
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'bed-ward.snapshot' && message?.data) {
            applySnapshot(message.data);
          } else if (message?.type === 'housekeeping.task') {
            setToast('Housekeeping workflow updated.');
          }
        } catch (err) {
          console.error('[BedWard WebSocket] Invalid message:', err);
        }
      };

      socket.onerror = () => setConnected(false);

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        setConnected(false);
        if (!intentionalCloseRef.current) {
          clearReconnect();
          reconnectTimerRef.current = window.setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      intentionalCloseRef.current = true;
      clearReconnect();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) socket.close();
      setConnected(false);
    };
  }, [applySnapshot]);

  // WebSocket is primary. Slow polling is only a degraded-mode fallback.
  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => void loadCore(true), 120000);
    return () => window.clearInterval(timer);
  }, [connected, loadCore]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!cleaningWardId) return;
    const ward = (dashboard?.wards || []).find((item) => asId(item.wardId) === asId(cleaningWardId));
    if (!ward) return;
  }, [cleaningWardId, dashboard]);

  const patientSearchTerm = modal === 'match' ? matchForm.patientId : modal === 'transfer' ? transferForm.patientId : '';

  useEffect(() => {
    const term = patientSearchTerm.trim();
    if (!term) { setPatientResults([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setPatientSearching(true);
      try {
        const response = await api<{ patients: Patient[] }>(`/patients?search=${encodeURIComponent(term)}&page=1&limit=8`);
        if (!cancelled) setPatientResults(response.patients || []);
      } catch {
        if (!cancelled) setPatientResults([]);
      } finally {
        if (!cancelled) setPatientSearching(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [api, patientSearchTerm, modal]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          [...wards.map((ward) => ward.department), ...(dashboard?.wards || []).map((ward) => ward.department)]
            .filter(Boolean)
            .map(String),
        ),
      ).sort(),
    [wards, dashboard],
  );

  const filteredBeds = useMemo(() => {
    const term = search.trim().toLowerCase();
    return beds.filter((bed) => {
      const ward = wards.find((item) => asId(item._id) === asId(bed.wardId));
      const department = ward?.department || dashboard?.wards.find((item) => asId(item.wardId) === asId(bed.wardId))?.department;
      const matchesSearch =
        !term ||
        bed.bedNumber.toLowerCase().includes(term) ||
        bed.bedType.toLowerCase().includes(term) ||
        asId(bed.patientId).toLowerCase().includes(term);
      return (
        matchesSearch &&
        (statusFilter === 'ALL' || bed.status === statusFilter) &&
        (wardFilter === 'ALL' || asId(bed.wardId) === wardFilter) &&
        (departmentFilter === 'ALL' || department === departmentFilter)
      );
    });
  }, [beds, wards, dashboard, search, statusFilter, wardFilter, departmentFilter]);

  const groupedBeds = useMemo(() => {
    const map = new Map<string, Bed[]>();
    filteredBeds.forEach((bed) => {
      const key = asId(bed.wardId);
      map.set(key, [...(map.get(key) || []), bed]);
    });
    return Array.from(map.entries()).map(([wardId, items]) => ({
      wardId,
      ward: wards.find((ward) => asId(ward._id) === wardId),
      items,
    }));
  }, [filteredBeds, wards]);

  const forecastByWard = useMemo(() => {
    const map = new Map<string, Forecast[]>();
    forecasts.forEach((forecast) => map.set(asId(forecast.wardId), [...(map.get(asId(forecast.wardId)) || []), forecast]));
    return map;
  }, [forecasts]);

  const runAction = useCallback(
    async (request: () => Promise<void>, successMessage: string) => {
      setWorking(true);
      try {
        await request();
        setToast(successMessage);
        setModal(null);
        await loadCore(true);
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Action failed.');
      } finally {
        setWorking(false);
      }
    },
    [loadCore],
  );

  const openHistory = async (bed: Bed) => {
    setSelectedBed(bed);
    setModal('history');
    try {
      const response = await api<{ events: HistoryEvent[] }>(`/bed-ward/beds/${bed._id}/history?limit=100`);
      setHistory(response.events || []);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Unable to load bed history.');
    }
  };

  const completeCleaning = async (bed: Bed) => {
    await runAction(
      async () => {
        await api(`/bed-ward/beds/${bed._id}/cleaning/complete`, {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: bed.version }),
        });
      },
      `${bed.bedNumber} is available again.`,
    );
  };

  const generateForecast = async () => {
    await runAction(
      async () => {
        await api('/bed-ward/forecasts/generate', {
          method: 'POST',
          body: JSON.stringify({ horizonDays: 7 }),
        });
      },
      'Occupancy forecast regenerated.',
    );
  };

  const totalOccupied = dashboard?.occupied || 0;
  const totalBeds = dashboard?.totalBeds || 0;
  const criticalWards = (dashboard?.wards || []).filter((ward) => ward.occupancyRate >= 0.9).length;
  const pendingTransfers = transfers.filter((item) =>
    ['REQUESTED', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS'].includes(item.status),
  ).length;
  const wardsBeingCleaned = (dashboard?.wards || []).filter(
    (ward) => ward.cleaningStatus === 'IN_PROGRESS',
  );
  const cleaningCount = (dashboard?.cleaning || 0) + wardsBeingCleaned.length;

  return (
    <div className="min-h-full space-y-6 font-sans text-slate-800 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-sm"><BedDouble size={20} /></div><div><h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Smart Bed & Ward Management</h1><p className="mt-0.5 text-xs text-slate-400">Real-time bed occupancy, ward capacity, intelligent matching, transfers and housekeeping</p></div></div></div>
        <div className="flex flex-wrap items-center gap-2"><div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${connected ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />{connected ? 'Live board' : 'Polling / degraded'}</div><button onClick={() => void loadCore(true)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh</button><button onClick={() => { setBedForm((current) => ({ ...current, wardId: wards[0]?._id || '' })); setModal('bed'); }} className="inline-flex items-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-95"><BedDouble size={16} /> Add Bed</button><button onClick={() => setModal('ward')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300"><Building2 size={16} /> Add Ward</button></div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[['Total Beds', dashboard?.totalBeds ?? '—', BedDouble, 'text-[#1b7b68]'],['Occupied', dashboard?.occupied ?? '—', Users, 'text-blue-600'],['Available', dashboard?.available ?? '—', CheckCircle2, 'text-emerald-600'],['Cleaning', dashboard ? cleaningCount : '—', Droplets, 'text-amber-600'],['Critical Wards', criticalWards, AlertTriangle, 'text-orange-600'],['Active Transfers', pendingTransfers, ArrowRightLeft, 'text-violet-600']].map(([label,value,Icon,color]) => { const IconComponent = Icon as ComponentType<{size?:number;className?:string}>; return <div key={String(label)} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-400">{String(label)}</span><IconComponent size={17} className={String(color)} /></div><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-800">{String(value)}</p></div>; })}</div>

      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search bed, ward, department or patient..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition focus:border-[#1b7b68] focus:bg-white" /></div><div className="flex items-center gap-2"><select value={departmentFilter} onChange={(e)=>setDepartmentFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none"><option value="ALL">All departments</option>{departments.map((department)=><option key={department} value={department}>{department}</option>)}</select><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as 'ALL'|BedStatus)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none"><option value="ALL">All statuses</option>{Object.keys(STATUS_META).map((status)=><option key={status} value={status}>{statusLabel(status)}</option>)}</select>{wardFilter!=='ALL'&&<button onClick={()=>setWardFilter('ALL')} className="rounded-2xl bg-[#1b7b68]/5 px-3 py-2.5 text-xs font-extrabold text-[#1b7b68]">Clear ward</button>}</div></div></div>

      {error && <div className="flex items-center gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>void loadCore()} className="ml-auto font-bold underline">Retry</button></div>}

      {loading ? <div className="flex min-h-105 items-center justify-center rounded-3xl border border-slate-100 bg-white"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#1b7b68]" size={28}/><p className="mt-3 text-xs font-semibold text-slate-400">Loading bed & ward command center...</p></div></div> : <div className="grid gap-4 xl:grid-cols-3">
        <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2"><div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Ward & Bed Board</h2><p className="mt-0.5 text-[10px] text-slate-400">Live occupancy, availability, cleaning and blocked capacity</p></div><div className="flex rounded-2xl bg-slate-50 p-1"><button onClick={()=>setView('wards')} className={`rounded-xl px-3 py-2 text-[10px] font-extrabold ${view==='wards'?'bg-white text-[#1b7b68] shadow-sm':'text-slate-400'}`}>Ward Overview</button><button onClick={()=>setView('beds')} className={`rounded-xl px-3 py-2 text-[10px] font-extrabold ${view==='beds'?'bg-white text-[#1b7b68] shadow-sm':'text-slate-400'}`}>Bed Board</button></div></div>
          {view==='wards' ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{(dashboard?.wards||[]).map((ward)=>{const forecast=forecastByWard.get(asId(ward.wardId))?.[0];const utilization=Math.min(100,Math.round(ward.occupancyRate*100));return <button key={ward.wardId} onClick={()=>{setWardFilter(asId(ward.wardId));setView('beds');}} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-2"><Building2 size={14} className="text-[#1b7b68]"/><span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">{ward.code}</span></div><p className="mt-1 truncate text-[12px] font-extrabold text-slate-800">{ward.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{ward.department||'General ward'}</p>{ward.cleaningStatus==='IN_PROGRESS'&&<span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[8px] font-extrabold text-amber-700"><SprayCan size={10}/> Ward cleaning in progress</span>}</div><span className={`rounded-lg px-2 py-1 text-[9px] font-extrabold ${utilization>=90?'bg-rose-50 text-rose-700':utilization>=75?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>{utilization}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#1b7b68]" style={{width:`${utilization}%`}}/></div><div className="mt-3 grid grid-cols-4 gap-2"><div><p className="text-sm font-extrabold text-slate-800">{ward.occupied}</p><p className="text-[9px] font-semibold text-slate-400">Occupied</p></div><div><p className="text-sm font-extrabold text-emerald-700">{ward.available}</p><p className="text-[9px] font-semibold text-slate-400">Available</p></div><div><p className="text-sm font-extrabold text-amber-700">{ward.cleaning}</p><p className="text-[9px] font-semibold text-slate-400">Cleaning</p></div><div><p className="text-sm font-extrabold text-rose-700">{ward.blocked}</p><p className="text-[9px] font-semibold text-slate-400">Blocked</p></div></div>{forecast&&<div className="mt-3 flex items-center justify-between rounded-xl bg-white px-2.5 py-2 text-[9px] font-bold text-slate-500"><span className="inline-flex items-center gap-1"><Sparkles size={11} className="text-[#1b7b68]"/>24h outlook</span><span>{forecast.projectedOccupied} occupied · {forecast.projectedAvailable} free</span></div>}</button>;})}{!dashboard?.wards?.length&&<div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-10 text-center"><Building2 size={22} className="mx-auto text-slate-300"/><p className="mt-2 text-xs font-bold text-slate-500">No wards configured yet.</p></div>}</div> : <div className="mt-4 space-y-4">{groupedBeds.map(({wardId,ward,items})=><div key={wardId}><div className="mb-2 flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-wider text-[#1b7b68]">{ward?.code||'WARD'}</p><h3 className="text-[12px] font-extrabold text-slate-800">{ward?.name||getWardName(wardId,wards,dashboard)}</h3></div><span className="text-[9px] font-bold text-slate-400">{items.length} bed{items.length===1?'':'s'}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{items.map((bed)=><button key={bed._id} onClick={()=>setSelectedBed(bed)} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md"><div className="flex items-start justify-between gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-500"><BedDouble size={15}/></div><span className={`h-2 w-2 rounded-full ${STATUS_META[bed.status].dot}`}/></div><p className="mt-2 text-xs font-extrabold text-slate-800">{bed.bedNumber}</p><p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">{bed.bedType}</p><div className="mt-2"><Badge status={bed.status}/></div>{bed.patientId&&<p className="mt-2 truncate text-[9px] font-semibold text-slate-500">Patient {bed.patientId}</p>}</button>)}</div></div>)}{!groupedBeds.length&&<div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center"><BedDouble size={22} className="mx-auto text-slate-300"/><p className="mt-2 text-xs font-bold text-slate-500">No beds match the current filters.</p></div>}</div>}
        </section>
        <aside className="space-y-4"><section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Intelligent Allocation</h2><p className="mt-0.5 text-[10px] text-slate-400">Match beds to patient needs</p></div><Sparkles size={18} className="text-[#1b7b68]"/></div><p className="mt-3 text-[10px] leading-5 text-slate-500">Rank available beds by acuity, department, bed type, isolation and equipment requirements.</p><button onClick={()=>setModal('match')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-extrabold text-white"><Sparkles size={14}/> Run Bed Matching</button></section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[12px] font-extrabold text-slate-800">Cleaning Queue</h2>
              <p className="mt-0.5 text-[10px] text-slate-400">Beds and wards awaiting housekeeping</p>
            </div>
            <Droplets size={18} className="text-amber-600"/>
          </div>
          <div className="mt-4 space-y-2">
            {wardsBeingCleaned.map((ward) => (
              <div key={`ward-cleaning-${ward.wardId}`} className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <SprayCan size={13} className="shrink-0 text-amber-700"/>
                      <p className="truncate text-[11px] font-extrabold text-slate-700">{ward.name}</p>
                    </div>
                    <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                      {ward.code} · Whole ward cleaning in progress
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCleaningWardId(asId(ward.wardId));
                    }}
                    className="shrink-0 rounded-xl bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-amber-700 shadow-sm"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
            {beds.filter((bed) => bed.status === 'CLEANING').slice(0, 5).map((bed) => (
              <div key={bed._id} className="flex items-center justify-between rounded-2xl bg-amber-50 p-3">
                <div>
                  <p className="text-[11px] font-extrabold text-slate-700">{bed.bedNumber}</p>
                  <p className="text-[9px] font-semibold text-slate-400">{getWardName(bed.wardId, wards, dashboard)}</p>
                </div>
                <button
                  onClick={() => void completeCleaning(bed)}
                  disabled={working}
                  className="rounded-xl bg-white px-2.5 py-1.5 text-[9px] font-extrabold text-amber-700 shadow-sm disabled:opacity-50"
                >
                  Mark Clean
                </button>
              </div>
            ))}
            {wardsBeingCleaned.length === 0 && !beds.some((bed) => bed.status === 'CLEANING') && (
              <p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-400">
                No beds or wards waiting for cleaning.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Occupancy Forecast</h2><p className="mt-0.5 text-[10px] text-slate-400">Near-term capacity outlook</p></div><button onClick={()=>void generateForecast()} disabled={working} className="rounded-xl p-2 text-[#1b7b68] hover:bg-[#1b7b68]/5"><RefreshCw size={16} className={working?'animate-spin':''}/></button></div><div className="mt-4 space-y-2">{forecasts.slice(0,4).map((forecast)=><div key={forecast._id} className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="truncate text-[10px] font-extrabold text-slate-700">{getWardName(forecast.wardId,wards,dashboard)}</span><span className="text-[10px] font-extrabold text-[#1b7b68]">{formatPercent(forecast.projectedOccupancyRate)}</span></div><div className="mt-1 flex justify-between text-[9px] font-semibold text-slate-400"><span>{formatDate(forecast.forecastDate)}</span><span>{forecast.projectedAvailable} available</span></div></div>)}{!forecasts.length&&<p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-400">No forecast generated yet.</p>}</div><button onClick={()=>void generateForecast()} disabled={working} className="mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50">Generate 7-day forecast</button></section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Ward Housekeeping</h2><p className="mt-0.5 text-[10px] text-slate-400">Start or complete whole-ward cleaning</p></div><SprayCan size={17} className="text-[#1b7b68]" /></div><div className="mt-4 space-y-3"><select value={cleaningWardId} onChange={(e)=>setCleaningWardId(e.target.value)} className={selectClass}><option value="">Select ward</option>{(dashboard?.wards||[]).map((ward)=><option key={ward.wardId} value={ward.wardId}>{ward.code} · {ward.name}</option>)}</select>{cleaningWardId && (()=>{const ward =
                (dashboard?.wards || []).find((item) => asId(item.wardId) === asId(cleaningWardId)); const inProgress=ward?.cleaningStatus==='IN_PROGRESS'; return <><div className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-extrabold text-slate-700">{ward?.name}</span><span className={`rounded-full px-2 py-1 text-[9px] font-extrabold ${inProgress?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>{inProgress?'Cleaning in progress':'Ready'}</span></div>{inProgress && <p className="mt-1 text-[9px] font-semibold text-slate-400">The ward is marked as being cleaned and should not be used for new placement until completed.</p>}</div><button onClick={()=>void runAction(async()=>{await api(`/bed-ward/wards/${cleaningWardId}/cleaning/${inProgress?'complete':'start'}`,{method:'POST',body:JSON.stringify({notes:inProgress?'Ward cleaning completed from command center.':'Ward cleaning started from command center.'})});}, inProgress ? `${ward?.name||'Ward'} cleaning completed.` : `${ward?.name||'Ward'} is now being cleaned.`)} disabled={working} className={`w-full rounded-2xl py-2.5 text-[10px] font-extrabold ${inProgress?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{inProgress?'Mark Ward Cleaning Complete':'Start Ward Cleaning'}</button></>})()}</div></section>

<section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Transfer Queue</h2><p className="mt-0.5 text-[10px] text-slate-400">Active patient movement requests</p></div><button onClick={()=>setModal('transfer')} className="rounded-xl p-2 text-[#1b7b68] hover:bg-[#1b7b68]/5"><ArrowRightLeft size={17}/></button></div><div className="mt-4 space-y-2">{transfers.slice(0,4).map((transfer)=><div key={transfer._id} className="rounded-2xl border border-slate-100 p-3"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-extrabold text-slate-700">Patient {transfer.patientId}</span><span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-extrabold text-violet-700">{statusLabel(transfer.status)}</span></div><p className="mt-1 truncate text-[9px] font-semibold text-slate-400">{transfer.reason||'Transfer request'}</p></div>)}{!transfers.length&&<p className="rounded-2xl bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-400">No active transfer requests.</p>}</div><button onClick={()=>setModal('transfer')} className="mt-3 w-full rounded-2xl bg-[#1b7b68]/5 py-2.5 text-[10px] font-extrabold text-[#1b7b68]">Create transfer request</button></section></aside>
      </div>}

      <div className="grid gap-4 xl:grid-cols-3"><section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-2"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Ward Capacity Snapshot</h2><p className="mt-0.5 text-[10px] text-slate-400">Current capacity and 24-hour projection</p></div><Building2 size={18} className="text-[#1b7b68]"/></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{(dashboard?.wards||[]).slice(0,8).map((ward)=>{const utilization=Math.min(100,Math.round(ward.occupancyRate*100));return <button key={ward.wardId} onClick={()=>{setWardFilter(asId(ward.wardId));setView('beds');}} className="rounded-2xl bg-slate-50 p-3 text-left hover:bg-white hover:shadow-sm"><div className="flex items-center justify-between"><span className="truncate text-[9px] font-extrabold text-slate-700">{ward.code}</span><span className="text-[9px] font-extrabold text-[#1b7b68]">{utilization}%</span></div><p className="mt-1 truncate text-[9px] text-slate-400">{ward.name}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#1b7b68]" style={{width:`${utilization}%`}}/></div></button>;})}</div></section><section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-[12px] font-extrabold text-slate-800">Operational Notes</h2><p className="mt-0.5 text-[10px] text-slate-400">Live board safeguards</p></div><Activity size={18} className="text-[#1b7b68]"/></div><div className="mt-4 space-y-3 text-[10px] leading-5 text-slate-500"><p className="rounded-2xl bg-slate-50 p-3">{connected?'Live WebSocket updates are active; HTTP polling is suspended.':'Live channel unavailable; slow degraded-mode refresh is active.'}</p><p className="rounded-2xl bg-slate-50 p-3">Bed state changes use optimistic locking and the backend finite-state machine.</p><p className="rounded-2xl bg-slate-50 p-3">Discharge and transfer workflows trigger cleaning before a bed returns to available capacity.</p></div></section></div>

      {selectedBed && (
        <div className="fixed inset-0 z-[60] bg-slate-950/25 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && setSelectedBed(null)}>
          <div className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <SectionLabel>Bed Detail</SectionLabel>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-800">{selectedBed.bedNumber}</h2>
                  <Badge status={selectedBed.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{getWardName(selectedBed.wardId, wards, dashboard)} · {selectedBed.bedType}</p>
              </div>
              <button onClick={() => setSelectedBed(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X size={19} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3"><SectionLabel>Version</SectionLabel><div className="mt-1 text-sm font-black text-slate-700">{selectedBed.version}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><SectionLabel>Patient</SectionLabel><div className="mt-1 truncate text-sm font-black text-slate-700">{selectedBed.patientId || 'Unassigned'}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><SectionLabel>Admission</SectionLabel><div className="mt-1 truncate text-sm font-black text-slate-700">{selectedBed.admissionId || '—'}</div></div>
                <div className="rounded-2xl bg-slate-50 p-3"><SectionLabel>Gender</SectionLabel><div className="mt-1 text-sm font-black text-slate-700">{selectedBed.genderRestriction || 'Any'}</div></div>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-100 p-4">
                <SectionLabel>Capabilities</SectionLabel>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(selectedBed.capabilities || {}).filter(([, enabled]) => enabled).map(([key]) => (
                    <span key={key} className="rounded-full bg-[#1b7b68]/5 px-2.5 py-1.5 text-[10px] font-extrabold text-[#1b7b68]">{statusLabel(key)}</span>
                  ))}
                  {!Object.values(selectedBed.capabilities || {}).some(Boolean) && <span className="text-xs font-semibold text-slate-400">No special capabilities configured.</span>}
                </div>
              </div>

              <div className="mt-5">
                <SectionLabel>Available Actions</SectionLabel>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedBed.status === 'CLEANING' && (
                    <button onClick={() => void completeCleaning(selectedBed)} disabled={working} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-extrabold text-white disabled:opacity-50"><CheckCircle2 size={15} /> Cleaning Complete</button>
                  )}
                  <button onClick={() => { setStatusForm({ status: getStatusTransitions(selectedBed.status)[0] || 'BLOCKED', reason: '' }); setModal('status'); }} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><Settings2 size={15} /> Change Status</button>
                  <button onClick={() => void openHistory(selectedBed)} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-xs font-extrabold text-slate-700 hover:bg-slate-50"><Clock3 size={15} /> Status History</button>
                  {selectedBed.status === 'OCCUPIED' && (
                    <button onClick={() => void runAction(async () => {
                      await api(`/bed-ward/beds/${selectedBed._id}/assignment/release`, { method: 'POST', body: JSON.stringify({ reason: 'Bed released from command center.' }) });
                      setSelectedBed(null);
                    }, `${selectedBed.bedNumber} released and cleaning workflow initiated.`)} disabled={working} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-50 py-3 text-xs font-extrabold text-amber-700 disabled:opacity-50"><Droplets size={15} /> Release to Cleaning</button>
                  )}
                </div>
              </div>

              {selectedBed.status === 'BLOCKED' && selectedBed.blockedReason && (
                <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <SectionLabel>Blocked Reason</SectionLabel>
                  <p className="mt-1 text-xs font-semibold leading-5 text-rose-700">{selectedBed.blockedReason}</p>
                </div>
              )}

              <div className="mt-5 rounded-3xl border border-slate-100 p-4">
                <div className="flex items-center gap-2"><Wrench size={15} className="text-[#1b7b68]" /><SectionLabel>Turnaround</SectionLabel></div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div><span className="font-semibold text-slate-400">Cleaning started</span><div className="mt-1 font-black text-slate-700">{formatDateTime(selectedBed.cleaningStartedAt)}</div></div>
                  <div><span className="font-semibold text-slate-400">Cleaning completed</span><div className="mt-1 font-black text-slate-700">{formatDateTime(selectedBed.cleaningCompletedAt)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={modal === 'ward'} onClose={() => setModal(null)} title="Create Ward" eyebrow="Ward Configuration" description="Add a clinical ward to the live hospital capacity model." icon={Building2}>
        <form onSubmit={(event) => {
          event.preventDefault();
          void runAction(async () => {
            await api('/bed-ward/wards', { method: 'POST', body: JSON.stringify(wardForm) });
          }, `${wardForm.name || 'Ward'} created.`);
        }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Ward Code<input required value={wardForm.code} onChange={(e) => setWardForm({ ...wardForm, code: e.target.value })} className={inputClass} placeholder="MW-01" /></label>
            <label className="text-xs font-bold text-slate-600">Ward Name<input required value={wardForm.name} onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })} className={inputClass} placeholder="Medical Ward" /></label>
            <label className="text-xs font-bold text-slate-600">Department<input value={wardForm.department} onChange={(e) => setWardForm({ ...wardForm, department: e.target.value })} className={inputClass} placeholder="Internal Medicine" /></label>
            <label className="text-xs font-bold text-slate-600">Specialty<input value={wardForm.specialty} onChange={(e) => setWardForm({ ...wardForm, specialty: e.target.value })} className={inputClass} placeholder="General Medicine" /></label>
            <label className="text-xs font-bold text-slate-600">Floor<input value={wardForm.floor} onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })} className={inputClass} placeholder="2" /></label>
            <label className="text-xs font-bold text-slate-600">Building<input value={wardForm.building} onChange={(e) => setWardForm({ ...wardForm, building: e.target.value })} className={inputClass} placeholder="Main Block" /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Notes<textarea value={wardForm.notes} onChange={(e) => setWardForm({ ...wardForm, notes: e.target.value })} className={textareaClass} /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancel</button>
            <button disabled={working} className="rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{working ? 'Creating…' : 'Create Ward'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === 'bed'} onClose={() => setModal(null)} title="Add Bed" eyebrow="Bed Configuration" description="Create a bed with the capabilities used by the matching engine." icon={BedDouble}>
        <form onSubmit={(event) => {
          event.preventDefault();
          void runAction(async () => {
            const capabilities = {
              oxygen: bedForm.oxygen,
              cardiacMonitor: bedForm.cardiacMonitor,
              isolation: bedForm.isolation,
              negativePressure: bedForm.negativePressure,
              pediatric: bedForm.pediatric,
              bariatric: bedForm.bariatric,
            };
            await api('/bed-ward/beds', { method: 'POST', body: JSON.stringify({ ...bedForm, capabilities }) });
          }, `${bedForm.bedNumber || 'Bed'} created.`);
        }} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Ward
              <select required value={bedForm.wardId} onChange={(e) => setBedForm({ ...bedForm, wardId: e.target.value })} className={selectClass}>
                <option value="">Select ward</option>{wards.map((ward) => <option key={ward._id} value={ward._id}>{ward.code} · {ward.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Bed Number<input required value={bedForm.bedNumber} onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })} className={inputClass} placeholder="A-101" /></label>
            <label className="text-xs font-bold text-slate-600">Bed Type<input required value={bedForm.bedType} onChange={(e) => setBedForm({ ...bedForm, bedType: e.target.value })} className={inputClass} placeholder="GENERAL / ICU / HDU" /></label>
          </div>
          <div>
            <SectionLabel>Supported Acuity</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((level) => {
                const active = bedForm.supportedAcuityLevels.includes(level);
                return <button type="button" key={level} onClick={() => setBedForm({ ...bedForm, supportedAcuityLevels: active ? bedForm.supportedAcuityLevels.filter((item) => item !== level) : [...bedForm.supportedAcuityLevels, level].sort() })} className={`h-9 w-9 rounded-xl text-xs font-black ${active ? 'bg-[#1b7b68] text-white' : 'bg-slate-50 text-slate-400'}`}>{level}</button>;
              })}
            </div>
          </div>
          <div>
            <SectionLabel>Capabilities</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['oxygen', 'Oxygen'], ['cardiacMonitor', 'Cardiac Monitor'], ['isolation', 'Isolation'],
                ['negativePressure', 'Negative Pressure'], ['pediatric', 'Pediatric'], ['bariatric', 'Bariatric'],
              ].map(([key, label]) => {
                const checked = Boolean(bedForm[key as keyof typeof bedForm]);
                return <label key={key} className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={checked} onChange={(e) => setBedForm({ ...bedForm, [key]: e.target.checked })} className="accent-[#1b7b68]" />{label}</label>;
              })}
            </div>
          </div>
          <label className="block text-xs font-bold text-slate-600">Notes<textarea value={bedForm.notes} onChange={(e) => setBedForm({ ...bedForm, notes: e.target.value })} className={textareaClass} /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancel</button><button disabled={working} className="rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{working ? 'Creating…' : 'Create Bed'}</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'match'} onClose={() => setModal(null)} title="Smart Bed Matching" eyebrow="Allocation Engine" description="Submit an admission requirement set and receive ranked bed recommendations from the live availability pool." icon={Sparkles} wide>
        <form onSubmit={async (event) => {
          event.preventDefault();
          setWorking(true);
          try {
            const response = await api<{ suggestions: MatchSuggestion[] }>('/bed-ward/matching/suggestions', { method: 'POST', body: JSON.stringify({ ...matchForm, requirements: { ...matchForm } }) });
            setSuggestions(response.suggestions || []);
            setToast(`${response.suggestions?.length || 0} bed option(s) found. Best-fit options are ranked first.`);
          } catch (err) {
            setToast(err instanceof Error ? err.message : 'Matching failed.');
          } finally { setWorking(false); }
        }} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="relative text-xs font-bold text-slate-600">Patient
              <div className="relative"><UserSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={selectedMatchPatient ? `${selectedMatchPatient.firstName} ${selectedMatchPatient.lastName}` : matchForm.patientId} onChange={(e) => { setSelectedMatchPatient(null); setMatchForm({ ...matchForm, patientId: e.target.value }); }} className={`${inputClass} pl-9`} placeholder="Search name, MRN or phone" /></div>
              {(patientSearching || (!selectedMatchPatient && patientResults.length > 0)) && <div className="absolute z-30 mt-1 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">{patientSearching && <div className="px-3 py-2 text-[10px] font-semibold text-slate-400">Searching patients…</div>}{!patientSearching && patientResults.map((patient) => <button type="button" key={patient._id} onClick={() => { setSelectedMatchPatient(patient); setMatchForm({ ...matchForm, patientId: patient._id }); setPatientResults([]); }} className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50"><div className="text-xs font-extrabold text-slate-700">{patient.firstName} {patient.lastName}</div><div className="text-[9px] font-semibold text-slate-400">{patient.mrn || patient.universalPatientId || 'No MRN'} · {patient.phone || 'No phone'}</div></button>)}</div>}
            </label>
            <label className="text-xs font-bold text-slate-600">Admission ID<input value={matchForm.admissionId} onChange={(e) => setMatchForm({ ...matchForm, admissionId: e.target.value })} className={inputClass} placeholder="Optional" /></label>
            <label className="text-xs font-bold text-slate-600">Source<select value={matchForm.source} onChange={(e) => setMatchForm({ ...matchForm, source: e.target.value })} className={selectClass}><option>EMERGENCY</option><option>THEATRE</option><option>ICU</option><option>DIRECT_REFERRAL</option><option>INTERNAL_TRANSFER</option></select></label>
            <label className="text-xs font-bold text-slate-600">Acuity<select value={matchForm.acuityLevel} onChange={(e) => setMatchForm({ ...matchForm, acuityLevel: Number(e.target.value) })} className={selectClass}><option value={1}>1 · Critical</option><option value={2}>2 · High</option><option value={3}>3 · Moderate</option><option value={4}>4 · Low</option><option value={5}>5 · Minimal</option></select></label>
            <label className="text-xs font-bold text-slate-600">Department<input value={matchForm.department} onChange={(e) => setMatchForm({ ...matchForm, department: e.target.value })} className={inputClass} placeholder="Medical" /></label>
            <label className="text-xs font-bold text-slate-600">Bed Type<input value={matchForm.bedType} onChange={(e) => setMatchForm({ ...matchForm, bedType: e.target.value })} className={inputClass} placeholder="ICU / GENERAL" /></label>
          </div>
          <div><SectionLabel>Special Requirements</SectionLabel><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['isolation', 'Isolation'], ['negativePressure', 'Negative Pressure'], ['oxygen', 'Oxygen'],
              ['cardiacMonitor', 'Cardiac Monitor'], ['pediatric', 'Pediatric'], ['bariatric', 'Bariatric'], ['mentalHealthSafeSpace', 'Mental Health'],
            ].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-600"><input type="checkbox" checked={Boolean(matchForm[key as keyof typeof matchForm])} onChange={(e) => setMatchForm({ ...matchForm, [key]: e.target.checked })} className="accent-[#1b7b68]" />{label}</label>)}
          </div></div>
          <button disabled={working} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] text-xs font-extrabold text-white disabled:opacity-50"><Sparkles size={15} />{working ? 'Matching…' : 'Find Suitable Beds'}</button>

          {suggestions.length > 0 && <div className="space-y-2">
            <SectionLabel>Ranked Suggestions</SectionLabel>
            {suggestions.map((suggestion, index) => <div key={suggestion.bed._id} className="rounded-3xl border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1b7b68] text-[10px] font-black text-white">{index + 1}</span><span className="text-sm font-black text-slate-800">{suggestion.bed.bedNumber}</span><Badge status={suggestion.bed.status} /></div><div className="mt-1 text-[10px] font-semibold text-slate-400">{suggestion.ward.name} · {suggestion.bed.bedType}</div></div><div className="text-right"><div className="text-lg font-black text-[#1b7b68]">{suggestion.score}</div><div className="text-[9px] font-bold uppercase text-slate-400">Score</div></div></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{suggestion.reasons.map((reason) => <span key={reason} className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">{reason}</span>)}{suggestion.warnings.map((warning) => <span key={warning} className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">{warning}</span>)}</div>
              <button type="button" onClick={() => void runAction(async () => {
                await api('/bed-ward/assignments', { method: 'POST', body: JSON.stringify({ bedId: suggestion.bed._id, patientId: matchForm.patientId || undefined, admissionId: matchForm.admissionId || undefined, source: matchForm.source, requirements: matchForm }) });
              }, `${suggestion.bed.bedNumber} assignment confirmed.`)} disabled={working || suggestion.bed.status !== 'AVAILABLE'} className="mt-3 w-full rounded-2xl bg-slate-900 py-2.5 text-[10px] font-extrabold text-white disabled:opacity-40">Confirm Assignment</button>
            </div>)}
          </div>}
        </form>
      </Modal>

      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="Create Transfer Request" eyebrow="Patient Flow" description="Request a destination bed using the same matching engine and transfer workflow." icon={ArrowRightLeft}>
        <form onSubmit={(event) => {
          event.preventDefault();
          void runAction(async () => {
            await api('/bed-ward/transfers', { method: 'POST', body: JSON.stringify({ ...transferForm, requirements: { acuityLevel: transferForm.acuityLevel, department: transferForm.department, bedType: transferForm.bedType } }) });
          }, 'Transfer request created.');
        }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="relative text-xs font-bold text-slate-600">Patient
              <div className="relative"><UserSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required value={selectedTransferPatient ? `${selectedTransferPatient.firstName} ${selectedTransferPatient.lastName}` : transferForm.patientId} onChange={(e) => { setSelectedTransferPatient(null); setTransferForm({ ...transferForm, patientId: e.target.value }); }} className={`${inputClass} pl-9`} placeholder="Search name, MRN or phone" /></div>
              {(modal === 'transfer' && (patientSearching || (!selectedTransferPatient && patientResults.length > 0))) && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">{patientSearching && <div className="px-3 py-2 text-[10px] font-semibold text-slate-400">Searching patients…</div>}{!patientSearching && patientResults.map((patient) => <button type="button" key={patient._id} onClick={() => { setSelectedTransferPatient(patient); setTransferForm({ ...transferForm, patientId: patient._id }); setPatientResults([]); }} className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-slate-50"><div className="text-xs font-extrabold text-slate-700">{patient.firstName} {patient.lastName}</div><div className="text-[9px] font-semibold text-slate-400">{patient.mrn || patient.universalPatientId || 'No MRN'} · {patient.phone || 'No phone'}</div></button>)}</div>}
            </label>
            <label className="text-xs font-bold text-slate-600">Source<select value={transferForm.source} onChange={(e) => setTransferForm({ ...transferForm, source: e.target.value })} className={selectClass}><option>INTERNAL_TRANSFER</option><option>EMERGENCY</option><option>THEATRE</option><option>ICU</option><option>DIRECT_REFERRAL</option></select></label>
            <label className="text-xs font-bold text-slate-600">From Ward<select value={transferForm.fromWardId} onChange={(e) => setTransferForm({ ...transferForm, fromWardId: e.target.value })} className={selectClass}><option value="">Select</option>{wards.map((ward) => <option key={ward._id} value={ward._id}>{ward.code} · {ward.name}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">From Bed<select value={transferForm.fromBedId} onChange={(e) => setTransferForm({ ...transferForm, fromBedId: e.target.value })} className={selectClass}><option value="">Select</option>{beds.filter((bed) => !transferForm.fromWardId || asId(bed.wardId) === transferForm.fromWardId).map((bed) => <option key={bed._id} value={bed._id}>{bed.bedNumber}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Acuity<select value={transferForm.acuityLevel} onChange={(e) => setTransferForm({ ...transferForm, acuityLevel: Number(e.target.value) })} className={selectClass}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">Destination Department<input value={transferForm.department} onChange={(e) => setTransferForm({ ...transferForm, department: e.target.value })} className={inputClass} /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Bed Type<input value={transferForm.bedType} onChange={(e) => setTransferForm({ ...transferForm, bedType: e.target.value })} className={inputClass} placeholder="Optional" /></label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Reason<textarea value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} className={textareaClass} /></label>
          <label className="block text-xs font-bold text-slate-600">Notes<textarea value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} className={textareaClass} /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancel</button><button disabled={working} className="rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{working ? 'Submitting…' : 'Create Request'}</button></div>
        </form>
      </Modal>

      <Modal open={modal === 'status' && !!selectedBed} onClose={() => setModal(null)} title="Change Bed Status" eyebrow="State Machine" description="Only transitions permitted by the backend state machine are available." icon={Settings2}>
        {selectedBed && <form onSubmit={(event) => {
          event.preventDefault();
          void runAction(async () => {
            await api(`/bed-ward/beds/${selectedBed._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: statusForm.status, reason: statusForm.reason, expectedVersion: selectedBed.version, patientId: selectedBed.patientId }) });
            setSelectedBed(null);
          }, `${selectedBed.bedNumber} moved to ${statusLabel(statusForm.status)}.`);
        }} className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4"><SectionLabel>Current</SectionLabel><div className="mt-2 flex items-center gap-2"><span className="text-sm font-black text-slate-700">{selectedBed.bedNumber}</span><Badge status={selectedBed.status} /></div><p className="mt-2 text-[10px] font-semibold text-slate-400">Version {selectedBed.version} · optimistic locking enabled</p></div>
          <label className="block text-xs font-bold text-slate-600">Next State<div className="relative"><select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as BedStatus })} className={selectClass}>{getStatusTransitions(selectedBed.status).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-6 text-slate-400" /></div></label>
          <label className="block text-xs font-bold text-slate-600">Reason<textarea value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} className={textareaClass} placeholder="Reason for this state change..." /></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600">Cancel</button><button disabled={working} className="rounded-2xl bg-[#1b7b68] px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{working ? 'Updating…' : 'Apply Transition'}</button></div>
        </form>}
      </Modal>

      <Modal open={modal === 'history'} onClose={() => setModal(null)} title={`${selectedBed?.bedNumber || 'Bed'} History`} eyebrow="Audit Trail" description="Immutable status events recorded by the bed state machine." icon={Clock3}>
        <div className="space-y-3">
          {history.map((event) => (
            <div key={event._id} className="relative rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#1b7b68]" /><span className="text-xs font-black text-slate-700">{event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ''}{statusLabel(event.toStatus)}</span></div>
                <span className="text-[10px] font-bold text-slate-400">{formatDateTime(event.occurredAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400"><span>{statusLabel(event.eventType)}</span><span>v{event.version}</span>{event.actorId && <span>Actor {event.actorId}</span>}</div>
              {event.reason && <p className="mt-2 text-xs leading-5 text-slate-500">{event.reason}</p>}
            </div>
          ))}
          {!history.length && <div className="py-12 text-center text-xs font-semibold text-slate-400">No status events found.</div>}
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[90] flex max-w-sm items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 size={16} className="mt-0.5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {loading && (
        <div className="fixed bottom-5 left-5 z-[80] inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-500 shadow-xl ring-1 ring-slate-100">
          <Loader2 size={15} className="animate-spin text-[#1b7b68]" /> Loading capacity…
        </div>
      )}
    </div>
  );
}
