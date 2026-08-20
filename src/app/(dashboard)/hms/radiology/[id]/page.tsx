'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  CalendarDays,
  Clock3,
  User,
  Users,
  Activity,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  ScanLine,
  ClipboardList,
  Radio,
  Brain,
  Pill,
  Baby,
  Gauge,
  Monitor,
  Link2,
  ExternalLink,
  PenLine,
  History,
  Trash2,
  Plus,
  Search,
  X,
  Loader2,
  CircleDot,
  Zap,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

import { RadiologyApiService } from '@/services/radiology.service';

import {
  RadiologyOrder,
  RadiologyStaff,
  RadiologyAssignment,
  RadiologyOrderStatus,
  PriorityLevel,
  AssignmentRole,
  ExaminationQueueStatus,
  ReportStatus,
  CriticalResultStatus,
  PregnancyScreeningStatus,
  ContrastStatus,
  AIStudyPriority,
} from '@/types/radiology';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const formatLabel = (value?: string | null) => {
  if (!value) return 'N/A';

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStaffName = (staff?: RadiologyStaff | string | null): string => {
  if (!staff) return 'Unknown';

  if (typeof staff === 'string') return staff;

  return `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Unknown';
};

const getPatientName = (patient?: RadiologyOrder['patientId']): string => {
  if (!patient) return 'Unknown Patient';

  if (typeof patient === 'string') return patient;

  return (
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
    'Unknown Patient'
  );
};

const getPatientMRN = (patient?: RadiologyOrder['patientId']): string => {
  if (!patient || typeof patient === 'string') return 'N/A';
  return patient.mrn || 'No MRN';
};

const formatDate = (date?: string | null) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (date?: string | null) => {
  if (!date) return 'N/A';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAge = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
};

const getStatusClasses = (status?: RadiologyOrderStatus) => {
  switch (status) {
    case RadiologyOrderStatus.REQUESTED:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case RadiologyOrderStatus.SCHEDULED:
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case RadiologyOrderStatus.PATIENT_ARRIVED:
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case RadiologyOrderStatus.PREPARING:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case RadiologyOrderStatus.READY_FOR_EXAM:
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case RadiologyOrderStatus.IN_PROGRESS:
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case RadiologyOrderStatus.IMAGE_ACQUISITION_COMPLETE:
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case RadiologyOrderStatus.REPORTING:
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case RadiologyOrderStatus.REPORTED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case RadiologyOrderStatus.COMPLETED:
      return 'bg-green-50 text-green-700 border-green-200';
    case RadiologyOrderStatus.CANCELLED:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getPriorityClasses = (priority?: PriorityLevel) => {
  switch (priority) {
    case PriorityLevel.STAT:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case PriorityLevel.URGENT:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case PriorityLevel.ROUTINE:
      return 'bg-slate-50 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
};

const getQueueClasses = (status?: ExaminationQueueStatus) => {
  switch (status) {
    case ExaminationQueueStatus.WAITING:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case ExaminationQueueStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case ExaminationQueueStatus.COMPLETED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case ExaminationQueueStatus.CANCELLED:
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case ExaminationQueueStatus.ON_HOLD:
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

const getReportStatusClasses = (status?: ReportStatus) => {
  switch (status) {
    case ReportStatus.FINAL:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case ReportStatus.AMENDED:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case ReportStatus.DRAFT:
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200';
  }
};

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                               */
/* -------------------------------------------------------------------------- */

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#1b7b68]/10 text-[#1b7b68] flex items-center justify-center">
              {icon}
            </div>
          )}

          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>

            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {action}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
        {label}
      </p>

      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        <span>{value ?? 'N/A'}</span>
      </div>
    </div>
  );
}

function StatusBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white w-full ${width} rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>

            {subtitle && (
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">{children}</div>
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
    <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-100 mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl bg-[#1b7b68] hover:bg-[#156354] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
      >
        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function RadiologyOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const orderId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : '';

  const [order, setOrder] = useState<RadiologyOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'workflow' | 'report' | 'pacs' | 'ai'
  >('overview');

  /* Modals */
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showContrastModal, setShowContrastModal] = useState(false);
  const [showPregnancyModal, setShowPregnancyModal] = useState(false);
  const [showRadiationModal, setShowRadiationModal] = useState(false);
  const [showPacsModal, setShowPacsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /* Forms */
  const [statusForm, setStatusForm] = useState({
    status: RadiologyOrderStatus.REQUESTED,
    notes: '',
  });

  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    estimatedDurationMinutes: '',
    modalityId: '',
    theatreOrRoom: '',
  });

  const [staffForm, setStaffForm] = useState({
    userId: '',
    role: AssignmentRole.RADIOLOGIST,
    notes: '',
  });

  const [queueForm, setQueueForm] = useState({
    queuePosition: '',
    queueStatus: ExaminationQueueStatus.WAITING,
  });

  const [contrastForm, setContrastForm] = useState({
    status: ContrastStatus.NOT_REQUIRED,
    contrastName: '',
    contrastType: '',
    dose: '',
    doseUnit: '',
    route: '',
    reactionObserved: false,
    reactionDescription: '',
    notes: '',
  });

  const [pregnancyForm, setPregnancyForm] = useState({
    status: PregnancyScreeningStatus.NOT_REQUIRED,
    testType: '',
    testResult: '',
    notes: '',
  });

  const [radiationForm, setRadiationForm] = useState({
    dose: '',
    doseUnit: '',
    doseAreaProduct: '',
    doseAreaProductUnit: '',
    ctDoseIndex: '',
    doseLengthProduct: '',
    notes: '',
  });

  const [pacsForm, setPacsForm] = useState({
    studyInstanceUid: '',
    seriesInstanceUid: '',
    accessionNumber: '',
    studyId: '',
    studyDate: '',
    imageCount: '',
    seriesCount: '',
    modality: '',
    dicomViewerUrl: '',
    storageLocation: '',
    storageStatus: 'PENDING',
    sharedLink: '',
    sharedLinkExpiresAt: '',
    exportEnabled: true,
  });

  const [reportForm, setReportForm] = useState({
    findings: '',
    impression: '',
    radiologistNotes: '',
    templateId: '',
    criticalResultStatus: CriticalResultStatus.NOT_APPLICABLE,
    criticalFinding: '',
    notifiedUserId: '',
    notificationMethod: 'IN_APP' as 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP',
    notificationNotes: '',
  });

  const [amendForm, setAmendForm] = useState({
    findings: '',
    impression: '',
    radiologistNotes: '',
    amendmentReason: '',
  });

  const [criticalForm, setCriticalForm] = useState({
    status: CriticalResultStatus.PENDING,
    finding: '',
    notifiedUserId: '',
    notificationMethod: 'IN_APP' as 'PHONE' | 'SMS' | 'EMAIL' | 'IN_APP',
    notificationNotes: '',
  });

  const [aiForm, setAIForm] = useState({
    enabled: true,
    modelName: '',
    modelVersion: '',
    priority: AIStudyPriority.NOT_PROCESSED,
    confidence: '',
    findings: '',
    recommendations: '',
    qualityPassed: true,
    qualityNotes: '',
    measurements: '',
  });

  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Staff Search */
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState<RadiologyStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://medxverse-backend.onrender.com';

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const searchStaff = useCallback(
    async (query = '') => {
      try {
        setStaffLoading(true);
        const params = new URLSearchParams();
        if (query.trim()) params.set('search', query.trim());
        params.set('isActive', 'true');

        const response = await fetch(
          `${API_BASE_URL}/api/v1/staff?${params.toString()}`,
          { headers: getAuthHeaders() }
        );

        if (!response.ok) {
          setStaffResults([]);
          return;
        }

        const json = await response.json();
        const data = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
        setStaffResults(data);
      } catch (err) {
        console.error('Failed to search staff:', err);
        setStaffResults([]);
      } font-medium {
        setStaffLoading(false);
      }
    },
    [API_BASE_URL, getAuthHeaders]
  );

  useEffect(() => {
    if (!showStaffModal) return;
    const timer = setTimeout(() => searchStaff(staffSearch), 300);
    return () => clearTimeout(timer);
  }, [showStaffModal, staffSearch, searchStaff]);

  const loadOrder = useCallback(
    async (isRefresh = false) => {
      if (!orderId) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        const result = await RadiologyApiService.getOrder(orderId);
        setOrder(result);
      } catch (err: any) {
        setError(err?.message || 'Failed to load radiology examination.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!order) return;

    setStatusForm({
      status: order.status,
      notes: '',
    });

    setScheduleForm({
      scheduledDate: order.scheduling?.scheduledDate?.split('T')[0] || '',
      scheduledStartTime: order.scheduling?.scheduledStartTime || '',
      scheduledEndTime: order.scheduling?.scheduledEndTime || '',
      estimatedDurationMinutes:
        order.scheduling?.estimatedDurationMinutes?.toString() || '',
      modalityId: order.scheduling?.modalityId || '',
      theatreOrRoom: order.scheduling?.theatreOrRoom || '',
    });

    setQueueForm({
      queuePosition: order.queuePosition?.toString() || '',
      queueStatus: order.queueStatus || ExaminationQueueStatus.WAITING,
    });

    setContrastForm({
      status: order.contrast?.status || ContrastStatus.NOT_REQUIRED,
      contrastName: order.contrast?.contrastName || '',
      contrastType: order.contrast?.contrastType || '',
      dose: order.contrast?.dose?.toString() || '',
      doseUnit: order.contrast?.doseUnit || '',
      route: order.contrast?.route || '',
      reactionObserved: order.contrast?.reactionObserved || false,
      reactionDescription: order.contrast?.reactionDescription || '',
      notes: order.contrast?.notes || '',
    });

    setPregnancyForm({
      status:
        order.pregnancyScreening?.status ||
        PregnancyScreeningStatus.NOT_REQUIRED,
      testType: order.pregnancyScreening?.testType || '',
      testResult: order.pregnancyScreening?.testResult || '',
      notes: order.pregnancyScreening?.notes || '',
    });

    setRadiationForm({
      dose: order.radiationExposure?.dose?.toString() || '',
      doseUnit: order.radiationExposure?.doseUnit || '',
      doseAreaProduct:
        order.radiationExposure?.doseAreaProduct?.toString() || '',
      doseAreaProductUnit: order.radiationExposure?.doseAreaProductUnit || '',
      ctDoseIndex: order.radiationExposure?.ctDoseIndex?.toString() || '',
      doseLengthProduct:
        order.radiationExposure?.doseLengthProduct?.toString() || '',
      notes: order.radiationExposure?.notes || '',
    });

    setPacsForm({
      studyInstanceUid: order.pacsMetadata?.studyInstanceUid || '',
      seriesInstanceUid: order.pacsMetadata?.seriesInstanceUid || '',
      accessionNumber:
        order.pacsMetadata?.accessionNumber || order.accessionNumber || '',
      studyId: order.pacsMetadata?.studyId || '',
      studyDate: order.pacsMetadata?.studyDate?.split('T')[0] || '',
      imageCount: order.pacsMetadata?.imageCount?.toString() || '',
      seriesCount: order.pacsMetadata?.seriesCount?.toString() || '',
      modality: order.pacsMetadata?.modality || order.modality,
      dicomViewerUrl: order.pacsMetadata?.dicomViewerUrl || '',
      storageLocation: order.pacsMetadata?.storageLocation || '',
      storageStatus: order.pacsMetadata?.storageStatus || 'PENDING',
      sharedLink: order.pacsMetadata?.sharedLink || '',
      sharedLinkExpiresAt: order.pacsMetadata?.sharedLinkExpiresAt || '',
      exportEnabled: order.pacsMetadata?.exportEnabled ?? true,
    });

    setReportForm({
      findings: order.report?.findings || order.findings || '',
      impression: order.report?.impression || order.impression || '',
      radiologistNotes:
        order.report?.radiologistNotes || order.radiologistNotes || '',
      templateId: order.report?.templateId || '',
      criticalResultStatus:
        order.report?.criticalResult?.status ||
        CriticalResultStatus.NOT_APPLICABLE,
      criticalFinding: order.report?.criticalResult?.finding || '',
      notifiedUserId:
        typeof order.report?.criticalResult?.notifiedUserId === 'string'
          ? order.report.criticalResult.notifiedUserId
          : order.report?.criticalResult?.notifiedUserId?._id || '',
      notificationMethod:
        order.report?.criticalResult?.notificationMethod || 'IN_APP',
      notificationNotes: order.report?.criticalResult?.notificationNotes || '',
    });

    setAmendForm({
      findings: order.report?.findings || order.findings || '',
      impression: order.report?.impression || order.impression || '',
      radiologistNotes:
        order.report?.radiologistNotes || order.radiologistNotes || '',
      amendmentReason: '',
    });

    setCriticalForm({
      status:
        order.report?.criticalResult?.status || CriticalResultStatus.PENDING,
      finding: order.report?.criticalResult?.finding || '',
      notifiedUserId:
        typeof order.report?.criticalResult?.notifiedUserId === 'string'
          ? order.report.criticalResult.notifiedUserId
          : order.report?.criticalResult?.notifiedUserId?._id || '',
      notificationMethod:
        order.report?.criticalResult?.notificationMethod || 'IN_APP',
      notificationNotes: order.report?.criticalResult?.notificationNotes || '',
    });

    setAIForm({
      enabled: order.aiAnalysis?.enabled ?? true,
      modelName: order.aiAnalysis?.modelName || '',
      modelVersion: order.aiAnalysis?.modelVersion || '',
      priority: order.aiAnalysis?.priority || AIStudyPriority.NOT_PROCESSED,
      confidence: order.aiAnalysis?.confidence?.toString() || '',
      findings: order.aiAnalysis?.findings?.join('\n') || '',
      recommendations: order.aiAnalysis?.recommendations?.join('\n') || '',
      qualityPassed: order.aiAnalysis?.qualityPassed ?? true,
      qualityNotes: order.aiAnalysis?.qualityNotes || '',
      measurements: order.aiAnalysis?.measurements
        ? Object.entries(order.aiAnalysis.measurements)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')
        : '',
    });
  }, [order]);

  const runAction = async (
    action: () => Promise<RadiologyOrder>,
    message: string
  ) => {
    try {
      setSubmitting(true);
      setActionError(null);
      setSuccessMessage(null);

      const updated = await action();
      setOrder(updated);
      setSuccessMessage(message);

      setTimeout(() => setSuccessMessage(null), 3500);
      return true;
    } catch (err: any) {
      setActionError(err?.message || 'The requested action failed.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updateStatus(order._id, {
          status: statusForm.status,
          notes: statusForm.notes || undefined,
        }),
      'Examination status updated successfully.'
    );
    if (success) setShowStatusModal(false);
  };

  const handleSchedule = async () => {
    if (!order || !scheduleForm.scheduledDate) return;
    const success = await runAction(
      () =>
        RadiologyApiService.scheduleOrder(order._id, {
          scheduledDate: scheduleForm.scheduledDate,
          scheduledStartTime: scheduleForm.scheduledStartTime || undefined,
          scheduledEndTime: scheduleForm.scheduledEndTime || undefined,
          estimatedDurationMinutes: scheduleForm.estimatedDurationMinutes
            ? Number(scheduleForm.estimatedDurationMinutes)
            : undefined,
          modalityId: scheduleForm.modalityId || undefined,
          theatreOrRoom: scheduleForm.theatreOrRoom || undefined,
        }),
      'Radiology examination scheduled successfully.'
    );
    if (success) setShowScheduleModal(false);
  };

  const handleAssignStaff = async () => {
    if (!order || !staffForm.userId) return;
    const success = await runAction(
      () =>
        RadiologyApiService.assignStaff(order._id, {
          userId: staffForm.userId,
          role: staffForm.role,
          notes: staffForm.notes || undefined,
        }),
      'Staff member assigned successfully.'
    );
    if (success) {
      setShowStaffModal(false);
      setStaffForm({
        userId: '',
        role: AssignmentRole.RADIOLOGIST,
        notes: '',
      });
      setStaffSearch('');
      setStaffResults([]);
    }
  };

  const handleRemoveStaff = async (userId: string, role: AssignmentRole) => {
    if (!order) return;
    if (!window.confirm('Remove this staff assignment?')) return;

    await runAction(
      () => RadiologyApiService.removeStaff(order._id, userId, role),
      'Staff assignment removed.'
    );
  };

  const handleQueueUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updateQueue(order._id, {
          queuePosition: queueForm.queuePosition
            ? Number(queueForm.queuePosition)
            : undefined,
          queueStatus: queueForm.queueStatus,
        }),
      'Examination queue updated.'
    );
    if (success) setShowQueueModal(false);
  };

  const handleContrastUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updateContrast(order._id, {
          status: contrastForm.status,
          contrastName: contrastForm.contrastName || undefined,
          contrastType: contrastForm.contrastType || undefined,
          dose: contrastForm.dose ? Number(contrastForm.dose) : undefined,
          doseUnit: contrastForm.doseUnit || undefined,
          route: contrastForm.route || undefined,
          reactionObserved: contrastForm.reactionObserved,
          reactionDescription: contrastForm.reactionDescription || undefined,
          notes: contrastForm.notes || undefined,
        }),
      'Contrast documentation updated.'
    );
    if (success) setShowContrastModal(false);
  };

  const handlePregnancyUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updatePregnancyScreening(order._id, {
          status: pregnancyForm.status,
          testType: pregnancyForm.testType || undefined,
          testResult: pregnancyForm.testResult || undefined,
          notes: pregnancyForm.notes || undefined,
        }),
      'Pregnancy screening updated.'
    );
    if (success) setShowPregnancyModal(false);
  };

  const handleRadiationUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updateRadiation(order._id, {
          dose: radiationForm.dose ? Number(radiationForm.dose) : undefined,
          doseUnit: radiationForm.doseUnit || undefined,
          doseAreaProduct: radiationForm.doseAreaProduct
            ? Number(radiationForm.doseAreaProduct)
            : undefined,
          doseAreaProductUnit: radiationForm.doseAreaProductUnit || undefined,
          ctDoseIndex: radiationForm.ctDoseIndex
            ? Number(radiationForm.ctDoseIndex)
            : undefined,
          doseLengthProduct: radiationForm.doseLengthProduct
            ? Number(radiationForm.doseLengthProduct)
            : undefined,
          notes: radiationForm.notes || undefined,
        }),
      'Radiation exposure documentation updated.'
    );
    if (success) setShowRadiationModal(false);
  };

  const handlePacsUpdate = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updatePacs(order._id, {
          studyInstanceUid: pacsForm.studyInstanceUid || undefined,
          seriesInstanceUid: pacsForm.seriesInstanceUid || undefined,
          accessionNumber: pacsForm.accessionNumber || undefined,
          studyId: pacsForm.studyId || undefined,
          studyDate: pacsForm.studyDate || undefined,
          imageCount: pacsForm.imageCount
            ? Number(pacsForm.imageCount)
            : undefined,
          seriesCount: pacsForm.seriesCount
            ? Number(pacsForm.seriesCount)
            : undefined,
          modality: pacsForm.modality || undefined,
          dicomViewerUrl: pacsForm.dicomViewerUrl || undefined,
          storageLocation: pacsForm.storageLocation || undefined,
          storageStatus: pacsForm.storageStatus || undefined,
          sharedLink: pacsForm.sharedLink || undefined,
          sharedLinkExpiresAt: pacsForm.sharedLinkExpiresAt || undefined,
          exportEnabled: pacsForm.exportEnabled,
        }),
      'PACS information updated.'
    );
    if (success) setShowPacsModal(false);
  };

  const handleCompleteReport = async () => {
    if (!order) return;
    if (!reportForm.findings.trim()) {
      setActionError('Please enter the radiology findings.');
      return;
    }
    if (!reportForm.impression.trim()) {
      setActionError('Please enter the radiology impression.');
      return;
    }

    const success = await runAction(
      () =>
        RadiologyApiService.completeReport(order._id, {
          findings: reportForm.findings,
          impression: reportForm.impression,
          radiologistNotes: reportForm.radiologistNotes || undefined,
          templateId: reportForm.templateId || undefined,
          criticalResult: {
            status: reportForm.criticalResultStatus,
            finding: reportForm.criticalFinding || undefined,
            notifiedUserId: reportForm.notifiedUserId || undefined,
            notificationMethod: reportForm.notificationMethod,
            notificationNotes: reportForm.notificationNotes || undefined,
          },
        }),
      'Radiology report saved successfully.'
    );
    if (success) setShowReportModal(false);
  };

  const handleSignReport = async () => {
    if (!order) return;
    if (!window.confirm('Sign and finalize this radiology report?')) return;

    await runAction(
      () => RadiologyApiService.signReport(order._id),
      'Radiology report signed successfully.'
    );
  };

  const handleAmendReport = async () => {
    if (!order) return;
    if (!amendForm.amendmentReason.trim()) {
      setActionError('Please provide a reason for the amendment.');
      return;
    }

    const success = await runAction(
      () =>
        RadiologyApiService.amendReport(order._id, {
          findings: amendForm.findings,
          impression: amendForm.impression,
          radiologistNotes: amendForm.radiologistNotes || undefined,
          amendmentReason: amendForm.amendmentReason,
        }),
      'Radiology report amended successfully.'
    );
    if (success) setShowAmendModal(false);
  };

  const handleCriticalResult = async () => {
    if (!order) return;
    const success = await runAction(
      () =>
        RadiologyApiService.updateCriticalResult(order._id, {
          status: criticalForm.status,
          finding: criticalForm.finding || undefined,
          notifiedUserId: criticalForm.notifiedUserId || undefined,
          notificationMethod: criticalForm.notificationMethod,
          notificationNotes: criticalForm.notificationNotes || undefined,
        }),
      'Critical result status updated.'
    );
    if (success) setShowCriticalModal(false);
  };

  const handleAIUpdate = async () => {
    if (!order) return;

    const measurements: Record<string, number> = {};
    aiForm.measurements
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value && !Number.isNaN(Number(value))) {
          measurements[key.trim()] = Number(value);
        }
      });

    const success = await runAction(
      () =>
        RadiologyApiService.updateAIAnalysis(order._id, {
          enabled: aiForm.enabled,
          modelName: aiForm.modelName || undefined,
          modelVersion: aiForm.modelVersion || undefined,
          priority: aiForm.priority,
          confidence: aiForm.confidence
            ? Number(aiForm.confidence)
            : undefined,
          findings: aiForm.findings
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          measurements,
          recommendations: aiForm.recommendations
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          qualityPassed: aiForm.qualityPassed,
          qualityNotes: aiForm.qualityNotes || undefined,
        }),
      'AI analysis updated successfully.'
    );
    if (success) setShowAIModal(false);
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!cancelReason.trim()) {
      setActionError('Please provide a cancellation reason.');
      return;
    }

    const success = await runAction(
      () => RadiologyApiService.cancelOrder(order._id, cancelReason.trim()),
      'Radiology order cancelled.'
    );
    if (success) {
      setShowCancelModal(false);
      setCancelReason('');
    }
  };

  /* Derived data */
  const patient =
    order && typeof order.patientId !== 'string' ? order.patientId : null;
  const orderingDoctor =
    order && typeof order.orderingDoctorId !== 'string'
      ? order.orderingDoctorId
      : null;
  const age = patient ? getAge(patient.dateOfBirth) : null;
  const assignments = order?.assignments || [];
  const isCancelled = order?.status === RadiologyOrderStatus.CANCELLED;
  const isFinalReport = order?.report?.status === ReportStatus.FINAL;
  const aiConfidence =
    order?.aiAnalysis?.confidence !== undefined
      ? `${Math.round(order.aiAnalysis.confidence * 100)}%`
      : 'N/A';
  const reportVersions = useMemo(
    () => order?.report?.versions || [],
    [order?.report?.versions]
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-100 rounded-xl w-2/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 bg-slate-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Radiology
        </button>

        <div className="bg-white rounded-3xl border border-rose-100 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900">
            Unable to load examination
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {error || 'Radiology order not found.'}
          </p>

          <button
            type="button"
            onClick={() => loadOrder()}
            className="mt-6 px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 mt-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Radiology Examination
              </h1>

              <StatusBadge className={getStatusClasses(order.status)}>
                {formatLabel(order.status)}
              </StatusBadge>

              <StatusBadge className={getPriorityClasses(order.priority)}>
                {order.priority}
              </StatusBadge>
            </div>

            <p className="text-sm text-slate-500 mt-1">
              {order.procedureName} • {formatLabel(order.modality)} •{' '}
              {order.bodyPart}
            </p>

            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Order ID: {order._id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadOrder(true)}
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>

          {!isCancelled && (
            <>
              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Update Status
              </button>

              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold"
              >
                Cancel Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action alerts */}
      {(actionError || successMessage) && (
        <div
          className={`rounded-2xl border p-4 flex items-start gap-3 ${
            actionError
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {actionError ? (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}

          <div className="flex-1">
            <p className="text-xs font-semibold">
              {actionError || successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setSuccessMessage(null);
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Patient / Procedure summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>

            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Patient
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            {getPatientName(order.patientId)}
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            MRN: {getPatientMRN(order.patientId)}
          </p>

          <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
            {patient?.gender && <span>{formatLabel(patient.gender)}</span>}
            {age !== null && <span>{age} years</span>}
          </div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>

            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Examination
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            {order.procedureName}
          </h3>

          <p className="text-xs text-slate-500 mt-1">
            {formatLabel(order.modality)} • {order.bodyPart}
          </p>

          <p className="text-[11px] text-slate-400 mt-3">
            Accession: {order.accessionNumber || 'Not assigned'}
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>

            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Ordering Clinician
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            {orderingDoctor
              ? getStaffName(orderingDoctor)
              : typeof order.orderingDoctorId === 'string'
                ? order.orderingDoctorId
                : 'Not assigned'}
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            {orderingDoctor?.role
              ? formatLabel(orderingDoctor.role)
              : 'Ordering clinician'}
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock3 className="w-4 h-4" />
            </div>

            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Scheduled
            </span>
          </div>

          {order.scheduling?.scheduledDate ? (
            <>
              <h3 className="text-base font-bold text-slate-900">
                {formatDate(order.scheduling.scheduledDate)}
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                {order.scheduling.scheduledStartTime || 'Time not set'}
                {order.scheduling.scheduledEndTime
                  ? ` – ${order.scheduling.scheduledEndTime}`
                  : ''}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-500">
                Not scheduled
              </h3>

              <button
                type="button"
                onClick={() => setShowScheduleModal(true)}
                className="text-xs font-bold text-[#1b7b68] mt-2 hover:underline"
              >
                Schedule examination
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: ClipboardList },
          { id: 'workflow', label: 'Workflow', icon: Activity },
          { id: 'report', label: 'Reporting', icon: FileText },
          { id: 'pacs', label: 'PACS', icon: ImageIcon },
          { id: 'ai', label: 'AI Analysis', icon: Brain },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as 'overview' | 'workflow' | 'report' | 'pacs' | 'ai'
                )
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1b7b68] text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <SectionCard
              title="Clinical Information"
              subtitle="Information provided with the imaging request"
              icon={<Stethoscope className="w-4 h-4" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Procedure" value={order.procedureName} />
                <Field label="Body Part" value={order.bodyPart} />
                <Field label="Modality" value={formatLabel(order.modality)} />
                <Field
                  label="Priority"
                  value={
                    <StatusBadge className={getPriorityClasses(order.priority)}>
                      {order.priority}
                    </StatusBadge>
                  }
                />
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                    Clinical Indication
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm leading-6 text-slate-700">
                    {order.clinicalIndication || 'No clinical indication provided.'}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Scheduling"
              subtitle="Appointment and modality scheduling information"
              icon={<CalendarDays className="w-4 h-4" />}
              action={
                !isCancelled && (
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold"
                  >
                    Edit Schedule
                  </button>
                )
              }
            >
              {order.scheduling?.scheduledDate ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <Field
                    label="Date"
                    value={formatDate(order.scheduling.scheduledDate)}
                  />
                  <Field
                    label="Start"
                    value={order.scheduling.scheduledStartTime || 'Not set'}
                  />
                  <Field
                    label="End"
                    value={order.scheduling.scheduledEndTime || 'Not set'}
                  />
                  <Field
                    label="Duration"
                    value={
                      order.scheduling.estimatedDurationMinutes
                        ? `${order.scheduling.estimatedDurationMinutes} min`
                        : 'Not set'
                    }
                  />
                  <Field
                    label="Room / Theatre"
                    value={order.scheduling.theatreOrRoom || 'Not assigned'}
                  />
                  <Field
                    label="Modality ID"
                    value={order.scheduling.modalityId || 'Not assigned'}
                  />
                  <Field
                    label="Scheduled By"
                    value={order.scheduling.scheduledBy || 'N/A'}
                  />
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600 mt-3">
                    Examination has not been scheduled
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#1b7b68] text-white text-xs font-bold"
                  >
                    Schedule Examination
                  </button>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Patient Preparation"
              subtitle="Preparation instructions and completion"
              icon={<ClipboardList className="w-4 h-4" />}
            >
              {order.patientPreparation ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <Field
                      label="Fasting Required"
                      value={order.patientPreparation.fastingRequired ? 'Yes' : 'No'}
                    />
                    <Field
                      label="Fasting Hours"
                      value={
                        order.patientPreparation.fastingHours
                          ? `${order.patientPreparation.fastingHours} hours`
                          : 'N/A'
                      }
                    />
                    <Field
                      label="Hydration Required"
                      value={order.patientPreparation.hydrationRequired ? 'Yes' : 'No'}
                    />
                    <Field
                      label="Preparation Completed"
                      value={
                        order.patientPreparation.preparationCompleted
                          ? 'Yes'
                          : 'No'
                      }
                    />
                  </div>

                  {order.patientPreparation.instructions && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                        Instructions
                      </p>
                      <div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-700 leading-6">
                        {order.patientPreparation.instructions}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">
                  No preparation information recorded.
                </div>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Examination Queue"
              subtitle="Current queue position"
              icon={<Gauge className="w-4 h-4" />}
              action={
                !isCancelled && (
                  <button
                    type="button"
                    onClick={() => setShowQueueModal(true)}
                    className="text-[11px] font-bold text-[#1b7b68] hover:underline"
                  >
                    Edit
                  </button>
                )
              }
            >
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-[#1b7b68]/10 text-[#1b7b68] mx-auto flex items-center justify-center">
                  <span className="text-xl font-black">
                    {order.queuePosition ?? '—'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-3">Queue Position</p>

                {order.queueStatus && (
                  <StatusBadge
                    className={`mt-3 ${getQueueClasses(order.queueStatus)}`}
                  >
                    {formatLabel(order.queueStatus)}
                  </StatusBadge>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Assigned Staff"
              subtitle="Radiology team assigned to this examination"
              icon={<Users className="w-4 h-4" />}
              action={
                !isCancelled && (
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(true)}
                    className="w-7 h-7 rounded-lg bg-[#1b7b68] text-white flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )
              }
            >
              <div className="space-y-3">
                {assignments.length === 0 ? (
                  <div className="py-5 text-center">
                    <Users className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400 mt-2">No staff assigned</p>
                  </div>
                ) : (
                  assignments.map((assignment: RadiologyAssignment, index) => {
                    const userId =
                      typeof assignment.userId === 'string'
                        ? assignment.userId
                        : assignment.userId?._id || `assignment-${index}`;

                    return (
                      <div
                        key={`${userId}-${assignment.role}-${index}`}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">
                              <User className="w-3.5 h-3.5" />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {getStaffName(assignment.userId)}
                              </p>
                              <p className="text-[10px] text-[#1b7b68] font-semibold mt-0.5">
                                {formatLabel(assignment.role)}
                              </p>
                            </div>
                          </div>

                          {!isCancelled && userId && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveStaff(userId, assignment.role)
                              }
                              className="text-slate-300 hover:text-rose-600"
                              title="Remove assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {assignment.notes && (
                          <p className="text-[10px] text-slate-400 mt-2 pl-10">
                            {assignment.notes}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Safety & Screening"
              subtitle="Patient safety checks"
              icon={<ShieldAlert className="w-4 h-4" />}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Contrast</span>
                  </div>
                  <StatusBadge
                    className={
                      order.contrast?.status === ContrastStatus.CONTRAINDICATED
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }
                  >
                    {formatLabel(order.contrast?.status || ContrastStatus.NOT_REQUIRED)}
                  </StatusBadge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Baby className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Pregnancy</span>
                  </div>
                  <StatusBadge
                    className={
                      order.pregnancyScreening?.status === PregnancyScreeningStatus.POSITIVE
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : order.pregnancyScreening?.status === PregnancyScreeningStatus.NEGATIVE
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    }
                  >
                    {formatLabel(
                      order.pregnancyScreening?.status || PregnancyScreeningStatus.NOT_REQUIRED
                    )}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowContrastModal(true)}
                    className="py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Contrast
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPregnancyModal(true)}
                    className="py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Pregnancy
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* WORKFLOW TAB */}
      {activeTab === 'workflow' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title="Examination Workflow"
            subtitle="Track the patient's imaging journey"
            icon={<Activity className="w-4 h-4" />}
          >
            <div className="space-y-1">
              {[
                RadiologyOrderStatus.REQUESTED,
                RadiologyOrderStatus.SCHEDULED,
                RadiologyOrderStatus.PATIENT_ARRIVED,
                RadiologyOrderStatus.PREPARING,
                RadiologyOrderStatus.READY_FOR_EXAM,
                RadiologyOrderStatus.IN_PROGRESS,
                RadiologyOrderStatus.IMAGE_ACQUISITION_COMPLETE,
                RadiologyOrderStatus.REPORTING,
                RadiologyOrderStatus.REPORTED,
                RadiologyOrderStatus.COMPLETED,
              ].map((status, index) => {
                const orderStatuses = [
                  RadiologyOrderStatus.REQUESTED,
                  RadiologyOrderStatus.SCHEDULED,
                  RadiologyOrderStatus.PATIENT_ARRIVED,
                  RadiologyOrderStatus.PREPARING,
                  RadiologyOrderStatus.READY_FOR_EXAM,
                  RadiologyOrderStatus.IN_PROGRESS,
                  RadiologyOrderStatus.IMAGE_ACQUISITION_COMPLETE,
                  RadiologyOrderStatus.REPORTING,
                  RadiologyOrderStatus.REPORTED,
                  RadiologyOrderStatus.COMPLETED,
                ];
                const currentIndex = orderStatuses.indexOf(order.status);
                const done = index < currentIndex;
                const current = status === order.status;

                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          current
                            ? 'border-[#1b7b68] bg-[#1b7b68] text-white'
                            : done
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <CircleDot className="w-4 h-4" />}
                      </div>
                      {index < 9 && (
                        <div
                          className={`w-px h-7 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`}
                        />
                      )}
                    </div>

                    <div className="pb-5">
                      <p
                        className={`text-xs font-bold ${
                          current
                            ? 'text-[#1b7b68]'
                            : done
                              ? 'text-slate-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {formatLabel(status)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              disabled={isCancelled}
              className="w-full mt-3 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold disabled:opacity-50"
            >
              Update Workflow Status
            </button>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              title="Queue Management"
              subtitle="Radiology department queue"
              icon={<Gauge className="w-4 h-4" />}
              action={
                <button
                  type="button"
                  onClick={() => setShowQueueModal(true)}
                  className="text-[11px] font-bold text-[#1b7b68]"
                >
                  Manage
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Position</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{order.queuePosition ?? '—'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 text-center">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Queue Status</p>
                  <StatusBadge className={`mt-2 ${getQueueClasses(order.queueStatus)}`}>
                    {formatLabel(order.queueStatus || ExaminationQueueStatus.WAITING)}
                  </StatusBadge>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Radiation Exposure"
              subtitle="Radiation dose documentation"
              icon={<Radio className="w-4 h-4" />}
              action={
                <button
                  type="button"
                  onClick={() => setShowRadiationModal(true)}
                  className="text-[11px] font-bold text-[#1b7b68]"
                >
                  Edit
                </button>
              }
            >
              {order.radiationExposure ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Dose"
                    value={
                      order.radiationExposure.dose !== undefined
                        ? `${order.radiationExposure.dose} ${order.radiationExposure.doseUnit || ''}`
                        : 'N/A'
                    }
                  />
                  <Field
                    label="Dose Area Product"
                    value={
                      order.radiationExposure.doseAreaProduct !== undefined
                        ? `${order.radiationExposure.doseAreaProduct} ${order.radiationExposure.doseAreaProductUnit || ''}`
                        : 'N/A'
                    }
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  No radiation exposure recorded.
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* REPORT TAB */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <SectionCard
            title="Radiology Report"
            subtitle="Diagnostic findings and radiologist impression"
            icon={<FileText className="w-4 h-4" />}
            action={
              <div className="flex items-center gap-2">
                {order.report?.status && (
                  <StatusBadge className={getReportStatusClasses(order.report.status)}>
                    {formatLabel(order.report.status)}
                  </StatusBadge>
                )}

                {!isCancelled && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold flex items-center gap-1.5"
                  >
                    <PenLine className="w-3 h-3" />
                    {order.report?.findings ? 'Edit Report' : 'Write Report'}
                  </button>
                )}
              </div>
            }
          >
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Findings</p>
                <div className="min-h-32 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 leading-7 whitespace-pre-wrap">
                  {order.report?.findings || order.findings || 'No findings documented yet.'}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Impression</p>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 leading-7 whitespace-pre-wrap">
                  {order.report?.impression || order.impression || 'No impression documented yet.'}
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex flex-wrap gap-2">
            {!isFinalReport && order.report?.findings && (
              <button
                type="button"
                onClick={handleSignReport}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-[#1b7b68] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sign & Finalize Report
              </button>
            )}

            {isFinalReport && (
              <button
                type="button"
                onClick={() => setShowAmendModal(true)}
                className="px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold flex items-center gap-2"
              >
                <PenLine className="w-3.5 h-3.5" />
                Amend Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* PACS TAB */}
      {activeTab === 'pacs' && (
        <div className="space-y-6">
          <SectionCard
            title="PACS Study"
            subtitle="Picture Archiving and Communication System information"
            icon={<ImageIcon className="w-4 h-4" />}
            action={
              <button
                type="button"
                onClick={() => setShowPacsModal(true)}
                className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold"
              >
                Edit PACS
              </button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Field
                label="Accession Number"
                value={order.pacsMetadata?.accessionNumber || order.accessionNumber}
              />
              <Field label="Study ID" value={order.pacsMetadata?.studyId} />
              <Field label="Study Date" value={formatDate(order.pacsMetadata?.studyDate)} />
              <Field label="Modality" value={formatLabel(order.pacsMetadata?.modality || order.modality)} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* AI TAB */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <SectionCard
            title="MedxVerse AI Analysis"
            subtitle="AI-assisted radiology analysis and quality control"
            icon={<Brain className="w-4 h-4" />}
            action={
              <button
                type="button"
                onClick={() => setShowAIModal(true)}
                className="px-3 py-2 rounded-xl bg-[#1b7b68] text-white text-[11px] font-bold"
              >
                Update AI Analysis
              </button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Enabled</p>
                <p className="text-sm font-bold text-slate-800 mt-2">
                  {order.aiAnalysis?.enabled ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Confidence</p>
                <p className="text-xl font-black text-slate-900 mt-1">{aiConfidence}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* STATUS MODAL */}
      <Modal
        open={showStatusModal}
        title="Update Examination Status"
        subtitle="Move this examination through the radiology workflow."
        onClose={() => setShowStatusModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
            <select
              value={statusForm.status}
              onChange={(e) =>
                setStatusForm({
                  ...statusForm,
                  status: e.target.value as RadiologyOrderStatus,
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            >
              {Object.values(RadiologyOrderStatus).map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea
              rows={4}
              value={statusForm.notes}
              onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
              placeholder="Optional workflow note..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <ModalActions
            onCancel={() => setShowStatusModal(false)}
            onSubmit={handleStatusUpdate}
            submitting={submitting}
            submitLabel="Update Status"
          />
        </div>
      </Modal>

      {/* SCHEDULE MODAL */}
      <Modal
        open={showScheduleModal}
        title="Schedule Examination"
        subtitle="Assign a date, time and imaging room."
        onClose={() => setShowScheduleModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Scheduled Date *</label>
            <input
              type="date"
              value={scheduleForm.scheduledDate}
              onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
            />
          </div>

          <ModalActions
            onCancel={() => setShowScheduleModal(false)}
            onSubmit={handleSchedule}
            submitting={submitting}
            submitLabel="Schedule Examination"
          />
        </div>
      </Modal>

      {/* STAFF MODAL */}
      <Modal
        open={showStaffModal}
        title="Assign Radiology Staff"
        subtitle="Search hospital staff and assign them to this examination."
        onClose={() => setShowStaffModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Staff Member *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search by name, role or department..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1b7b68]"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-2">
            {staffLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Searching staff...
              </div>
            ) : staffResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No staff found.</div>
            ) : (
              staffResults.map((staff) => (
                <button
                  type="button"
                  key={staff._id}
                  onClick={() => setStaffForm({ ...staffForm, userId: staff._id })}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    staffForm.userId === staff._id
                      ? 'border-[#1b7b68] bg-[#1b7b68]/5'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{getStaffName(staff)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatLabel(staff.role)}</p>
                  </div>
                  {staffForm.userId === staff._id && (
                    <CheckCircle2 className="w-4 h-4 text-[#1b7b68]" />
                  )}
                </button>
              ))
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Assignment Role *</label>
            <select
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as AssignmentRole })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            >
              {Object.values(AssignmentRole).map((role) => (
                <option key={role} value={role}>{formatLabel(role)}</option>
              ))}
            </select>
          </div>

          <ModalActions
            onCancel={() => setShowStaffModal(false)}
            onSubmit={handleAssignStaff}
            submitting={submitting}
            submitLabel="Assign Staff"
          />
        </div>
      </Modal>

      {/* QUEUE MODAL */}
      <Modal
        open={showQueueModal}
        title="Manage Examination Queue"
        subtitle="Set the patient's queue position and current queue state."
        onClose={() => setShowQueueModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Queue Position</label>
            <input
              type="number"
              min="1"
              value={queueForm.queuePosition}
              onChange={(e) => setQueueForm({ ...queueForm, queuePosition: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <ModalActions
            onCancel={() => setShowQueueModal(false)}
            onSubmit={handleQueueUpdate}
            submitting={submitting}
            submitLabel="Update Queue"
          />
        </div>
      </Modal>

      {/* CONTRAST MODAL */}
      <Modal
        open={showContrastModal}
        title="Contrast Documentation"
        subtitle="Record contrast administration and reactions."
        onClose={() => setShowContrastModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
            <select
              value={contrastForm.status}
              onChange={(e) => setContrastForm({ ...contrastForm, status: e.target.value as ContrastStatus })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            >
              {Object.values(ContrastStatus).map((status) => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Contrast name"
              value={contrastForm.contrastName}
              onChange={(e) => setContrastForm({ ...contrastForm, contrastName: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
            <input
              placeholder="Contrast type"
              value={contrastForm.contrastType}
              onChange={(e) => setContrastForm({ ...contrastForm, contrastType: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <ModalActions
            onCancel={() => setShowContrastModal(false)}
            onSubmit={handleContrastUpdate}
            submitting={submitting}
            submitLabel="Update Contrast"
          />
        </div>
      </Modal>

      {/* PREGNANCY MODAL */}
      <Modal
        open={showPregnancyModal}
        title="Pregnancy Screening"
        subtitle="Record pregnancy screening details."
        onClose={() => setShowPregnancyModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
            <select
              value={pregnancyForm.status}
              onChange={(e) => setPregnancyForm({ ...pregnancyForm, status: e.target.value as PregnancyScreeningStatus })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            >
              {Object.values(PregnancyScreeningStatus).map((status) => (
                <option key={status} value={status}>{formatLabel(status)}</option>
              ))}
            </select>
          </div>

          <ModalActions
            onCancel={() => setShowPregnancyModal(false)}
            onSubmit={handlePregnancyUpdate}
            submitting={submitting}
            submitLabel="Save Screening"
          />
        </div>
      </Modal>

      {/* RADIATION MODAL */}
      <Modal
        open={showRadiationModal}
        title="Radiation Exposure"
        subtitle="Record radiation dose and metrics."
        onClose={() => setShowRadiationModal(false)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Dose"
              value={radiationForm.dose}
              onChange={(e) => setRadiationForm({ ...radiationForm, dose: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
            <input
              placeholder="Dose Unit (e.g. mGy)"
              value={radiationForm.doseUnit}
              onChange={(e) => setRadiationForm({ ...radiationForm, doseUnit: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <ModalActions
            onCancel={() => setShowRadiationModal(false)}
            onSubmit={handleRadiationUpdate}
            submitting={submitting}
            submitLabel="Save Radiation"
          />
        </div>
      </Modal>

      {/* PACS MODAL */}
      <Modal
        open={showPacsModal}
        title="PACS Metadata"
        subtitle="Update DICOM and PACS details."
        onClose={() => setShowPacsModal(false)}
      >
        <div className="space-y-4">
          <input
            placeholder="Study Instance UID"
            value={pacsForm.studyInstanceUid}
            onChange={(e) => setPacsForm({ ...pacsForm, studyInstanceUid: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
          />
          <input
            placeholder="DICOM Viewer URL"
            value={pacsForm.dicomViewerUrl}
            onChange={(e) => setPacsForm({ ...pacsForm, dicomViewerUrl: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
          />

          <ModalActions
            onCancel={() => setShowPacsModal(false)}
            onSubmit={handlePacsUpdate}
            submitting={submitting}
            submitLabel="Save PACS Metadata"
          />
        </div>
      </Modal>

      {/* REPORT MODAL */}
      <Modal
        open={showReportModal}
        title="Radiology Report"
        subtitle="Write or update findings and impression."
        onClose={() => setShowReportModal(false)}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Findings *</label>
            <textarea
              rows={5}
              value={reportForm.findings}
              onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              placeholder="Detailed findings..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Impression *</label>
            <textarea
              rows={3}
              value={reportForm.impression}
              onChange={(e) => setReportForm({ ...reportForm, impression: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              placeholder="Clinical impression..."
            />
          </div>

          <ModalActions
            onCancel={() => setShowReportModal(false)}
            onSubmit={handleCompleteReport}
            submitting={submitting}
            submitLabel="Save Report"
          />
        </div>
      </Modal>

      {/* AMEND MODAL */}
      <Modal
        open={showAmendModal}
        title="Amend Report"
        subtitle="Provide updated report details and an amendment reason."
        onClose={() => setShowAmendModal(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Amendment *</label>
            <textarea
              rows={3}
              value={amendForm.amendmentReason}
              onChange={(e) => setAmendForm({ ...amendForm, amendmentReason: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              placeholder="State reason..."
            />
          </div>

          <ModalActions
            onCancel={() => setShowAmendModal(false)}
            onSubmit={handleAmendReport}
            submitting={submitting}
            submitLabel="Submit Amendment"
          />
        </div>
      </Modal>

      {/* CRITICAL RESULT MODAL */}
      <Modal
        open={showCriticalModal}
        title="Critical Finding"
        subtitle="Log or update critical finding notification."
        onClose={() => setShowCriticalModal(false)}
      >
        <div className="space-y-4">
          <textarea
            rows={3}
            placeholder="Critical finding details..."
            value={criticalForm.finding}
            onChange={(e) => setCriticalForm({ ...criticalForm, finding: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
          />

          <ModalActions
            onCancel={() => setShowCriticalModal(false)}
            onSubmit={handleCriticalResult}
            submitting={submitting}
            submitLabel="Save Critical Result"
          />
        </div>
      </Modal>

      {/* AI MODAL */}
      <Modal
        open={showAIModal}
        title="Update AI Analysis"
        subtitle="Update parameters and quality control for AI model results."
        onClose={() => setShowAIModal(false)}
      >
        <div className="space-y-4">
          <input
            placeholder="Model Name"
            value={aiForm.modelName}
            onChange={(e) => setAIForm({ ...aiForm, modelName: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
          />

          <ModalActions
            onCancel={() => setShowAIModal(false)}
            onSubmit={handleAIUpdate}
            submitting={submitting}
            submitLabel="Update AI Settings"
          />
        </div>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        open={showCancelModal}
        title="Cancel Radiology Order"
        subtitle="Provide a reason for cancelling this order."
        onClose={() => setShowCancelModal(false)}
      >
        <div className="space-y-4">
          <textarea
            rows={4}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs resize-none"
          />

          <ModalActions
            onCancel={() => setShowCancelModal(false)}
            onSubmit={handleCancel}
            submitting={submitting}
            submitLabel="Confirm Cancellation"
          />
        </div>
      </Modal>
    </div>
  );
}