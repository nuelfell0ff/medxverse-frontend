'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  FileCheck2,
  HeartPulse,
  Mail,
  Plus,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import {
  CreateStaffDTO,
  IStaff,
  StaffCategory,
  StaffClassification,
  StaffDashboard,
  StaffListFilters,
  StaffRole,
  StaffStatus,
  UpdateStaffDTO,
} from '@/types/staff';

import { StaffApiService } from '@/services/staff.service';

const GREEN = '#1b7b68';

const emptyForm: CreateStaffDTO = {
  firstName: '',
  middleName: '',
  lastName: '',
  role: StaffRole.DOCTOR,
  category: StaffCategory.CLINICAL,
  classification: StaffClassification.GENERAL,
  specialties: [],
  professionalRegistrations: [],
  qualifications: [],
  certifications: [],
  professionalExperience: [],
  clinicalPrivileges: [],
  employment: {},
  contact: {},
  emergencyContact: {},
  trainingRecords: [],
  performanceRecords: [],
  availability: [],
  onCallAssignments: [],
  leaveRecords: [],
  attendanceRecords: [],
  incidents: [],
  communications: [],
};

function formatLabel(value?: string) {
  if (!value) return '—';

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(staff: IStaff) {
  return `${staff.firstName?.[0] || ''}${
    staff.lastName?.[0] || ''
  }`.toUpperCase();
}

function getPrimarySpecialty(staff: IStaff) {
  const specialty =
    staff.specialties?.find((item) => item.isPrimary) ||
    staff.specialties?.[0];

  if (!specialty) return 'No specialty';

  return specialty.subSpecialty
    ? `${specialty.specialty} · ${specialty.subSpecialty}`
    : specialty.specialty || 'No specialty';
}

function getCredentialState(staff: IStaff) {
  const dates: string[] = [];

  staff.professionalRegistrations?.forEach((item) => {
    if (item.expiryDate) {
      dates.push(item.expiryDate);
    }
  });

  staff.certifications?.forEach((item) => {
    if (item.expiryDate) {
      dates.push(item.expiryDate);
    }
  });

  staff.clinicalPrivileges?.forEach((item) => {
    if (item.expiryDate) {
      dates.push(item.expiryDate);
    }
  });

  if (!dates.length) {
    return {
      label: 'No expiry date',
      className:
        'bg-slate-50 text-slate-500 border-slate-200',
    };
  }

  const nearest = dates
    .map((date) => new Date(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const now = new Date();

  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + 30);

  if (nearest < now) {
    return {
      label: 'Expired',
      className:
        'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (nearest <= warningDate) {
    return {
      label: 'Expiring soon',
      className:
        'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'Valid',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}

function RoleIcon({
  role,
}: {
  role: StaffRole;
}) {
  if (role === StaffRole.DOCTOR) {
    return <Stethoscope className="w-4 h-4" />;
  }

  if (role === StaffRole.NURSE) {
    return <HeartPulse className="w-4 h-4" />;
  }

  if (
    role === StaffRole.PHARMACIST ||
    role === StaffRole.LAB_TECH ||
    role === StaffRole.RADIOLOGY_TECH
  ) {
    return <FileCheck2 className="w-4 h-4" />;
  }

  return <UserCheck className="w-4 h-4" />;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<IStaff[]>([]);

  const [dashboard, setDashboard] =
    useState<StaffDashboard | null>(null);

  const [loading, setLoading] = useState(true);

  const [dashboardLoading, setDashboardLoading] =
    useState(true);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [role, setRole] = useState<string>('ALL');

  const [category, setCategory] =
    useState<string>('ALL');

  const [classification, setClassification] =
    useState<string>('ALL');

  const [status, setStatus] = useState<string>('ALL');

  const [expandedStaff, setExpandedStaff] =
    useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const [editingStaff, setEditingStaff] =
    useState<IStaff | null>(null);

  const [form, setForm] =
    useState<CreateStaffDTO>({
      ...emptyForm,
    });

  const [saving, setSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);

      const data =
        await StaffApiService.getStaffDashboard();

      setDashboard(data);
    } catch {
      /*
       * Dashboard endpoint is supplemental.
       * Staff list should still work if the
       * dashboard route has not been mounted yet.
       */
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: StaffListFilters = {};

      if (search.trim()) {
        filters.search = search.trim();
      }

      if (role !== 'ALL') {
        filters.role = role;
      }

      if (category !== 'ALL') {
        filters.category = category;
      }

      if (classification !== 'ALL') {
        filters.classification = classification;
      }

      if (status !== 'ALL') {
        filters.status = status;
      }

      const response =
        await StaffApiService.getStaff(filters);

      setStaffList(response.data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch staff members'
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    role,
    category,
    classification,
    status,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStaff();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadStaff]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const refreshAll = async () => {
    await Promise.all([
      loadStaff(),
      loadDashboard(),
    ]);
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
    });
  };

  const closeModal = () => {
    setIsAddOpen(false);
    setIsEditOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (staff: IStaff) => {
    setEditingStaff(staff);

    setForm({
      firstName: staff.firstName,
      middleName: staff.middleName || '',
      lastName: staff.lastName,

      role: staff.role,
      category: staff.category,
      classification: staff.classification,

      specialties: staff.specialties || [],

      professionalRegistrations:
        staff.professionalRegistrations || [],

      qualifications: staff.qualifications || [],

      certifications: staff.certifications || [],

      professionalExperience:
        staff.professionalExperience || [],

      clinicalPrivileges:
        staff.clinicalPrivileges || [],

      employment: staff.employment || {},

      contact: staff.contact || {},

      emergencyContact:
        staff.emergencyContact || {},

      trainingRecords:
        staff.trainingRecords || [],

      performanceRecords:
        staff.performanceRecords || [],

      availability: staff.availability || [],

      onCallAssignments:
        staff.onCallAssignments || [],

      leaveRecords: staff.leaveRecords || [],

      attendanceRecords:
        staff.attendanceRecords || [],

      incidents: staff.incidents || [],

      communications:
        staff.communications || [],
    });

    setIsEditOpen(true);
  };

  const handleCreate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    try {
      setSaving(true);

      await StaffApiService.createStaff(form);

      closeModal();

      await refreshAll();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to create staff member'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!editingStaff) return;

    try {
      setSaving(true);

      const payload: UpdateStaffDTO = {
        ...form,
      };

      await StaffApiService.updateStaff(
        editingStaff._id,
        payload
      );

      closeModal();

      await refreshAll();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to update staff member'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (staff: IStaff) => {
    const action = staff.isActive
      ? 'deactivate'
      : 'activate';

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${staff.firstName} ${staff.lastName}?`
      )
    ) {
      return;
    }

    try {
      await StaffApiService.toggleStaffStatus(
        staff._id
      );

      await refreshAll();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to update staff status'
      );
    }
  };

  const localStats = useMemo(() => {
    const active = staffList.filter(
      (staff) => staff.isActive
    );

    return {
      total: staffList.length,
      active: active.length,
      doctors: active.filter(
        (staff) =>
          staff.role === StaffRole.DOCTOR
      ).length,
      nurses: active.filter(
        (staff) =>
          staff.role === StaffRole.NURSE
      ).length,
    };
  }, [staffList]);

  const stats = dashboard || {
    total: localStats.total,
    active: localStats.active,
    inactive:
      localStats.total - localStats.active,
    doctors: localStats.doctors,
    nurses: localStats.nurses,
    alliedHealth: staffList.filter(
      (staff) =>
        staff.category ===
        StaffCategory.ALLIED_HEALTH
    ).length,
    consultants: staffList.filter(
      (staff) =>
        staff.classification ===
        StaffClassification.CONSULTANT
    ).length,
    residents: staffList.filter(
      (staff) =>
        staff.classification ===
        StaffClassification.RESIDENT
    ).length,
    interns: staffList.filter(
      (staff) =>
        staff.classification ===
        StaffClassification.INTERN
    ).length,
  };

  return (
    <div className="min-h-full w-full bg-slate-50 p-4 md:p-6 xl:p-8">
      <div className="w-full max-w-[1800px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                style={{
                  backgroundColor: GREEN,
                }}
              >
                <Users className="w-5 h-5" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Healthcare Staff
                </h1>

                <p className="text-sm text-slate-500">
                  Manage healthcare workers,
                  credentials, employment and
                  clinical workforce activity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />

              Refresh
            </button>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90"
              style={{
                backgroundColor: GREEN,
              }}
            >
              <UserPlus className="w-4 h-4" />
              Add Healthcare Worker
            </button>
          </div>
        </div>

        {/* DASHBOARD CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <MetricCard
            label="Total Staff"
            value={stats.total}
            icon={<Users />}
          />

          <MetricCard
            label="Active"
            value={stats.active}
            icon={<ShieldCheck />}
            valueClass="text-emerald-600"
          />

          <MetricCard
            label="Doctors"
            value={stats.doctors}
            icon={<Stethoscope />}
            valueClass="text-blue-600"
          />

          <MetricCard
            label="Nurses"
            value={stats.nurses}
            icon={<HeartPulse />}
            valueClass="text-rose-600"
          />

          <MetricCard
            label="Allied Health"
            value={stats.alliedHealth}
            icon={<UserCheck />}
            valueClass="text-purple-600"
          />

          <MetricCard
            label="Consultants"
            value={stats.consultants}
            icon={<Award />}
            valueClass="text-indigo-600"
          />

          <MetricCard
            label="Residents"
            value={stats.residents}
            icon={<BriefcaseBusiness />}
          />

          <MetricCard
            label="Interns"
            value={stats.interns}
            icon={<BadgeCheck />}
          />
        </div>

        {/* FILTER BAR */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, Staff ID, email, job title, specialty..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1b7b68]"
              />
            </div>

            <FilterSelect
              value={role}
              onChange={setRole}
              options={[
                ['ALL', 'All Roles'],
                ...Object.values(StaffRole).map(
                  (item) => [
                    item,
                    formatLabel(item),
                  ]
                ),
              ]}
            />

            <FilterSelect
              value={category}
              onChange={setCategory}
              options={[
                ['ALL', 'All Categories'],
                ...Object.values(
                  StaffCategory
                ).map((item) => [
                  item,
                  formatLabel(item),
                ]),
              ]}
            />

            <FilterSelect
              value={classification}
              onChange={setClassification}
              options={[
                [
                  'ALL',
                  'All Classifications',
                ],
                ...Object.values(
                  StaffClassification
                ).map((item) => [
                  item,
                  formatLabel(item),
                ]),
              ]}
            />

            <FilterSelect
              value={status}
              onChange={setStatus}
              options={[
                ['ALL', 'All Statuses'],
                ...Object.values(StaffStatus).map(
                  (item) => [
                    item,
                    formatLabel(item),
                  ]
                ),
              ]}
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* STAFF TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Healthcare Workforce
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                {staffList.length} staff member
                {staffList.length === 1
                  ? ''
                  : 's'}
              </p>
            </div>

            {dashboardLoading && (
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-3" />

              <p className="text-sm">
                Loading healthcare workers...
              </p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-slate-400" />
              </div>

              <h3 className="font-semibold text-slate-700">
                No staff members found
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Try changing your filters or
                add a new healthcare worker.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Staff Member
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Role
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Department / Unit
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Specialty
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Credentials
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Activity
                    </th>

                    <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => {
                    const credential =
                      getCredentialState(staff);

                    const expanded =
                      expandedStaff ===
                      staff._id;

                    return (
                      <React.Fragment
                        key={staff._id}
                      >
                        <tr className="hover:bg-slate-50/70 transition-colors">

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
                                style={{
                                  backgroundColor:
                                    '#e6f3ef',
                                  color: GREEN,
                                }}
                              >
                                {getInitials(
                                  staff
                                )}
                              </div>

                              <div>
                                <div className="font-bold text-sm text-slate-800">
                                  {staff.firstName}{' '}
                                  {staff.middleName
                                    ? `${staff.middleName} `
                                    : ''}
                                  {staff.lastName}
                                </div>

                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {staff.staffId}
                                  </span>

                                  <span className="text-slate-300">
                                    •
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    {formatLabel(
                                      staff.classification
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                                <RoleIcon
                                  role={staff.role}
                                />
                              </span>

                              <div>
                                <div className="text-xs font-bold text-slate-700">
                                  {formatLabel(
                                    staff.role
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-400">
                                  {formatLabel(
                                    staff.category
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5" />

                              <div>
                                <div className="text-xs font-semibold text-slate-700">
                                  {staff.employment
                                    ?.departmentName ||
                                    staff.employment
                                      ?.departmentId ||
                                    'Unassigned'}
                                </div>

                                {staff.employment
                                  ?.unitName && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {
                                      staff
                                        .employment
                                        .unitName
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="text-xs text-slate-600">
                              {getPrimarySpecialty(
                                staff
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1.5">
                              <div className="text-[10px] text-slate-500">
                                <span className="font-semibold text-slate-700">
                                  {staff
                                    .professionalRegistrations
                                    ?.length || 0}
                                </span>{' '}
                                registrations
                              </div>

                              <span
                                className={`inline-flex px-2 py-1 rounded-full border text-[9px] font-bold ${credential.className}`}
                              >
                                {credential.label}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-500">
                                Clinical activity:{' '}
                                <span className="font-bold text-slate-700">
                                  {
                                    staff.clinicalActivityCount
                                  }
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-500">
                                Caseload:{' '}
                                <span className="font-bold text-slate-700">
                                  {
                                    staff.activePatientCaseload
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                                staff.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {formatLabel(
                                staff.status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end items-center gap-1">
                              <button
                                onClick={() =>
                                  setExpandedStaff(
                                    expanded
                                      ? null
                                      : staff._id
                                  )
                                }
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                                title="View profile"
                              >
                                {expanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  openEdit(staff)
                                }
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                                title="Edit staff"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  toggleStatus(
                                    staff
                                  )
                                }
                                className={`p-2 rounded-lg ${
                                  staff.isActive
                                    ? 'hover:bg-rose-50 text-rose-600'
                                    : 'hover:bg-emerald-50 text-emerald-600'
                                }`}
                                title={
                                  staff.isActive
                                    ? 'Deactivate'
                                    : 'Activate'
                                }
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td
                              colSpan={8}
                              className="px-5 pb-5 bg-slate-50/50"
                            >
                              <StaffProfileSummary
                                staff={staff}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {(isAddOpen || isEditOpen) && (
        <StaffModal
          form={form}
          setForm={setForm}
          editing={isEditOpen}
          saving={saving}
          onClose={closeModal}
          onSubmit={
            isEditOpen
              ? handleUpdate
              : handleCreate
          }
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function MetricCard({
  label,
  value,
  icon,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: number;
  icon: React.ReactElement<{
    className?: string;
  }>;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
            {label}
          </p>

          <p
            className={`text-xl font-bold mt-1 ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
          {React.cloneElement(icon, {
            className: 'w-4 h-4',
          })}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="lg:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-[#1b7b68]"
    >
      {options.map(
        ([optionValue, label]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {label}
          </option>
        )
      )}
    </select>
  );
}

function StaffProfileSummary({
  staff,
}: {
  staff: IStaff;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mt-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <ProfileSection
          title="Contact"
          icon={<Phone />}
        >
          <InfoRow
            icon={<Phone />}
            label="Phone"
            value={staff.contact?.phone}
          />

          <InfoRow
            icon={<Mail />}
            label="Email"
            value={staff.contact?.email}
          />
        </ProfileSection>

        <ProfileSection
          title="Employment"
          icon={<BriefcaseBusiness />}
        >
          <InfoRow
            label="Job title"
            value={
              staff.employment?.jobTitle
            }
          />

          <InfoRow
            label="Employee number"
            value={
              staff.employment?.employeeNumber
            }
          />

          <InfoRow
            label="Employment type"
            value={
              staff.employment?.employmentType
            }
          />
        </ProfileSection>

        <ProfileSection
          title="Credentials"
          icon={<Award />}
        >
          <InfoRow
            label="Registrations"
            value={`${staff.professionalRegistrations?.length || 0}`}
          />

          <InfoRow
            label="Qualifications"
            value={`${staff.qualifications?.length || 0}`}
          />

          <InfoRow
            label="Certifications"
            value={`${staff.certifications?.length || 0}`}
          />

          <InfoRow
            label="Privileges"
            value={`${staff.clinicalPrivileges?.length || 0}`}
          />
        </ProfileSection>

        <ProfileSection
          title="Workforce Activity"
          icon={<Clock3 />}
        >
          <InfoRow
            label="Patient caseload"
            value={`${staff.activePatientCaseload || 0}`}
          />

          <InfoRow
            label="Clinical activity"
            value={`${staff.clinicalActivityCount || 0}`}
          />

          <InfoRow
            label="On-call assignments"
            value={`${staff.onCallAssignments?.length || 0}`}
          />

          <InfoRow
            label="Training records"
            value={`${staff.trainingRecords?.length || 0}`}
          />
        </ProfileSection>
      </div>

      {staff.specialties?.length > 0 && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Specialties
          </p>

          <div className="flex flex-wrap gap-2">
            {staff.specialties.map(
              (specialty, index) => (
                <span
                  key={`${specialty.specialty}-${index}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600"
                >
                  {specialty.specialty}

                  {specialty.subSpecialty
                    ? ` · ${specialty.subSpecialty}`
                    : ''}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactElement<{
    className?: string;
  }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#1b7b68]">
          {React.cloneElement(icon, {
            className: 'w-4 h-4',
          })}
        </span>

        <h3 className="font-bold text-sm text-slate-800">
          {title}
        </h3>
      </div>

      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon?: React.ReactElement<{
    className?: string;
  }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-400 flex items-center gap-1">
        {icon &&
          React.cloneElement(icon, {
            className: 'w-3 h-3',
          })}

        {label}
      </span>

      <span className="font-semibold text-slate-600 text-right">
        {value || '—'}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* STAFF MODAL                                                                */
/* -------------------------------------------------------------------------- */

function StaffModal({
  form,
  setForm,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  form: CreateStaffDTO;
  setForm: React.Dispatch<
    React.SetStateAction<CreateStaffDTO>
  >;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent
  ) => Promise<void>;
}) {
  const updateField = <
    K extends keyof CreateStaffDTO
  >(
    key: K,
    value: CreateStaffDTO[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateContact = (
    key:
      | 'phone'
      | 'alternatePhone'
      | 'email'
      | 'address',
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      contact: {
        ...(current.contact || {}),
        [key]: value,
      },
    }));
  };

  const updateEmployment = (
    key:
      | 'employeeNumber'
      | 'jobTitle'
      | 'departmentName'
      | 'unitName'
      | 'employmentType'
      | 'contractType'
      | 'hireDate'
      | 'contractStartDate'
      | 'contractEndDate',
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      employment: {
        ...(current.employment || {}),
        [key]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden">

        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editing
                ? 'Edit Healthcare Worker'
                : 'Add Healthcare Worker'}
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              {editing
                ? 'Update the staff profile and employment information.'
                : 'Create a central healthcare worker profile.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="overflow-y-auto max-h-[calc(92vh-145px)]"
        >
          <div className="p-6 space-y-7">

            {/* BASIC PROFILE */}
            <FormSection
              title="Basic Profile"
              description="Core identity and professional classification."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="First Name"
                  required
                  value={form.firstName}
                  onChange={(value) =>
                    updateField(
                      'firstName',
                      value
                    )
                  }
                />

                <Input
                  label="Middle Name"
                  value={
                    form.middleName || ''
                  }
                  onChange={(value) =>
                    updateField(
                      'middleName',
                      value
                    )
                  }
                />

                <Input
                  label="Last Name"
                  required
                  value={form.lastName}
                  onChange={(value) =>
                    updateField(
                      'lastName',
                      value
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField
                  label="Professional Role"
                  value={form.role}
                  onChange={(value) =>
                    updateField(
                      'role',
                      value as StaffRole
                    )
                  }
                  options={Object.values(
                    StaffRole
                  ).map((value) => [
                    value,
                    formatLabel(value),
                  ])}
                />

                <SelectField
                  label="Staff Category"
                  value={
                    form.category ||
                    StaffCategory.CLINICAL
                  }
                  onChange={(value) =>
                    updateField(
                      'category',
                      value as StaffCategory
                    )
                  }
                  options={Object.values(
                    StaffCategory
                  ).map((value) => [
                    value,
                    formatLabel(value),
                  ])}
                />

                <SelectField
                  label="Classification"
                  value={
                    form.classification ||
                    StaffClassification.GENERAL
                  }
                  onChange={(value) =>
                    updateField(
                      'classification',
                      value as StaffClassification
                    )
                  }
                  options={Object.values(
                    StaffClassification
                  ).map((value) => [
                    value,
                    formatLabel(value),
                  ])}
                />
              </div>
            </FormSection>

            {/* CONTACT */}
            <FormSection
              title="Contact Information"
              description="Primary communication details."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  type="tel"
                  value={
                    form.contact?.phone ||
                    ''
                  }
                  onChange={(value) =>
                    updateContact(
                      'phone',
                      value
                    )
                  }
                />

                <Input
                  label="Email"
                  type="email"
                  value={
                    form.contact?.email ||
                    ''
                  }
                  onChange={(value) =>
                    updateContact(
                      'email',
                      value
                    )
                  }
                />

                <Input
                  label="Alternate Phone"
                  type="tel"
                  value={
                    form.contact
                      ?.alternatePhone ||
                    ''
                  }
                  onChange={(value) =>
                    updateContact(
                      'alternatePhone',
                      value
                    )
                  }
                />

                <Input
                  label="Address"
                  value={
                    form.contact?.address ||
                    ''
                  }
                  onChange={(value) =>
                    updateContact(
                      'address',
                      value
                    )
                  }
                />
              </div>
            </FormSection>

            {/* EMPLOYMENT */}
            <FormSection
              title="Employment"
              description="Hospital employment and organizational assignment."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Employee Number"
                  value={
                    form.employment
                      ?.employeeNumber ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'employeeNumber',
                      value
                    )
                  }
                />

                <Input
                  label="Job Title"
                  value={
                    form.employment
                      ?.jobTitle || ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'jobTitle',
                      value
                    )
                  }
                />

                <Input
                  label="Department"
                  value={
                    form.employment
                      ?.departmentName ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'departmentName',
                      value
                    )
                  }
                />

                <Input
                  label="Unit"
                  value={
                    form.employment
                      ?.unitName || ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'unitName',
                      value
                    )
                  }
                />

                <Input
                  label="Employment Type"
                  placeholder="Full-time"
                  value={
                    form.employment
                      ?.employmentType ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'employmentType',
                      value
                    )
                  }
                />

                <Input
                  label="Contract Type"
                  placeholder="Permanent"
                  value={
                    form.employment
                      ?.contractType ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'contractType',
                      value
                    )
                  }
                />

                <Input
                  label="Hire Date"
                  type="date"
                  value={
                    form.employment
                      ?.hireDate || ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'hireDate',
                      value
                    )
                  }
                />

                <Input
                  label="Contract Start"
                  type="date"
                  value={
                    form.employment
                      ?.contractStartDate ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'contractStartDate',
                      value
                    )
                  }
                />

                <Input
                  label="Contract End"
                  type="date"
                  value={
                    form.employment
                      ?.contractEndDate ||
                    ''
                  }
                  onChange={(value) =>
                    updateEmployment(
                      'contractEndDate',
                      value
                    )
                  }
                />
              </div>
            </FormSection>

            {/* SPECIALTY */}
            <FormSection
              title="Specialty"
              description="Primary specialty and sub-specialty."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Primary Specialty"
                  value={
                    form.specialties?.[0]
                      ?.specialty || ''
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      specialties: [
                        {
                          specialty: value,
                          isPrimary: true,
                          subSpecialty:
                            current
                              .specialties?.[0]
                              ?.subSpecialty,
                        },
                      ],
                    }))
                  }
                />

                <Input
                  label="Sub-Specialty"
                  value={
                    form.specialties?.[0]
                      ?.subSpecialty || ''
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      specialties: [
                        {
                          specialty:
                            current
                              .specialties?.[0]
                              ?.specialty || '',
                          subSpecialty: value,
                          isPrimary: true,
                        },
                      ],
                    }))
                  }
                />
              </div>
            </FormSection>

            {/* CREDENTIALS */}
            <FormSection
              title="Professional Registration"
              description="Registration and licensing information."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Registration Body"
                  placeholder="e.g. MDCN"
                  value={
                    form
                      .professionalRegistrations?.[0]
                      ?.registrationBody || ''
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      professionalRegistrations: [
                        {
                          ...current
                            .professionalRegistrations?.[0],
                          registrationBody:
                            value,
                        },
                      ],
                    }))
                  }
                />

                <Input
                  label="Registration Number"
                  value={
                    form
                      .professionalRegistrations?.[0]
                      ?.registrationNumber || ''
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      professionalRegistrations: [
                        {
                          ...current
                            .professionalRegistrations?.[0],
                          registrationNumber:
                            value,
                        },
                      ],
                    }))
                  }
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  value={
                    form
                      .professionalRegistrations?.[0]
                      ?.expiryDate || ''
                  }
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      professionalRegistrations: [
                        {
                          ...current
                            .professionalRegistrations?.[0],
                          expiryDate: value,
                        },
                      ],
                    }))
                  }
                />
              </div>
            </FormSection>
          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
              style={{
                backgroundColor: GREEN,
              }}
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save Changes'
                  : 'Create Staff Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>

        <p className="text-xs text-slate-400 mt-0.5">
          {description}
        </p>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}

        {required && (
          <span className="text-rose-500 ml-1">
            *
          </span>
        )}
      </label>

      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-[#1b7b68] focus:ring-2 focus:ring-[#1b7b68]/10"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-[#1b7b68] bg-white"
      >
        {options.map(
          ([optionValue, labelText]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {labelText}
            </option>
          )
        )}
      </select>
    </div>
  );
}