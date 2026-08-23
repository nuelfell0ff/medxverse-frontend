'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  FlaskConical,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  TestTube2,
  User,
  XCircle,
} from 'lucide-react';

/* =========================================================
   CONFIG
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://medxverse-backend.onrender.com';

const LAB_API = `${API_URL}/api/v1/lab`;

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

  if (typeof person === 'string') return person;

  if (person.name) return person.name;

  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();

  return fullName || person.email || person.mrn || '—';
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'VERIFIED':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'RESULTS_RECORDED':
      return 'bg-purple-50 text-purple-700 border-purple-200';

    case 'IN_PROGRESS':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';

    case 'SAMPLE_COLLECTED':
    case 'SPECIMEN_RECEIVED':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';

    case 'SAMPLE_REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'bg-red-50 text-red-700 border-red-200';

    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600 border-slate-200';

    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
};

const getPriorityStyle = (priority: string) => {
  switch (priority) {
    case 'STAT':
      return 'bg-red-600 text-white';

    case 'URGENT':
      return 'bg-orange-500 text-white';

    default:
      return 'bg-slate-100 text-slate-700';
  }
};

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

  const [activeTab, setActiveTab] = useState<
    'overview' | 'results' | 'workflow'
  >('overview');

  const [showResultForm, setShowResultForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRepeatForm, setShowRepeatForm] = useState(false);

  const [newResults, setNewResults] = useState<LabResult[]>([
    {
      parameterName: '',
      value: '',
      unit: '',
      referenceRange: '',
      flag: 'NORMAL',
      entryMethod: 'MANUAL',
    },
  ]);

  const [rejectReason, setRejectReason] = useState('');
  const [rejectQuality, setRejectQuality] = useState('UNSATISFACTORY');
  const [requestRecollection, setRequestRecollection] = useState(true);

  const [repeatReason, setRepeatReason] = useState('');
  const [repeatParameters, setRepeatParameters] = useState('');

  /* =========================================================
     API HELPER
  ========================================================= */

  const getToken = () => {
    if (typeof window === 'undefined') return null;

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

      const labOrder =
        data?.data ||
        data?.order ||
        data;

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
    await runAction(`/${orderId}/collect`, 'POST');
  };

  const handleAccession = async () => {
    await runAction(`/${orderId}/accession`, 'POST', {
      location: 'Central Laboratory',
    });
  };

  const handleRecollect = async () => {
    await runAction(`/${orderId}/recollect`, 'POST');
  };

  const handleVerify = async () => {
    await runAction(`/${orderId}/verify`, 'POST');
  };

  const handleAuthorize = async () => {
    await runAction(`/${orderId}/authorize`, 'POST');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejecting the sample.');
      return;
    }

    const success = await runAction(
      `/${orderId}/reject`,
      'POST',
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
      'POST',
      {
        results: validResults,
        specimenQuality:
          order?.specimenQuality || 'SATISFACTORY',
      }
    );

    if (success) {
      setShowResultForm(false);

      setNewResults([
        {
          parameterName: '',
          value: '',
          unit: '',
          referenceRange: '',
          flag: 'NORMAL',
          entryMethod: 'MANUAL',
        },
      ]);
    }
  };

  const handleRepeatTest = async () => {
    if (!repeatReason.trim()) {
      setError('Please provide a reason for repeating the test.');
      return;
    }

    const success = await runAction(
      `/${orderId}/repeat`,
      'POST',
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

  const patientName = useMemo(() => {
    return getPersonName(order?.patientId);
  }, [order]);

  const workflowSteps = useMemo(() => {
    if (!order) return [];

    return [
      {
        title: 'Order Created',
        description: 'Electronic laboratory requisition created.',
        complete: true,
        active: false,
        icon: FileText,
      },
      {
        title: 'Sample Collection',
        description: order.sampleCollectedAt
          ? `Collected ${formatDate(order.sampleCollectedAt)}`
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
          ? `Accessioned ${formatDate(order.specimenReceivedAt)}`
          : 'Awaiting laboratory accessioning',
        complete: Boolean(order.specimenReceivedAt),
        active: order.status === 'SAMPLE_COLLECTED',
        icon: PackageCheck,
      },
      {
        title: 'Results Recorded',
        description: order.results?.length
          ? `${order.results.length} result(s) recorded`
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
          ? `Completed ${formatDate(order.completedAt)}`
          : 'Awaiting authorization',
        complete: order.status === 'COMPLETED',
        active: order.status === 'VERIFIED',
        icon: CheckCircle2,
      },
    ];
  }, [order]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#2e7fc1]" />

            <p className="text-sm font-medium text-slate-500">
              Loading laboratory workflow...
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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>

          <h2 className="text-xl font-bold text-[#08345a]">
            Unable to Load Laboratory Order
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || 'The requested laboratory order could not be found.'}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push('/hms/lab')}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Laboratory
            </button>

            <button
              onClick={() => fetchOrder()}
              className="rounded-xl bg-[#08345a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062946]"
            >
              Try Again
            </button>
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
      {/* HEADER */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push('/hms/lab')}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#08345a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Laboratory
          </button>

          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#08345a] text-white shadow-sm">
                <FlaskConical className="h-7 w-7" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-[#08345a]">
                    {order.testName}
                  </h1>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {formatStatus(order.status)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityStyle(
                      order.priority
                    )}`}
                  >
                    {order.priority}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="font-mono font-medium text-slate-700">
                    {order.accessionNumber}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {patientName}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Beaker className="h-4 w-4" />
                    {formatStatus(order.testCategory)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fetchOrder(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
              />

              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ALERTS */}

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

              <div>
                <p className="text-sm font-semibold text-red-800">
                  Action could not be completed
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              onClick={() => setError('')}
              className="text-red-400 transition hover:text-red-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* AI / CRITICAL ALERTS */}

        {(order.criticalResultNotified ||
          order.duplicateTestDetected ||
          order.aiPatternAlerts?.length) && (
          <div className="mb-6 space-y-3">
            {order.duplicateTestDetected && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />

                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      Duplicate Test Alert
                    </p>

                    <p className="mt-1 text-sm text-amber-700">
                      {order.duplicateTestMessage ||
                        'A similar laboratory test may already be active for this patient.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.aiPatternAlerts?.map((alert, index) => (
              <div
                key={`${alert}-${index}`}
                className="rounded-2xl border border-red-100 bg-red-50 p-4"
              >
                <div className="flex gap-3">
                  <Activity className="h-5 w-5 shrink-0 text-red-500" />

                  <p className="text-sm font-medium text-red-700">
                    {alert}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QUICK ACTIONS */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="font-bold text-[#08345a]">
                Laboratory Workflow Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Continue this specimen through the laboratory workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                'PENDING',
                'SAMPLE_SCHEDULED',
              ].includes(order.status) && (
                <button
                  onClick={handleCollectSample}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062946] disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="h-4 w-4" />
                  )}

                  Collect Sample
                </button>
              )}

              {order.status === 'SAMPLE_COLLECTED' && (
                <>
                  <button
                    onClick={handleAccession}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2e7fc1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#246ca6] disabled:opacity-60"
                  >
                    <PackageCheck className="h-4 w-4" />
                    Accession Specimen
                  </button>

                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Sample
                  </button>
                </>
              )}

              {order.status === 'RECOLLECTION_REQUIRED' && (
                <button
                  onClick={handleRecollect}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Recollect Sample
                </button>
              )}

              {[
                'SPECIMEN_RECEIVED',
                'IN_PROGRESS',
              ].includes(order.status) && (
                <>
                  <button
                    onClick={() => setShowResultForm(!showResultForm)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#062946]"
                  >
                    <FileText className="h-4 w-4" />
                    Record Results
                  </button>

                  <button
                    onClick={() => setShowRepeatForm(!showRepeatForm)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Repeat Test
                  </button>
                </>
              )}

              {order.status === 'RESULTS_RECORDED' && (
                <button
                  onClick={handleVerify}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2e7fc1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#246ca6]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verify Results
                </button>
              )}

              {order.status === 'VERIFIED' && (
                <button
                  onClick={handleAuthorize}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Authorize & Release
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RESULT FORM */}

        {showResultForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-[#08345a]">
                Record Laboratory Results
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the measured values for this laboratory test.
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {newResults.map((result, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-5"
                  >
                    <input
                      value={result.parameterName}
                      onChange={(event) => {
                        const updated = [...newResults];

                        updated[index].parameterName =
                          event.target.value;

                        setNewResults(updated);
                      }}
                      placeholder="Parameter"
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                      value={result.value}
                      onChange={(event) => {
                        const updated = [...newResults];

                        updated[index].value =
                          event.target.value;

                        setNewResults(updated);
                      }}
                      placeholder="Value"
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                      value={result.unit || ''}
                      onChange={(event) => {
                        const updated = [...newResults];

                        updated[index].unit =
                          event.target.value;

                        setNewResults(updated);
                      }}
                      placeholder="Unit"
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                      value={result.referenceRange || ''}
                      onChange={(event) => {
                        const updated = [...newResults];

                        updated[index].referenceRange =
                          event.target.value;

                        setNewResults(updated);
                      }}
                      placeholder="Reference range"
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="flex gap-2">
                      <select
                        value={result.flag || 'NORMAL'}
                        onChange={(event) => {
                          const updated = [...newResults];

                          updated[index].flag =
                            event.target.value;

                          setNewResults(updated);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="ABNORMAL">Abnormal</option>
                        <option value="HIGH">High</option>
                        <option value="LOW">Low</option>
                        <option value="CRITICAL">Critical</option>
                      </select>

                      {newResults.length > 1 && (
                        <button
                          onClick={() => {
                            setNewResults(
                              newResults.filter(
                                (_, itemIndex) =>
                                  itemIndex !== index
                              )
                            );
                          }}
                          className="rounded-lg border border-red-100 px-3 text-red-500 transition hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setNewResults([
                    ...newResults,
                    {
                      parameterName: '',
                      value: '',
                      unit: '',
                      referenceRange: '',
                      flag: 'NORMAL',
                      entryMethod: 'MANUAL',
                    },
                  ])
                }
                className="mt-4 text-sm font-semibold text-[#2e7fc1] hover:text-[#08345a]"
              >
                + Add another parameter
              </button>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowResultForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRecordResults}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  <Save className="h-4 w-4" />
                  Save Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECTION FORM */}

        {showRejectForm && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-white shadow-sm">
            <div className="border-b border-red-100 px-6 py-5">
              <h2 className="font-bold text-red-700">
                Reject Specimen
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Record why this specimen cannot be processed.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <textarea
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(event.target.value)
                }
                placeholder="Reason for specimen rejection..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50"
              />

              <select
                value={rejectQuality}
                onChange={(event) =>
                  setRejectQuality(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
              >
                <option value="UNSATISFACTORY">
                  Unsatisfactory
                </option>
                <option value="HEMOLYZED">Hemolyzed</option>
                <option value="CLOTTED">Clotted</option>
                <option value="INSUFFICIENT">Insufficient</option>
                <option value="CONTAMINATED">Contaminated</option>
              </select>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={requestRecollection}
                  onChange={(event) =>
                    setRequestRecollection(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />

                Request recollection of specimen
              </label>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REPEAT TEST FORM */}

        {showRepeatForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-bold text-[#08345a]">
                Repeat Test
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Document the reason for repeating this analysis.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <input
                value={repeatReason}
                onChange={(event) =>
                  setRepeatReason(event.target.value)
                }
                placeholder="Reason for repeat test"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
              />

              <input
                value={repeatParameters}
                onChange={(event) =>
                  setRepeatParameters(event.target.value)
                }
                placeholder="Parameters to repeat (separate with commas)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2e7fc1] focus:ring-2 focus:ring-blue-100"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRepeatForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  onClick={handleRepeatTest}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#08345a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Start Repeat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {/* TABS */}

            <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {[
                {
                  id: 'overview',
                  label: 'Overview',
                },
                {
                  id: 'results',
                  label: 'Results',
                },
                {
                  id: 'workflow',
                  label: 'Workflow History',
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(
                      tab.id as
                        | 'overview'
                        | 'results'
                        | 'workflow'
                    )
                  }
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-[#08345a] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#08345a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-bold text-[#08345a]">
                      Test Information
                    </h2>
                  </div>

                  <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem
                      label="Test Name"
                      value={order.testName}
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-bold text-[#08345a]">
                      Patient & Request Information
                    </h2>
                  </div>

                  <div className="grid gap-6 p-6 sm:grid-cols-2">
                    <InfoItem
                      label="Patient"
                      value={patientName}
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
                      label="Created"
                      value={formatDate(order.createdAt)}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-bold text-[#08345a]">
                      Specimen Routing
                    </h2>
                  </div>

                  <div className="grid gap-6 p-6 sm:grid-cols-2">
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
                  </div>
                </section>

                {order.notes && (
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                      <h2 className="font-bold text-[#08345a]">
                        Notes
                      </h2>
                    </div>

                    <div className="p-6">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {order.notes}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* RESULTS */}

            {activeTab === 'results' && (
              <div className="space-y-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-bold text-[#08345a]">
                        Laboratory Results
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Version {order.version || 1} •{' '}
                        {order.results?.length || 0} parameter(s)
                      </p>
                    </div>

                    {order.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Final Results
                      </span>
                    )}
                  </div>

                  {order.results?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left">
                        <thead className="bg-slate-50">
                          <tr className="text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-6 py-4 font-semibold">
                              Parameter
                            </th>

                            <th className="px-6 py-4 font-semibold">
                              Result
                            </th>

                            <th className="px-6 py-4 font-semibold">
                              Unit
                            </th>

                            <th className="px-6 py-4 font-semibold">
                              Reference Range
                            </th>

                            <th className="px-6 py-4 font-semibold">
                              Flag
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {order.results.map(
                            (result, index) => (
                              <tr key={`${result.parameterName}-${index}`}>
                                <td className="px-6 py-4 text-sm font-semibold text-[#08345a]">
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
                                    flag={result.flag || 'NORMAL'}
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
                      icon={FileText}
                      title="No Results Recorded"
                      description="Laboratory results will appear here once testing has been completed."
                    />
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="font-bold text-[#08345a]">
                      Result Authorization History
                    </h2>
                  </div>

                  {order.authorizationHistory?.length ? (
                    <div className="divide-y divide-slate-100">
                      {order.authorizationHistory.map(
                        (authorization, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between gap-4 px-6 py-5"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#08345a]">
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
                                <p className="mt-2 text-sm text-slate-500">
                                  {authorization.notes}
                                </p>
                              )}
                            </div>

                            <span className="whitespace-nowrap text-xs text-slate-400">
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

            {/* WORKFLOW */}

            {activeTab === 'workflow' && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="font-bold text-[#08345a]">
                    Complete Chain of Custody
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Every important action performed on this specimen.
                  </p>
                </div>

                {order.chainOfCustody?.length ? (
                  <div className="divide-y divide-slate-100">
                    {order.chainOfCustody.map((item, index) => (
                      <div
                        key={`${item.action}-${index}`}
                        className="flex gap-4 px-6 py-5"
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2e7fc1]">
                            <Clock3 className="h-4 w-4" />
                          </div>

                          {index <
                            order.chainOfCustody.length - 1 && (
                            <div className="mt-2 h-full w-px bg-slate-100" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pb-3">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row">
                            <p className="font-semibold text-[#08345a]">
                              {formatStatus(item.action)}
                            </p>

                            <span className="text-xs text-slate-400">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                            {item.performedBy && (
                              <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {getPersonName(
                                  item.performedBy
                                )}
                              </span>
                            )}

                            {item.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {item.location}
                              </span>
                            )}
                          </div>

                          {item.notes && (
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock3}
                    title="No Workflow History"
                    description="Chain of custody events will appear here."
                  />
                )}
              </section>
            )}
          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="space-y-6">
            {/* WORKFLOW PROGRESS */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-6">
                <h2 className="font-bold text-[#08345a]">
                  Workflow Progress
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current laboratory status
                </p>
              </div>

              <div className="space-y-1">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            step.complete
                              ? 'bg-emerald-500 text-white'
                              : step.active
                              ? 'bg-[#2e7fc1] text-white ring-4 ring-blue-50'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.complete ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        {index < workflowSteps.length - 1 && (
                          <div
                            className={`my-1 h-8 w-px ${
                              step.complete
                                ? 'bg-emerald-300'
                                : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pb-5">
                        <p
                          className={`text-sm font-semibold ${
                            step.active || step.complete
                              ? 'text-[#08345a]'
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
            </div>

            {/* SAMPLE TIMELINE */}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-bold text-[#08345a]">
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
            </div>

            {/* QR */}

            {(order.qrCodeUrl || order.barcodeUrl) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <h2 className="font-bold text-[#08345a]">
                  Specimen Identification
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Scan to identify this specimen
                </p>

                <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-3">
                  <img
                    src={
                      order.qrCodeUrl ||
                      order.barcodeUrl ||
                      ''
                    }
                    alt="Laboratory specimen QR code"
                    className="h-full w-full object-contain"
                  />
                </div>

                <p className="mt-3 break-all font-mono text-xs font-semibold text-slate-600">
                  {order.accessionNumber}
                </p>
              </div>
            )}

            {/* REJECTION INFO */}

            {order.rejectionInfo && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />

                  <h2 className="font-bold text-red-800">
                    Specimen Rejected
                  </h2>
                </div>

                <p className="mt-3 text-sm leading-6 text-red-700">
                  {order.rejectionInfo.reason}
                </p>

                <div className="mt-4 border-t border-red-100 pt-4 text-xs text-red-600">
                  Quality:{' '}
                  {formatStatus(
                    order.rejectionInfo.quality
                  )}
                </div>
              </div>
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-700">
        {value}
      </p>
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

      <span className="text-right text-xs font-semibold text-slate-700">
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
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-bold text-[#08345a]">
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
    'bg-slate-100 text-slate-600';

  if (
    normalized === 'CRITICAL' ||
    normalized === 'CRITICALLY_HIGH' ||
    normalized === 'CRITICALLY_LOW'
  ) {
    classes = 'bg-red-50 text-red-700';
  } else if (
    normalized === 'ABNORMAL' ||
    normalized === 'HIGH' ||
    normalized === 'LOW'
  ) {
    classes = 'bg-amber-50 text-amber-700';
  } else if (
    normalized === 'NORMAL'
  ) {
    classes = 'bg-emerald-50 text-emerald-700';
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}
    >
      {formatStatus(flag)}
    </span>
  );
}
