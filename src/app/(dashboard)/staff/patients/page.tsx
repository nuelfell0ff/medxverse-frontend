'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { patientAssignmentService } from '@/services/patient-assignment.service';
import {
  PatientAssignmentRole,
  StaffPatient,
} from '@/types/patient-assignment';

function fullName(patient: StaffPatient) {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
}

function calculateAge(dateOfBirth?: string) {
  if (!dateOfBirth) return '—';

  const date = new Date(dateOfBirth);

  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const month = now.getMonth() - date.getMonth();

  if (month < 0 || (month === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  return String(Math.max(0, age));
}

function roleLabel(role?: PatientAssignmentRole) {
  if (!role) return 'Care team';

  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StaffPatientsPage() {
  const [patients, setPatients] = useState<StaffPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await patientAssignmentService.getMyPatients({
          search: activeSearch,
          role: role || undefined,
          status: 'ACTIVE',
          page: 1,
          limit: 50,
        });

        setPatients(response.patients || []);
        setTotal(Number(response.total || 0));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your assigned patients.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeSearch, role],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const urgent = patients.filter((patient) => patient.isFlagged).length;
    const departments = new Set(
      patients
        .flatMap((patient) =>
          patient.assignments.map(
            (assignment) => assignment.departmentName,
          ),
        )
        .filter(Boolean),
    );

    return {
      total,
      urgent,
      departments: departments.size,
    };
  }, [patients, total]);

  const submitSearch = () => {
    setActiveSearch(search.trim());
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#1b7b68]">
              Clinical workspace
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-800">
              My Patients
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Patients currently assigned to you through the hospital care
              assignment system.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-[#1b7b68]/30 hover:text-[#1b7b68] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#e8f5f3] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#1b7b68]/70">
              Assigned patients
            </p>
            <p className="mt-2 text-2xl font-bold text-[#1b7b68]">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-500">
              Flagged
            </p>
            <p className="mt-2 text-2xl font-bold text-rose-700">
              {summary.urgent}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Departments
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-700">
              {summary.departments}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitSearch();
                }
              }}
              placeholder="Search name, MRN, patient ID or phone"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-700 outline-none transition focus:border-[#1b7b68] focus:bg-white"
            />
          </div>

          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#1b7b68]"
          >
            <option value="">All care roles</option>
            <option value="PRIMARY_PHYSICIAN">Primary Physician</option>
            <option value="ATTENDING_PHYSICIAN">Attending Physician</option>
            <option value="CONSULTANT">Consultant</option>
            <option value="PRIMARY_NURSE">Primary Nurse</option>
            <option value="CARE_TEAM">Care Team</option>
            <option value="PHARMACIST">Pharmacist</option>
            <option value="LAB_TECHNICIAN">Lab Technician</option>
            <option value="RADIOLOGIST">Radiologist</option>
            <option value="CARE_COORDINATOR">Care Coordinator</option>
          </select>

          <button
            type="button"
            onClick={submitSearch}
            className="h-11 rounded-xl bg-[#1b7b68] px-5 text-xs font-bold text-white transition hover:bg-[#176c5d]"
          >
            Search
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-100 bg-white text-xs text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading your assigned patients...
        </div>
      ) : patients.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => {
            const name = fullName(patient);
            const primaryAssignment =
              patient.assignments[0];

            return (
              <article
                key={patient._id}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-slate-800">
                        {name}
                      </h2>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        MRN: {patient.mrn || '—'}
                      </p>
                    </div>
                  </div>

                  {patient.isFlagged && (
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-rose-600">
                      Flagged
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] text-slate-400">Age / Gender</p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-700">
                      {calculateAge(patient.dateOfBirth)} ·{' '}
                      {patient.gender || '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[9px] text-slate-400">Care role</p>
                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-700">
                      {roleLabel(primaryAssignment?.role)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
                  <Stethoscope className="h-3.5 w-3.5 shrink-0 text-[#1b7b68]" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Department
                    </p>
                    <p className="truncate text-[10px] font-semibold text-slate-700">
                      {primaryAssignment?.departmentName || 'Hospital care team'}
                    </p>
                  </div>
                </div>

                {primaryAssignment?.startAt && (
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Assigned {formatDate(primaryAssignment.startAt)}
                  </div>
                )}

                {patient.flagReason && (
                  <div className="mt-3 rounded-xl bg-rose-50 p-3 text-[10px] leading-4 text-rose-700">
                    {patient.flagReason}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href={`/staff/patients/${encodeURIComponent(patient._id)}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-[#176c5d]"
                  >
                    Open patient
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href={`/staff/messages?patient=${encodeURIComponent(patient._id)}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-[#1b7b68]/30 hover:text-[#1b7b68]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Messages
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <UserRound className="mx-auto h-9 w-9 text-slate-200" />
          <h2 className="mt-4 text-sm font-bold text-slate-700">
            No assigned patients
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
            Patients will appear here when the hospital assigns you to their
            care or when an appointment creates a care assignment for you.
          </p>
        </div>
      )}

      {!loading && total > patients.length && (
        <p className="text-center text-[10px] text-slate-400">
          Showing {patients.length} of {total} assigned patients.
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" />
        Active care assignments are the source of truth for this list.
      </div>
    </div>
  );
}
