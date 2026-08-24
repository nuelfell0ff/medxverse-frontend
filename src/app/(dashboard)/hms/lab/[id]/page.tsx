'use client';

import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Beaker,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ScanLine,
  ShieldCheck,
  TestTube2,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   CONFIG
========================================================= */

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com'
).replace(/\/+$/, '');

const LAB_API = API_URL.endsWith('/api/v1/lab')
  ? API_URL
  : `${API_URL}/api/v1/lab`;

/* =========================================================
   TYPES
========================================================= */

type LabOrderStatus =
  | 'PENDING'
  | 'SAMPLE_SCHEDULED'
  | 'SAMPLE_COLLECTED'
  | 'SPECIMEN_RECEIVED'
  | 'SAMPLE_REJECTED'
  | 'RECOLLECTION_REQUIRED'
  | 'IN_PROGRESS'
  | 'RESULTS_RECORDED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

type ActiveTab = 'overview' | 'results' | 'workflow';

interface PopulatedPerson {
  _id?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mrn?: string;
  gender?: string;
  dateOfBirth?: string;
}

interface LabResult {
  parameterName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  ageSexSpecificRange?: string;
  flag?: string;
  previousValue?: string;
  deltaPercentage?: number;
  entryMethod?: string;
  analyzerName?: string;
  analyzerResultId?: string;
  isRepeat?: boolean;
  repeatReason?: string;
  dilutionFactor?: number;
}

interface ChainOfCustody {
  timestamp?: string;
  action: string;
  performedBy?: PopulatedPerson | string;
  location?: string;
  notes?: string;
}

interface Authorization {
  level?: string;
  authorizedBy?: PopulatedPerson | string;
  authorizedAt?: string;
  notes?: string;
}

interface RejectionInfo {
  reason?: string;
  quality?: string;
  rejectionDate?: string;
  recollectionRequested?: boolean;
  recollectionScheduledAt?: string;
}

interface SampleRouting {
  department?: string;
  routedAt?: string;
  receivedAt?: string;
  location?: string;
  status?: string;
}

interface LabOrder {
  _id: string;
  accessionNumber: string;

  patientId?: PopulatedPerson;
  doctorId?: PopulatedPerson;
  phlebotomistId?: PopulatedPerson;
  labTechnicianId?: PopulatedPerson;
  verifierId?: PopulatedPerson;

  testName: string;
  testCategory: string;
  panelName?: string;
  sampleType: string;

  priority: string;
  isStat: boolean;
  status: LabOrderStatus;

  barcodeUrl?: string;
  qrCodeUrl?: string;

  sampleCollectionScheduledAt?: string;
  sampleCollectedAt?: string;
  specimenReceivedAt?: string;
  verifiedAt?: string;
  authorizedAt?: string;
  completedAt?: string;

  specimenQuality?: string;

  sampleRouting?: SampleRouting;
  rejectionInfo?: RejectionInfo;

  results: LabResult[];
  chainOfCustody: ChainOfCustody[];
  authorizationHistory: Authorization[];

  version?: number;
  aiPatternAlerts?: string[];

  criticalResultNotified?: boolean;
  duplicateTestDetected?: boolean;
  duplicateTestMessage?: string;

  predictedTatMinutes?: number;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
}

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date?: string) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return parsedDate.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatStatus = (status?: string) => {
  if (!status) return 'Unknown';

  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPersonName = (person?: PopulatedPerson | string) => {
  if (!person) return '—';

  if (typeof person === 'string') {
    return person;
  }

  if (person.name) {
    return person.name;
  }

  const fullName = `${person.firstName || ''} ${
    person.lastName || ''
  }`.trim();

  return fullName || person.email || person.mrn || '—';
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'VERIFIED':
      return 'border-[#1b7b68]/30 bg-[#1b7b68]/10 text-blue-700';

    case 'RESULTS_RECORDED':
      return 'border-purple-200 bg-purple-50 text-purple-700';

    case 'IN_PROGRESS':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';

    case 'SAMPLE_COLLECTED':
    case 'SPECIMEN_RECEIVED':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'CANCELLED':
      return 'border-slate-200 bg-slate-100 text-slate-600';

    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
};

const getPriorityStyle = (priority: string) => {
  const normalized = priority?.toUpperCase();

  if (normalized === 'STAT') {
    return 'bg-red-600 text-white ring-red-100';
  }

  if (normalized === 'URGENT') {
    return 'bg-orange-500 text-white ring-orange-100';
  }

  return 'bg-slate-100 text-slate-700 ring-slate-100';
};

const createEmptyResult = (): LabResult => ({
  parameterName: '',
  value: '',
  unit: '',
  referenceRange: '',
  flag: 'NORMAL',
  entryMethod: 'MANUAL',
});

/* =========================================================
   COMPONENT
========================================================= */

export default function LabOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const rawOrderId = params?.id;

  const orderId = Array.isArray(rawOrderId)
    ? rawOrderId[0]
    : rawOrderId;

  const [order, setOrder] = useState<LabOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState('');

  const [activeTab, setActiveTab] =
    useState<ActiveTab>('overview');

  const [showResultForm, setShowResultForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRepeatForm, setShowRepeatForm] = useState(false);

  const [newResults, setNewResults] = useState<LabResult[]>([
    createEmptyResult(),
  ]);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectQuality, setRejectQuality] =
    useState('HEMOLYZED');
  const [requestRecollection, setRequestRecollection] =
    useState(true);

  const [repeatReason, setRepeatReason] = useState('');
  const [repeatParameters, setRepeatParameters] = useState('');

  /* =========================================================
     API HELPER
  ========================================================= */

  const getToken = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken')
    );
  };

  const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const token = getToken();

    const response = await fetch(`${LAB_API}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          'Something went wrong. Please try again.'
      );
    }

    return data;
  };

  /* =========================================================
     FETCH ORDER
  ========================================================= */

  const fetchOrder = async (showRefresh = false) => {
    try {
      setError('');

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await apiRequest(`/${orderId}`);

      const labOrder = data?.data || data?.order || data;

      setOrder(labOrder);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load laboratory order.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError('No laboratory order ID was provided.');
      return;
    }

    fetchOrder();
  }, [orderId]);

  /* =========================================================
     ACTION HANDLER
  ========================================================= */

  const runAction = async (
    endpoint: string,
    method: 'POST' | 'PATCH' | 'PUT' = 'POST',
    body?: Record<string, unknown>
  ) => {
    try {
      setActionLoading(true);
      setError('');

      const data = await apiRequest(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });

      const updatedOrder =
        data?.data ||
        data?.order ||
        null;

      if (updatedOrder && updatedOrder._id) {
        setOrder(updatedOrder);
      } else {
        await fetchOrder(true);
      }

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete this action.'
      );

      return false;
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     WORKFLOW ACTIONS
  ========================================================= */

  const handleCollectSample = async () => {
    await runAction(`/${orderId}/collect-sample`, 'PATCH');
  };

  const handleAccession = async () => {
    await runAction(`/${orderId}/accession`, 'PATCH', {
      location: 'Central Laboratory',
    });
  };

  const handleRecollect = async () => {
    await runAction(`/${orderId}/recollect`, 'PATCH');
  };

  const handleVerify = async () => {
    await runAction(`/${orderId}/verify`, 'PATCH');
  };

  const handleAuthorize = async () => {
    await runAction(`/${orderId}/authorize`, 'PATCH');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError(
        'Please provide a reason for rejecting the sample.'
      );
      return;
    }

    const success = await runAction(
      `/${orderId}/reject-sample`,
      'PATCH',
      {
        reason: rejectReason,
        quality: rejectQuality,
        requestRecollection,
      }
    );

    if (success) {
      setShowRejectForm(false);
      setRejectReason('');
    }
  };

  const handleRecordResults = async () => {
    const validResults = newResults.filter(
      (result) =>
        result.parameterName.trim() &&
        result.value.trim()
    );

    if (!validResults.length) {
      setError(
        'Please add at least one complete laboratory result.'
      );
      return;
    }

    const success = await runAction(
      `/${orderId}/results`,
      'PATCH',
      {
        results: validResults,
        specimenQuality:
          order?.specimenQuality || 'SATISFACTORY',
      }
    );

    if (success) {
      setShowResultForm(false);
      setNewResults([createEmptyResult()]);
      setActiveTab('results');
    }
  };

  const handleRepeatTest = async () => {
    if (!repeatReason.trim()) {
      setError(
        'Please provide a reason for repeating the test.'
      );
      return;
    }

    const success = await runAction(
      `/${orderId}/repeat-test`,
      'PATCH',
      {
        reason: repeatReason,
        parameterNames: repeatParameters
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }
    );

    if (success) {
      setShowRepeatForm(false);
      setRepeatReason('');
      setRepeatParameters('');
    }
  };

  /* =========================================================
     COMPUTED DATA
  ========================================================= */

  const patientName = useMemo(
    () => getPersonName(order?.patientId),
    [order]
  );

  const workflowSteps = useMemo(() => {
    if (!order) {
      return [];
    }

    return [
      {
        title: 'Order Created',
        description: 'Laboratory requisition created.',
        complete: true,
        active: false,
        icon: FileText,
      },
      {
        title: 'Sample Collection',
        description: order.sampleCollectedAt
          ? `Collected ${formatDate(
              order.sampleCollectedAt
            )}`
          : 'Awaiting specimen collection',
        complete: Boolean(order.sampleCollectedAt),
        active: [
          'PENDING',
          'SAMPLE_SCHEDULED',
          'RECOLLECTION_REQUIRED',
        ].includes(order.status),
        icon: TestTube2,
      },
      {
        title: 'Specimen Received',
        description: order.specimenReceivedAt
          ? `Received ${formatDate(
              order.specimenReceivedAt
            )}`
          : 'Awaiting laboratory accessioning',
        complete: Boolean(order.specimenReceivedAt),
        active: order.status === 'SAMPLE_COLLECTED',
        icon: PackageCheck,
      },
      {
        title: 'Results Recorded',
        description: order.results?.length
          ? `${order.results.length} parameter(s) recorded`
          : 'Awaiting test results',
        complete: Boolean(order.results?.length),
        active: [
          'SPECIMEN_RECEIVED',
          'IN_PROGRESS',
        ].includes(order.status),
        icon: ClipboardCheck,
      },
      {
        title: 'Results Verified',
        description: order.verifiedAt
          ? `Verified ${formatDate(order.verifiedAt)}`
          : 'Awaiting verification',
        complete: Boolean(order.verifiedAt),
        active: order.status === 'RESULTS_RECORDED',
        icon: ShieldCheck,
      },
      {
        title: 'Results Released',
        description: order.completedAt
          ? `Released ${formatDate(order.completedAt)}`
          : 'Awaiting authorization',
        complete: order.status === 'COMPLETED',
        active: order.status === 'VERIFIED',
        icon: CheckCircle2,
      },
    ];
  }, [order]);

  const progressPercentage = useMemo(() => {
    if (!workflowSteps.length) {
      return 0;
    }

    const completedSteps = workflowSteps.filter(
      (step) => step.complete
    ).length;

    return Math.round(
      (completedSteps / workflowSteps.length) * 100
    );
  }, [workflowSteps]);

  const currentStep = useMemo(() => {
    if (!workflowSteps.length) {
      return null;
    }

    return (
      workflowSteps.find((step) => step.active) ||
      workflowSteps[workflowSteps.length - 1]
    );
  }, [workflowSteps]);

  const tabs = [
    {
      id: 'overview' as ActiveTab,
      label: 'Overview',
      icon: ClipboardList,
    },
    {
      id: 'results' as ActiveTab,
      label: 'Results',
      icon: Beaker,
      count: order?.results?.length || 0,
    },
    {
      id: 'workflow' as ActiveTab,
      label: 'Workflow',
      icon: Clock3,
      count: order?.chainOfCustody?.length || 0,
    },
  ];

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1b7b68] shadow-lg shadow-slate-900/10">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>

            <h2 className="mt-5 font-bold text-slate-900">
              Loading laboratory order
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Retrieving specimen and workflow information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
          <div className="w-full rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg shadow-slate-200/40">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Unable to Load Laboratory Order
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {error ||
                'The requested laboratory order could not be found.'}
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => router.push('/hms/lab')}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Laboratory
              </button>

              <button
                onClick={() => fetchOrder()}
                className="rounded-xl bg-[#1b7b68] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#155f50]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* =====================================================
          TOP HEADER
      ====================================================== */}

      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/hms/lab')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Laboratory Orders
            </button>

            <button
              onClick={() => fetchOrder(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b7b68] to-[#155f50] text-white shadow-lg shadow-slate-900/10 sm:h-16 sm:w-16">
                <FlaskConical className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {order.testName}
                  </h1>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {formatStatus(order.status)}
                  </span>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${getPriorityStyle(
                      order.priority
                    )}`}
                  >
                    {order.priority}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-700">
                    {order.accessionNumber}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-[#1b7b68]" />
                    {patientName}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <Beaker className="h-4 w-4 text-[#1b7b68]" />
                    {formatStatus(order.testCategory)}
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                    <TestTube2 className="h-4 w-4 text-[#1b7b68]" />
                    {order.sampleType}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {order.isStat && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  <Activity className="h-4 w-4" />
                  STAT REQUEST
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Predicted TAT
                </p>

                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {order.predictedTatMinutes
                    ? `${order.predictedTatMinutes} min`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          PAGE CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ===================================================
            ERROR ALERT
        ==================================================== */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>

              <div>
                <p className="text-sm font-bold text-red-800">
                  Action could not be completed
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              onClick={() => setError('')}
              className="rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-600"
              aria-label="Close error"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ===================================================
            CLINICAL ALERTS
        ==================================================== */}

        {(order.criticalResultNotified ||
          order.duplicateTestDetected ||
          Boolean(order.aiPatternAlerts?.length)) && (
          <div className="mb-6 space-y-3">
            {order.criticalResultNotified && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <Activity className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <p className="text-sm font-bold text-red-900">
                    Critical Result Notification
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    A critical laboratory result has been identified
                    and notification has been recorded.
                  </p>
                </div>
              </div>
            )}

            {order.duplicateTestDetected && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>

                <div>
                  <p className="text-sm font-bold text-amber-900">
                    Duplicate Test Alert
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    {order.duplicateTestMessage ||
                      'A similar laboratory test may already be active for this patient.'}
                  </p>
                </div>
              </div>
            )}

            {order.aiPatternAlerts?.map((alert, index) => (
              <div
                key={`${alert}-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>

                <div>
                  <p className="text-sm font-bold text-purple-900">
                    Clinical Pattern Alert
                  </p>

                  <p className="mt-1 text-sm leading-6 text-purple-700">
                    {alert}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===================================================
            WORKFLOW ACTION CENTER
        ==================================================== */}

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68]/10 text-[#1b7b68]">
                {currentStep ? (
                  <currentStep.icon className="h-5 w-5" />
                ) : (
                  <ClipboardCheck className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#1b7b68]">
                  Current workflow stage
                </p>

                <h2 className="mt-1 font-bold text-slate-900">
                  {currentStep?.title || 'Laboratory Workflow'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {currentStep?.description ||
                    'Continue this specimen through the laboratory workflow.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'PENDING',
                'SAMPLE_SCHEDULED',
              ].includes(order.status) && (
                <ActionButton
                  onClick={handleCollectSample}
                  disabled={actionLoading}
                  icon={TestTube2}
                  loading={actionLoading}
                >
                  Collect Sample
                </ActionButton>
              )}

              {order.status === 'SAMPLE_COLLECTED' && (
                <>
                  <ActionButton
                    onClick={handleAccession}
                    disabled={actionLoading}
                    icon={PackageCheck}
                    loading={actionLoading}
                    variant="blue"
                  >
                    Accession Specimen
                  </ActionButton>

                  <ActionButton
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    icon={XCircle}
                    variant="danger-outline"
                  >
                    Reject Sample
                  </ActionButton>
                </>
              )}

              {order.status === 'RECOLLECTION_REQUIRED' && (
                <ActionButton
                  onClick={handleRecollect}
                  disabled={actionLoading}
                  icon={RotateCcw}
                  loading={actionLoading}
                  variant="orange"
                >
                  Recollect Sample
                </ActionButton>
              )}

              {[
                'SPECIMEN_RECEIVED',
                'IN_PROGRESS',
              ].includes(order.status) && (
                <>
                  <ActionButton
                    onClick={() =>
                      setShowResultForm(!showResultForm)
                    }
                    icon={ClipboardCheck}
                  >
                    {showResultForm
                      ? 'Close Result Entry'
                      : 'Record Results'}
                  </ActionButton>

                  <ActionButton
                    onClick={() =>
                      setShowRepeatForm(!showRepeatForm)
                    }
                    icon={RotateCcw}
                    variant="secondary"
                  >
                    Repeat Test
                  </ActionButton>
                </>
              )}

              {order.status === 'RESULTS_RECORDED' && (
                <ActionButton
                  onClick={handleVerify}
                  disabled={actionLoading}
                  icon={ShieldCheck}
                  loading={actionLoading}
                  variant="blue"
                >
                  Verify Results
                </ActionButton>
              )}

              {order.status === 'VERIFIED' && (
                <ActionButton
                  onClick={handleAuthorize}
                  disabled={actionLoading}
                  icon={CheckCircle2}
                  loading={actionLoading}
                  variant="success"
                >
                  Authorize & Release
                </ActionButton>
              )}

              {[
                'COMPLETED',
                'CANCELLED',
                'SAMPLE_REJECTED',
              ].includes(order.status) && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500">
                  <Check className="h-4 w-4" />
                  No workflow actions available
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            RESULT ENTRY FORM
        ==================================================== */}

        {showResultForm && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-blue-100 bg-[#1b7b68]/10/40 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b7b68] text-white">
                  <ClipboardCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Record Laboratory Results
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter measured values and clinical flags.
                  </p>
                </div>
              </div>

              <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">
                {newResults.length} parameter
                {newResults.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-3">
                {newResults.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b7b68] text-xs font-bold text-white">
                        {index + 1}
                      </span>

                      {newResults.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setNewResults(
                              newResults.filter(
                                (_, itemIndex) =>
                                  itemIndex !== index
                              )
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <FormInput
                        label="Parameter"
                        value={result.parameterName}
                        placeholder="e.g. Haemoglobin"
                        onChange={(value) => {
                          const updated = [...newResults];
                          updated[index].parameterName = value;
                          setNewResults(updated);
                        }}
                      />

                      <FormInput
                        label="Result"
                        value={result.value}
                        placeholder="Enter value"
                        onChange={(value) => {
                          const updated = [...newResults];
                          updated[index].value = value;
                          setNewResults(updated);
                        }}
                      />

                      <FormInput
                        label="Unit"
                        value={result.unit || ''}
                        placeholder="e.g. g/dL"
                        onChange={(value) => {
                          const updated = [...newResults];
                          updated[index].unit = value;
                          setNewResults(updated);
                        }}
                      />

                      <FormInput
                        label="Reference Range"
                        value={result.referenceRange || ''}
                        placeholder="e.g. 12 - 16"
                        onChange={(value) => {
                          const updated = [...newResults];
                          updated[index].referenceRange =
                            value;
                          setNewResults(updated);
                        }}
                      />

                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500">
                          Clinical Flag
                        </label>

                        <select
                          value={result.flag || 'NORMAL'}
                          onChange={(event) => {
                            const updated = [...newResults];
                            updated[index].flag =
                              event.target.value;
                            setNewResults(updated);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10"
                        >
                          <option value="NORMAL">
                            Normal
                          </option>
                          <option value="ABNORMAL">
                            Abnormal
                          </option>
                          <option value="DELTA_CHECK_WARNING">
                            Delta Check Warning
                          </option>
                          <option value="CRITICAL">
                            Critical
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setNewResults([
                    ...newResults,
                    createEmptyResult(),
                  ])
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#2e7fc1]/40 bg-[#1b7b68]/10/30 px-4 py-2.5 text-sm font-semibold text-[#1b7b68] transition hover:bg-[#1b7b68]/10"
              >
                <Plus className="h-4 w-4" />
                Add Parameter
              </button>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowResultForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRecordResults}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155f50] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  Save Results
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            REJECTION FORM
        ==================================================== */}

        {showRejectForm && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h2 className="font-bold text-red-800">
                  Reject Specimen
                </h2>

                <p className="mt-1 text-sm text-red-600">
                  Document why this specimen cannot proceed.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Reason for Rejection
                </label>

                <textarea
                  value={rejectReason}
                  onChange={(event) =>
                    setRejectReason(event.target.value)
                  }
                  placeholder="Describe the reason for specimen rejection..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-500">
                  Specimen Quality
                </label>

                <select
                  value={rejectQuality}
                  onChange={(event) =>
                    setRejectQuality(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-300 focus:ring-4 focus:ring-red-50"
                >
                                    <option value="SATISFACTORY">
                    Satisfactory
                  </option>
                  <option value="HEMOLYZED">
                    Hemolyzed
                  </option>
                  <option value="LIPEMIC">
                    Lipemic
                  </option>
                  <option value="CLOTTED">
                    Clotted
                  </option>
                  <option value="INSUFFICIENT_VOLUME">
                    Insufficient Volume
                  </option>
                  <option value="CONTAMINATED">
                    Contaminated
                  </option>
                  <option value="LEAKING">
                    Leaking
                  </option>
                  <option value="IMPROPERLY_LABELED">
                    Improperly Labeled
                  </option>
                  <option value="DELAYED_TRANSPORT">
                    Delayed Transport
                  </option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={requestRecollection}
                  onChange={(event) =>
                    setRequestRecollection(
                      event.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 accent-[#08345a]"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Request specimen recollection
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Create a new recollection workflow for this
                    patient.
                  </p>
                </div>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Confirm Rejection
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            REPEAT FORM
        ==================================================== */}

        {showRepeatForm && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68]/10 text-[#1b7b68]">
                <RotateCcw className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">
                  Repeat Test
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Document why this analysis needs to be
                  repeated.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <FormInput
                label="Reason for Repeat"
                value={repeatReason}
                placeholder="e.g. Analyzer error, quality control issue..."
                onChange={setRepeatReason}
              />

              <FormInput
                label="Parameters to Repeat"
                value={repeatParameters}
                placeholder="Separate multiple parameters with commas"
                onChange={setRepeatParameters}
              />

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowRepeatForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRepeatTest}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155f50] disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}

                  Start Repeat
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            MAIN GRID
        ==================================================== */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <main className="min-w-0">
            {/* =================================================
                TABS
            ================================================= */}

            <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <div className="flex min-w-max gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-[#1b7b68] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />

                      {tab.label}

                      {typeof tab.count === 'number' &&
                        tab.count > 0 && (
                          <span
                            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =================================================
                OVERVIEW TAB
            ================================================= */}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Test Information */}

                <SectionCard
                  icon={FlaskConical}
                  title="Test Information"
                  subtitle="Core details for this laboratory investigation"
                >
                  <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem
                      label="Test Name"
                      value={order.testName}
                      prominent
                    />

                    <InfoItem
                      label="Department"
                      value={formatStatus(order.testCategory)}
                    />

                    <InfoItem
                      label="Sample Type"
                      value={order.sampleType}
                    />

                    <InfoItem
                      label="Panel"
                      value={order.panelName || '—'}
                    />

                    <InfoItem
                      label="Predicted TAT"
                      value={
                        order.predictedTatMinutes
                          ? `${order.predictedTatMinutes} minutes`
                          : '—'
                      }
                    />

                    <InfoItem
                      label="Specimen Quality"
                      value={
                        order.specimenQuality
                          ? formatStatus(
                              order.specimenQuality
                            )
                          : 'Not assessed'
                      }
                    />
                  </div>
                </SectionCard>

                {/* Patient */}

                <SectionCard
                  icon={User}
                  title="Patient & Request"
                  subtitle="Patient identification and requesting clinician"
                >
                  <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
                    <InfoItem
                      label="Patient"
                      value={patientName}
                      prominent
                    />

                    <InfoItem
                      label="MRN"
                      value={order.patientId?.mrn || '—'}
                    />

                    <InfoItem
                      label="Requesting Doctor"
                      value={getPersonName(order.doctorId)}
                    />

                    <InfoItem
                      label="Order Created"
                      value={formatDate(order.createdAt)}
                    />

                    <InfoItem
                      label="Phlebotomist"
                      value={getPersonName(
                        order.phlebotomistId
                      )}
                    />

                    <InfoItem
                      label="Laboratory Technician"
                      value={getPersonName(
                        order.labTechnicianId
                      )}
                    />
                  </div>
                </SectionCard>

                {/* Routing */}

                <SectionCard
                  icon={PackageCheck}
                  title="Specimen Routing"
                  subtitle="Current routing and laboratory location information"
                >
                  <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
                    <InfoItem
                      label="Department"
                      value={
                        order.sampleRouting?.department
                          ? formatStatus(
                              order.sampleRouting.department
                            )
                          : 'Not routed'
                      }
                    />

                    <InfoItem
                      label="Routing Status"
                      value={
                        order.sampleRouting?.status
                          ? formatStatus(
                              order.sampleRouting.status
                            )
                          : 'Pending'
                      }
                    />

                    <InfoItem
                      label="Location"
                      value={
                        order.sampleRouting?.location || '—'
                      }
                    />

                    <InfoItem
                      label="Routed At"
                      value={formatDate(
                        order.sampleRouting?.routedAt
                      )}
                    />

                    <InfoItem
                      label="Received At"
                      value={formatDate(
                        order.sampleRouting?.receivedAt
                      )}
                    />

                    <InfoItem
                      label="Last Updated"
                      value={formatDate(order.updatedAt)}
                    />
                  </div>
                </SectionCard>

                {/* Notes */}

                {order.notes && (
                  <SectionCard
                    icon={FileText}
                    title="Clinical Notes"
                    subtitle="Additional instructions or information"
                  >
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {order.notes}
                      </p>
                    </div>
                  </SectionCard>
                )}
              </div>
            )}

            {/* =================================================
                RESULTS TAB
            ================================================= */}

            {activeTab === 'results' && (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b7b68]/10 text-[#1b7b68]">
                        <Beaker className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Laboratory Results
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Version {order.version || 1} ·{' '}
                          {order.results?.length || 0}{' '}
                          parameter
                          {order.results?.length === 1
                            ? ''
                            : 's'}
                        </p>
                      </div>
                    </div>

                    {order.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:self-auto">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        FINAL RESULTS
                      </span>
                    ) : order.results?.length ? (
                      <span className="inline-flex items-center gap-2 self-start rounded-full border border-blue-100 bg-[#1b7b68]/10 px-3 py-1.5 text-xs font-bold text-blue-700 sm:self-auto">
                        <Clock3 className="h-3.5 w-3.5" />
                        PENDING RELEASE
                      </span>
                    ) : null}
                  </div>

                  {order.results?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left">
                        <thead className="border-b border-slate-100 bg-slate-50">
                          <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-6 py-4">
                              Parameter
                            </th>

                            <th className="px-6 py-4">
                              Result
                            </th>

                            <th className="px-6 py-4">
                              Unit
                            </th>

                            <th className="px-6 py-4">
                              Reference Range
                            </th>

                            <th className="px-6 py-4">
                              Flag
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {order.results.map(
                            (result, index) => (
                              <tr
                                key={`${result.parameterName}-${index}`}
                                className="transition hover:bg-slate-50/70"
                              >
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                  {result.parameterName}
                                </td>

                                <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                  {result.value}
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {result.unit || '—'}
                                </td>

                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {result.ageSexSpecificRange ||
                                    result.referenceRange ||
                                    '—'}
                                </td>

                                <td className="px-6 py-4">
                                  <ResultFlagBadge
                                    flag={
                                      result.flag || 'NORMAL'
                                    }
                                  />
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Beaker}
                      title="No Results Recorded"
                      description="Laboratory results will appear here once testing has been completed."
                    />
                  )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900">
                        Authorization History
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Verification and result authorization
                        records
                      </p>
                    </div>
                  </div>

                  {order.authorizationHistory?.length ? (
                    <div className="divide-y divide-slate-100">
                      {order.authorizationHistory.map(
                        (authorization, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6"
                          >
                            <div className="flex gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {formatStatus(
                                    authorization.level
                                  )}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                  {getPersonName(
                                    authorization.authorizedBy
                                  )}
                                </p>

                                {authorization.notes && (
                                  <p className="mt-2 text-sm leading-6 text-slate-500">
                                    {authorization.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="pl-12 text-xs text-slate-400 sm:pl-0">
                              {formatDate(
                                authorization.authorizedAt
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={ShieldCheck}
                      title="No Authorization History"
                      description="Verification and authorization actions will be recorded here."
                    />
                  )}
                </section>
              </div>
            )}

            {/* =================================================
                WORKFLOW TAB
            ================================================= */}

            {activeTab === 'workflow' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b7b68]/10 text-[#1b7b68]">
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Complete Chain of Custody
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      A chronological record of every important
                      specimen event.
                    </p>
                  </div>
                </div>

                {order.chainOfCustody?.length ? (
                  <div className="divide-y divide-slate-100">
                    {order.chainOfCustody.map(
                      (item, index) => (
                        <div
                          key={`${item.action}-${index}`}
                          className="flex gap-4 px-5 py-5 sm:px-6"
                        >
                          <div className="flex flex-col items-center">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1b7b68]/10 text-[#1b7b68] ring-4 ring-[#1b7b68]/10">
                              <Clock3 className="h-4 w-4" />
                            </div>

                            {index <
                              order.chainOfCustody.length -
                                1 && (
                              <div className="mt-2 min-h-8 flex-1 w-px bg-slate-200" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 pb-2">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                              <p className="font-bold text-slate-900">
                                {formatStatus(item.action)}
                              </p>

                              <span className="text-xs text-slate-400">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                              {item.performedBy && (
                                <span className="inline-flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-slate-400" />
                                  {getPersonName(
                                    item.performedBy
                                  )}
                                </span>
                              )}

                              {item.location && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 text-slate-400" />
                                  {item.location}
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                                <p className="text-sm leading-6 text-slate-600">
                                  {item.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock3}
                    title="No Workflow History"
                    description="Chain of custody events will appear here as the specimen progresses."
                  />
                )}
              </section>
            )}
          </main>

          {/* ===================================================
              SIDEBAR
          =================================================== */}

          <aside className="space-y-6">
            {/* Patient Snapshot */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-slate-900">
                  Patient Snapshot
                </h2>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1b7b68] text-sm font-bold text-white">
                    {patientName !== '—'
                      ? patientName.charAt(0).toUpperCase()
                      : <User className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {patientName}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      MRN:{' '}
                      {order.patientId?.mrn || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                  <SidebarStat
                    label="Sample"
                    value={order.sampleType}
                  />

                  <SidebarStat
                    label="Priority"
                    value={order.priority}
                  />

                  <SidebarStat
                    label="Category"
                    value={formatStatus(order.testCategory)}
                  />

                  <SidebarStat
                    label="Results"
                    value={`${order.results?.length || 0}`}
                  />
                </div>
              </div>
            </section>

            {/* Workflow Progress */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Workflow Progress
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Specimen processing status
                  </p>
                </div>

                <span className="rounded-lg bg-[#1b7b68]/10 px-2.5 py-1 text-xs font-bold text-[#1b7b68]">
                  {progressPercentage}%
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1b7b68] transition-all duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <div className="mt-6 space-y-1">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                            step.complete
                              ? 'bg-emerald-500 text-white'
                              : step.active
                              ? 'bg-[#1b7b68] text-white ring-4 ring-blue-50'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.complete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        {index <
                          workflowSteps.length - 1 && (
                          <div
                            className={`my-1 h-7 w-px ${
                              step.complete
                                ? 'bg-emerald-300'
                                : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="min-w-0 pb-5">
                        <p
                          className={`text-sm font-semibold ${
                            step.active || step.complete
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Timeline */}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <Clock3 className="h-4 w-4 text-[#1b7b68]" />

                <h2 className="font-bold text-slate-900">
                  Sample Timeline
                </h2>
              </div>

              <div className="divide-y divide-slate-100">
                <TimelineItem
                  label="Order Created"
                  value={formatDate(order.createdAt)}
                />

                <TimelineItem
                  label="Collection"
                  value={formatDate(
                    order.sampleCollectedAt
                  )}
                />

                <TimelineItem
                  label="Specimen Received"
                  value={formatDate(
                    order.specimenReceivedAt
                  )}
                />

                <TimelineItem
                  label="Verified"
                  value={formatDate(order.verifiedAt)}
                />

                <TimelineItem
                  label="Released"
                  value={formatDate(order.completedAt)}
                />
              </div>
            </section>

            {/* QR / Barcode */}

            {(order.qrCodeUrl || order.barcodeUrl) && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#1b7b68]">
                    <ScanLine className="h-5 w-5" />
                  </div>
                </div>

                <h2 className="mt-3 font-bold text-slate-900">
                  Specimen Identification
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Scan to identify this specimen
                </p>

                <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                  <img
                    src={
                      order.qrCodeUrl ||
                      order.barcodeUrl ||
                      ''
                    }
                    alt="Laboratory specimen identification code"
                    className="h-full w-full object-contain"
                  />
                </div>

                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-600">
                  {order.accessionNumber}
                </p>
              </section>
            )}

            {/* Rejection Information */}

            {order.rejectionInfo && (
              <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                    <XCircle className="h-4 w-4 text-red-600" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-red-800">
                      Specimen Rejected
                    </h2>

                    <p className="text-xs text-red-600">
                      Processing exception recorded
                    </p>
                  </div>
                </div>

                {order.rejectionInfo.reason && (
                  <div className="mt-4 rounded-xl bg-white/60 p-3">
                    <p className="text-sm leading-6 text-red-700">
                      {order.rejectionInfo.reason}
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2 border-t border-red-100 pt-4 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-red-500">
                      Quality
                    </span>

                    <span className="font-bold text-red-700">
                      {formatStatus(
                        order.rejectionInfo.quality
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-red-500">
                      Recollection
                    </span>

                    <span className="font-bold text-red-700">
                      {order.rejectionInfo
                        .recollectionRequested
                        ? 'Requested'
                        : 'Not requested'}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function ActionButton({
  children,
  icon: Icon,
  onClick,
  disabled,
  loading,
  variant = 'primary',
}: {
  children: React.ReactNode;
  icon: ElementType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?:
    | 'primary'
    | 'blue'
    | 'secondary'
    | 'orange'
    | 'success'
    | 'danger-outline';
}) {
  const styles = {
    primary:
      'bg-[#1b7b68] text-white hover:bg-[#155f50]',
    blue:
      'bg-[#1b7b68] text-white hover:bg-[#155f50]',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    orange:
      'bg-orange-500 text-white hover:bg-orange-600',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700',
    'danger-outline':
      'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}

      {children}
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b7b68]/10 text-[#1b7b68]">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-bold text-slate-900">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words ${
          prominent
            ? 'text-[15px] font-bold text-slate-900'
            : 'text-sm font-semibold text-slate-700'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function SidebarStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-900">
        {value || '—'}
      </p>
    </div>
  );
}

function FormInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10"
      />
    </div>
  );
}

function TimelineItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-[150px] text-right text-xs font-semibold leading-5 text-slate-700">
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function ResultFlagBadge({
  flag,
}: {
  flag: string;
}) {
  const normalized = flag.toUpperCase();

  let classes =
    'border-slate-200 bg-slate-100 text-slate-600';

  if (
    normalized === 'CRITICAL' ||
    normalized === 'CRITICALLY_HIGH' ||
    normalized === 'CRITICALLY_LOW'
  ) {
    classes =
      'border-red-200 bg-red-50 text-red-700';
  } else if (
    normalized === 'ABNORMAL' ||
    normalized === 'HIGH' ||
    normalized === 'LOW'
  ) {
    classes =
      'border-amber-200 bg-amber-50 text-amber-700';
  } else if (normalized === 'NORMAL') {
    classes =
      'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${classes}`}
    >
      {formatStatus(flag)}
    </span>
  );
}