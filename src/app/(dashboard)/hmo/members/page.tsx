'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Activity,
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';

/* =========================================================
   MEMBER REGISTRY PAGE

   CENTRAL API NORMALIZATION

   All API calls MUST pass relative API paths to api():

     api('/members')
     api('/health-plans')
     api(`/members/${id}/eligibility`)

   The api() helper is the ONLY place that constructs the
   final backend URL.

   This prevents malformed URLs such as:

     /api/v1/https://medxverse-backend.onrender.com/api/v1/health-plans

   Final requests resolve to:

     https://medxverse-backend.onrender.com/api/v1/...

   Backend contract used by this page:

     GET     /members
     POST    /members
     GET     /members/:id
     PATCH   /members/:id
     PATCH   /members/:id/status
     GET     /members/:id/dependents
     GET     /members/:id/eligibility
     POST    /members/:id/renew
     GET     /members/:id/card
     GET     /members/:id/history

   The backend resolves the HMO from the authenticated account,
   so this page intentionally does NOT send hmoId in requests.
   ========================================================= */

type MemberStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'PENDING';

type Relationship =
  | 'PRIMARY'
  | 'SPOUSE'
  | 'CHILD'
  | 'DEPENDENT';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED';

type Address = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
};

type Member = {
  _id: string;
  hmoId?: string;
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus?: MaritalStatus;
  address?: Address;
  healthPlanId: any;
  primaryProviderId?: any;
  relationship: Relationship;
  primaryMemberId?: any;
  status: MemberStatus;
  startDate: string;
  endDate?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SelectOption = {
  _id: string;
  id?: string;
  name?: string;
  code?: string;
  firstName?: string;
  lastName?: string;
  policyNumber?: string;
  status?: string;
  description?: string;
  category?: string;
  benefitIds?: any[];
  defaultRule?: any;
};

type MemberForm = {
  policyNumber: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  maritalStatus: MaritalStatus | '';
  street: string;
  city: string;
  state: string;
  country: string;
  healthPlanId: string;
  primaryProviderId: string;
  relationship: Relationship;
  primaryMemberId: string;
  status: MemberStatus;
  startDate: string;
  endDate: string;
  photoUrl: string;
};

/* =========================================================
   CENTRAL API CONFIGURATION
   ========================================================= */

const RAW_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1';

const normalizeApiBase = (value: string): string => {
  const base = String(value || '')
    .trim()
    .replace(/\/+$/, '');

  if (!base) {
    return 'https://medxverse-backend.onrender.com/api/v1';
  }

  return base.endsWith('/api/v1')
    ? base
    : `${base}/api/v1`;
};

const API = normalizeApiBase(RAW_API_BASE);

/*
 * IMPORTANT:
 *
 * These are PATHS, not full URLs.
 *
 * Do NOT change these to:
 *
 *   `${API}/members`
 *
 * because api() already prepends API.
 */
const MEMBERS_API = '/members';
const HEALTH_PLANS_API = '/health-plans';
const PROVIDERS_API = '/providers';

/* =========================================================
   CENTRAL REQUEST HELPER
   ========================================================= */

function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  for (const key of [
    'token',
    'accessToken',
    'access_token',
    'authToken',
    'jwt',
  ]) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      if (typeof parsed === 'string') {
        return parsed;
      }

      if (parsed?.accessToken) {
        return parsed.accessToken;
      }

      if (parsed?.token) {
        return parsed.token;
      }
    } catch {
      return value;
    }
  }

  return null;
}

/**
 * Converts any accepted API path into a relative path.
 *
 * Accepted:
 *
 *   /members
 *   members
 *   /api/v1/members
 *   api/v1/members
 *   https://medxverse-backend.onrender.com/api/v1/members
 *
 * Full URLs are supported defensively, but callers in this page
 * should use relative paths only.
 */
function normalizeApiPath(path: string): string {
  let value = String(path || '').trim();

  if (!value) return '/';

  /*
   * Defensive handling for accidental absolute URLs.
   * This prevents:
   *
   * /api/v1/https://...
   */
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);

      value = parsed.pathname + parsed.search;

      if (parsed.hash) {
        value += parsed.hash;
      }
    } catch {
      throw new Error('Invalid API URL.');
    }
  }

  value = value.replace(/^\/+/, '');

  if (value === 'api/v1') {
    return '/';
  }

  if (value.startsWith('api/v1/')) {
    value = value.slice('api/v1/'.length);
  }

  return `/${value}`;
}

async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = normalizeApiPath(path);
  const url = `${API}${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      json?.errors?.[0]?.message ||
      `Request failed (${response.status})`;

    throw new Error(message);
  }

  return (json?.data ?? json) as T;
}

/* =========================================================
   HELPERS
   ========================================================= */

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.members)) {
    return value.members;
  }

  if (Array.isArray(value?.providers)) {
    return value.providers;
  }

  if (Array.isArray(value?.packages)) {
    return value.packages;
  }

  if (Array.isArray(value?.benefits)) {
    return value.benefits;
  }

  if (Array.isArray(value?.plans)) {
    return value.plans;
  }

  if (Array.isArray(value?.dependents)) {
    return value.dependents;
  }

  if (Array.isArray(value?.history)) {
    return value.history;
  }

  return [];
};

const idOf = (value: any): string => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  return String(value._id || value.id || '');
};

const displayRef = (value: any): string => {
  const valueId = idOf(value);

  if (!valueId) return '—';

  return valueId.length > 16
    ? `${valueId.slice(0, 7)}…${valueId.slice(-6)}`
    : valueId;
};

const optionName = (
  value: any,
  options: SelectOption[],
): string => {
  const valueId = idOf(value);

  const found = options.find(
    (option) => idOf(option) === valueId,
  );

  if (!found) {
    return displayRef(value);
  }

  return found.code
    ? `${found.code} — ${found.name || valueId}`
    : found.name || found.code || valueId;
};

const human = (value: any): string =>
  String(value ?? '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const dateOnly = (value: any): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const dateTime = (value: any): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const fullName = (
  member?: Partial<Member> | null,
): string =>
  [
    member?.firstName,
    member?.otherNames,
    member?.lastName,
  ]
    .filter(Boolean)
    .join(' ') || 'Member';

/* =========================================================
   UI CONSTANTS
   ========================================================= */

const input =
  'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

const primary =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#156b5b] disabled:cursor-not-allowed disabled:opacity-50';

const secondary =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const danger =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50';

/* =========================================================
   UI COMPONENTS
   ========================================================= */

function StatusBadge({
  value,
}: {
  value?: string;
}) {
  const status = String(value || 'UNKNOWN').toUpperCase();

  const className =
    status === 'ACTIVE'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : status === 'PENDING'
        ? 'border-amber-100 bg-amber-50 text-amber-700'
        : status === 'SUSPENDED'
          ? 'border-orange-100 bg-orange-50 text-orange-700'
          : status === 'TERMINATED'
            ? 'border-rose-100 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-slate-100 text-slate-600';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase ${className}`}
    >
      {human(status)}
    </span>
  );
}

function Card({
  title,
  sub,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  sub?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#e8f5f3] p-2 text-[#1b7b68]">
            <Icon className="h-4 w-4" />
          </span>

          <div>
            <h2 className="text-sm font-black">{title}</h2>

            {sub && (
              <p className="mt-1 text-[10px] text-slate-400">
                {sub}
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
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}{' '}
        {required && (
          <span className="text-rose-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-black text-slate-800">
        {value || '—'}
      </div>
    </div>
  );
}

function Table({
  heads,
  rows,
}: {
  heads: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-230 text-left">
        <thead className="bg-slate-50">
          <tr>
            {heads.map((head) => (
              <th
                key={head}
                className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-slate-50/70"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-xs text-slate-600"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  message = 'No records found.',
}: {
  message?: string;
}) {
  return (
    <div className="p-12 text-center text-xs text-slate-400">
      {message}
    </div>
  );
}

function Modal({
  title,
  sub,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-3xl bg-white shadow-2xl ${
          wide ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-base font-black">
              {title}
            </h2>

            {sub && (
              <p className="mt-1 text-xs text-slate-400">
                {sub}
              </p>
            )}
          </div>

          <button
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM
   ========================================================= */

const emptyForm: MemberForm = {
  policyNumber: '',
  firstName: '',
  lastName: '',
  otherNames: '',
  email: '',
  phone: '',
  gender: 'MALE',
  dateOfBirth: '',
  maritalStatus: '',
  street: '',
  city: '',
  state: '',
  country: 'Nigeria',
  healthPlanId: '',
  primaryProviderId: '',
  relationship: 'PRIMARY',
  primaryMemberId: '',
  status: 'ACTIVE',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  photoUrl: '',
};

function formFromMember(member: Member): MemberForm {
  return {
    policyNumber: member.policyNumber || '',
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    otherNames: member.otherNames || '',
    email: member.email || '',
    phone: member.phone || '',
    gender: member.gender || 'MALE',

    dateOfBirth: member.dateOfBirth
      ? new Date(member.dateOfBirth)
          .toISOString()
          .slice(0, 10)
      : '',

    maritalStatus: member.maritalStatus || '',

    street: member.address?.street || '',
    city: member.address?.city || '',
    state: member.address?.state || '',
    country: member.address?.country || 'Nigeria',

    healthPlanId: idOf(member.healthPlanId),
    primaryProviderId: idOf(member.primaryProviderId),

    relationship: member.relationship || 'PRIMARY',
    primaryMemberId: idOf(member.primaryMemberId),

    status: member.status || 'ACTIVE',

    startDate: member.startDate
      ? new Date(member.startDate)
          .toISOString()
          .slice(0, 10)
      : '',

    endDate: member.endDate
      ? new Date(member.endDate)
          .toISOString()
          .slice(0, 10)
      : '',

    photoUrl: member.photoUrl || '',
  };
}

function MemberFormModal({
  open,
  editing,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSave,
  healthPlans,
  providers,
  parentMember,
}: {
  open: boolean;
  editing: Member | null;
  form: MemberForm;
  setForm: React.Dispatch<
    React.SetStateAction<MemberForm>
  >;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: () => void;
  healthPlans: SelectOption[];
  providers: SelectOption[];
  parentMember: Member | null;
}) {
  if (!open) return null;

  const update = <
    K extends keyof MemberForm
  >(
    key: K,
    value: MemberForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <Modal
      title={editing ? 'Edit member' : 'Add dependant'}
      sub={
        editing
          ? `Updating ${editing.policyNumber}`
          : parentMember
            ? `Add a dependant under ${fullName(parentMember)}.`
            : 'Add a dependant from a primary member profile.'
      }
      onClose={onClose}
      wide
    >
      <div className="space-y-5 p-5">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PERSONAL INFORMATION */}

        <div className="rounded-3xl border border-slate-100 p-4">
          <div className="mb-4 text-xs font-black">
            Personal information
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Policy number" required>
              <input
                className={input}
                disabled={!!editing}
                value={form.policyNumber}
                onChange={(e) =>
                  update('policyNumber', e.target.value)
                }
                placeholder="HMO-001"
              />
            </Field>

            <Field label="First name" required>
              <input
                className={input}
                value={form.firstName}
                onChange={(e) =>
                  update('firstName', e.target.value)
                }
              />
            </Field>

            <Field label="Last name" required>
              <input
                className={input}
                value={form.lastName}
                onChange={(e) =>
                  update('lastName', e.target.value)
                }
              />
            </Field>

            <Field label="Other names">
              <input
                className={input}
                value={form.otherNames}
                onChange={(e) =>
                  update('otherNames', e.target.value)
                }
              />
            </Field>

            <Field label="Email" required>
              <input
                className={input}
                type="email"
                value={form.email}
                onChange={(e) =>
                  update('email', e.target.value)
                }
              />
            </Field>

            <Field label="Phone" required>
              <input
                className={input}
                value={form.phone}
                onChange={(e) =>
                  update('phone', e.target.value)
                }
              />
            </Field>

            <Field label="Gender" required>
              <select
                className={input}
                value={form.gender}
                onChange={(e) =>
                  update(
                    'gender',
                    e.target.value as Gender,
                  )
                }
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>

            <Field label="Date of birth" required>
              <input
                className={input}
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  update('dateOfBirth', e.target.value)
                }
              />
            </Field>

            <Field label="Marital status">
              <select
                className={input}
                value={form.maritalStatus}
                onChange={(e) =>
                  update(
                    'maritalStatus',
                    e.target.value as
                      | MaritalStatus
                      | '',
                  )
                }
              >
                <option value="">
                  Not specified
                </option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
                <option value="WIDOWED">Widowed</option>
              </select>
            </Field>
          </div>
        </div>

        {/* COVERAGE */}

        <div className="rounded-3xl border border-slate-100 p-4">
          <div className="mb-4 text-xs font-black">
            Coverage & relationship
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Health plan" required>
              {parentMember ? (
                <div className={`${input} flex items-center justify-between gap-2 bg-slate-100 text-slate-600`}>
                  <span>{optionName(parentMember.healthPlanId, healthPlans)}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Inherited</span>
                </div>
              ) : (
                <>
                  <select
                    className={input}
                    value={form.healthPlanId}
                    onChange={(e) =>
                      update(
                        'healthPlanId',
                        e.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select health plan
                    </option>

                    {healthPlans.map((plan) => (
                      <option
                        key={idOf(plan)}
                        value={idOf(plan)}
                      >
                        {plan.code
                          ? `${plan.code} — `
                          : ''}
                        {plan.name || idOf(plan)}
                      </option>
                    ))}
                  </select>

                  {!healthPlans.length && (
                    <p className="mt-1.5 text-[10px] text-amber-600">
                      No active health plans were returned by the backend.
                    </p>
                  )}
                </>
              )}
            </Field>

            <Field label="Primary provider">
              <select
                className={input}
                value={form.primaryProviderId}
                onChange={(e) =>
                  update(
                    'primaryProviderId',
                    e.target.value,
                  )
                }
              >
                <option value="">
                  No provider selected
                </option>

                {providers.map((provider) => (
                  <option
                    key={idOf(provider)}
                    value={idOf(provider)}
                  >
                    {provider.name ||
                      provider.code ||
                      idOf(provider)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Relationship">
              <div className={`${input} flex items-center justify-between bg-slate-50`}>
                <span className="font-black text-slate-700">
                  {human(form.relationship)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Set from the selected primary member
                </span>
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field label="Primary member" required>
                <div className={`${input} bg-slate-50`}>
                  {parentMember ? (
                    <>
                      <div className="font-black text-slate-800">
                        {fullName(parentMember)}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        Policy {parentMember.policyNumber} · Primary member
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400">No primary member selected</span>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  This dependant is being created from the primary member's profile. The MongoDB ID is fetched automatically.
                </p>
              </Field>
            </div>

            <Field label="Status">
              <select
                className={input}
                value={form.status}
                onChange={(e) =>
                  update(
                    'status',
                    e.target.value as MemberStatus,
                  )
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="PENDING">
                  Pending
                </option>
                <option value="SUSPENDED">
                  Suspended
                </option>
                <option value="TERMINATED">
                  Terminated
                </option>
              </select>
            </Field>

            <Field label="Start date">
              <input
                className={input}
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  update('startDate', e.target.value)
                }
              />
            </Field>

            <Field label="End date">
              <input
                className={input}
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  update('endDate', e.target.value)
                }
              />
            </Field>
          </div>
        </div>

        {/* ADDRESS */}

        <div className="rounded-3xl border border-slate-100 p-4">
          <div className="mb-4 text-xs font-black">
            Address & photo
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Street">
              <input
                className={input}
                value={form.street}
                onChange={(e) =>
                  update('street', e.target.value)
                }
              />
            </Field>

            <Field label="City">
              <input
                className={input}
                value={form.city}
                onChange={(e) =>
                  update('city', e.target.value)
                }
              />
            </Field>

            <Field label="State">
              <input
                className={input}
                value={form.state}
                onChange={(e) =>
                  update('state', e.target.value)
                }
              />
            </Field>

            <Field label="Country">
              <input
                className={input}
                value={form.country}
                onChange={(e) =>
                  update('country', e.target.value)
                }
              />
            </Field>

            <div className="md:col-span-4">
              <Field label="Photo URL">
                <input
                  className={input}
                  value={form.photoUrl}
                  onChange={(e) =>
                    update(
                      'photoUrl',
                      e.target.value,
                    )
                  }
                  placeholder="https://..."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            className={secondary}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className={primary}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}

            {editing
              ? 'Save changes'
              : 'Create dependant'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   MEMBER DETAILS
   ========================================================= */

function MemberDetailsModal({
  member,
  loading,
  eligibility,
  dependents,
  history,
  card,
  onClose,
  onEdit,
  onStatus,
  onRenew,
  onAddDependent,
  healthPlans,
  primaryMembers,
}: {
  member: Member | null;
  loading: boolean;
  eligibility: any;
  dependents: Member[];
  history: any[];
  card: any;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (status: MemberStatus) => void;
  onRenew: () => void;
  onAddDependent: () => void;
  healthPlans: SelectOption[];
  primaryMembers: Member[];
}) {
  if (!member) return null;

  const cardNumber =
    card?.cardNumber ||
    card?.number ||
    card?.cardId ||
    card?._id;

  const eligible =
    eligibility?.eligible ??
    eligibility?.isEligible;

  const parentMember =
    member.relationship !== 'PRIMARY'
      ? primaryMembers.find(
          (candidate) => idOf(candidate) === idOf(member.primaryMemberId),
        )
      : null;

  const healthPlan =
    member.healthPlanId && typeof member.healthPlanId === 'object'
      ? member.healthPlanId
      : healthPlans.find(
          (plan) => idOf(plan) === idOf(member.healthPlanId),
        );

  const planBenefits = Array.isArray(healthPlan?.benefitIds)
    ? healthPlan.benefitIds
    : [];

  return (
    <Modal
      title={fullName(member)}
      sub={`${member.policyNumber} · ${displayRef(
        member._id,
      )}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-5 p-5">
        <div className="flex flex-col gap-4 rounded-3xl bg-[#e8f5f3]/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={fullName(member)}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#1b7b68]">
                <UserRound className="h-7 w-7" />
              </div>
            )}

            <div>
              <div className="text-lg font-black">
                {member.policyNumber}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {member.email} · {member.phone}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge value={member.status} />

                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase text-slate-500">
                  {human(member.relationship)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className={secondary}
              onClick={onEdit}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit
            </button>

            {member.status !== 'ACTIVE' && (
              <button
                className={primary}
                onClick={() =>
                  onStatus('ACTIVE')
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Activate
              </button>
            )}

            {member.status === 'ACTIVE' && (
              <button
                className={danger}
                onClick={() =>
                  onStatus('SUSPENDED')
                }
              >
                <XCircle className="h-3.5 w-3.5" />
                Suspend
              </button>
            )}

            <button
              className={secondary}
              onClick={onRenew}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Renew
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading member details…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                label="Date of birth"
                value={dateOnly(member.dateOfBirth)}
              />

              <Info
                label="Gender"
                value={human(member.gender)}
              />

              <Info
                label="Marital status"
                value={human(member.maritalStatus)}
              />

              <Info
                label="Health plan"
                value={optionName(
                  member.healthPlanId,
                  healthPlans,
                )}
              />

              <Info
                label="Primary provider"
                value={displayRef(
                  member.primaryProviderId,
                )}
              />

              <Info
                label="Coverage start"
                value={dateOnly(member.startDate)}
              />

              <Info
                label="Coverage end"
                value={dateOnly(member.endDate)}
              />

              <Info
                label="Primary member"
                value={
                  member.relationship === 'PRIMARY'
                    ? 'Primary member'
                    : parentMember
                      ? `${fullName(parentMember)} · ${parentMember.policyNumber}`
                      : `Primary member · ${displayRef(member.primaryMemberId)}`
                }
              />
            </div>

            {/* HEALTH PLAN BENEFITS */}

            <Card
              title="Health plan benefits"
              sub={
                healthPlan
                  ? `${healthPlan.name || healthPlan.code || 'Selected health plan'} · benefits included in this member's coverage`
                  : 'Benefits included in the member health plan'
              }
              icon={ShieldCheck}
            >
              {planBenefits.length ? (
                <div className="divide-y divide-slate-100">
                  {planBenefits.map((benefit: any, index: number) => {
                    const rule = benefit?.defaultRule || {};
                    const covered = rule.covered !== false;
                    const limit =
                      rule.annualLimitAmount != null
                        ? `Annual limit: ${rule.annualLimitAmount}`
                        : rule.annualUtilizationLimit != null
                          ? `Annual uses: ${rule.annualUtilizationLimit}`
                          : null;

                    return (
                      <div
                        key={idOf(benefit) || `${benefit?.code || 'benefit'}-${index}`}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-black text-slate-800">
                              {benefit?.name || benefit?.code || 'Benefit'}
                            </div>

                            {benefit?.code && (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                                {benefit.code}
                              </span>
                            )}

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${
                                covered
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-100 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {covered ? 'Covered' : 'Not covered'}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                            {benefit?.category && <span>{human(benefit.category)}</span>}
                            {benefit?.status && <span>{human(benefit.status)}</span>}
                            {limit && <span>{limit}</span>}
                          </div>

                          {benefit?.description && (
                            <p className="mt-2 text-[10px] leading-5 text-slate-500">
                              {benefit.description}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-left sm:text-right">
                          <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                            Plan rule
                          </div>
                          <div className="mt-1 text-[10px] font-bold text-slate-600">
                            {rule.requiresPreAuth ? 'Pre-authorization required' : 'Standard access'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  message={
                    healthPlan
                      ? 'No benefits are attached to this health plan.'
                      : 'Health plan benefits are not available in this member response.'
                  }
                />
              )}
            </Card>

            {/* ELIGIBILITY */}

            <div className="grid gap-4 lg:grid-cols-2">
              <Card
                title="Eligibility"
                sub="Current eligibility check"
                icon={BadgeCheck}
              >
                <div className="p-5">
                  <div
                    className={`rounded-2xl border p-4 ${
                      eligible === true
                        ? 'border-emerald-100 bg-emerald-50'
                        : eligible === false
                          ? 'border-rose-100 bg-rose-50'
                          : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-black">
                        {eligible === true
                          ? 'Eligible'
                          : eligible === false
                            ? 'Not eligible'
                            : 'Eligibility unavailable'}
                      </div>

                      {eligibility?.status && (
                        <StatusBadge
                          value={eligibility.status}
                        />
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <Info
                        label="Policy"
                        value={
                          eligibility?.policyNumber ||
                          member.policyNumber
                        }
                      />

                      <Info
                        label="Coverage start"
                        value={dateOnly(
                          eligibility?.coverageStartDate ||
                            member.startDate,
                        )}
                      />

                      <Info
                        label="Coverage end"
                        value={dateOnly(
                          eligibility?.coverageEndDate ||
                            member.endDate,
                        )}
                      />

                      <Info
                        label="Health plan"
                        value={optionName(
                          eligibility?.healthPlanId ||
                            member.healthPlanId,
                          healthPlans,
                        )}
                      />

                      <Info
                        label="Enrollee"
                        value={displayRef(
                          eligibility?.enrolleeId,
                        )}
                      />
                    </div>

                    {eligibility?.reason && (
                      <div className="mt-4 rounded-xl bg-white/70 p-3 text-[10px] text-slate-500">
                        {eligibility.reason}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* DIGITAL CARD */}

              <Card
                title="Digital HMO card"
                sub="Issued through the member registry"
                icon={CreditCard}
              >
                <div className="p-5">
                  {card ? (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-[9px] font-extrabold uppercase text-slate-400">
                        Card reference
                      </div>

                      <div className="mt-1 font-mono text-sm font-black">
                        {displayRef(cardNumber)}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <Info
                          label="Policy"
                          value={
                            card.policyNumber ||
                            member.policyNumber
                          }
                        />

                        <Info
                          label="Issued"
                          value={dateTime(
                            card.issuedAt ||
                              card.createdAt,
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="No digital card data was returned." />
                  )}
                </div>
              </Card>
            </div>

            {/* DEPENDANTS */}

            <Card
              title="Dependants"
              sub="Members linked to this primary member"
              icon={Users}
              action={
                member.relationship === 'PRIMARY' ? (
                  <button
                    className={primary}
                    onClick={onAddDependent}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add dependant
                  </button>
                ) : undefined
              }
            >
              {dependents.length ? (
                <Table
                  heads={[
                    'Member',
                    'Policy',
                    'Relationship',
                    'Status',
                    'Coverage',
                  ]}
                  rows={dependents.map(
                    (dependent) => [
                      <div key="name">
                        <div className="font-black">
                          {fullName(dependent)}
                        </div>

                        <div className="text-[9px] text-slate-400">
                          {displayRef(
                            dependent._id,
                          )}
                        </div>
                      </div>,

                      dependent.policyNumber,

                      human(
                        dependent.relationship,
                      ),

                      <StatusBadge
                        key="status"
                        value={dependent.status}
                      />,

                      `${dateOnly(
                        dependent.startDate,
                      )} — ${dateOnly(
                        dependent.endDate,
                      )}`,
                    ],
                  )}
                />
              ) : (
                <EmptyState
                  message={
                    member.relationship ===
                    'PRIMARY'
                      ? 'No dependants found.'
                      : 'Dependants are available for primary members.'
                  }
                />
              )}
            </Card>

            {/* HISTORY */}

            <Card
              title="Lifecycle history"
              sub="Audit events returned by the member registry"
              icon={History}
            >
              {history.length ? (
                <Table
                  heads={[
                    'Event',
                    'Status',
                    'Reason',
                    'Date',
                  ]}
                  rows={history.map(
                    (event: any) => [
                      human(
                        event.eventType ||
                          event.type ||
                          event.action ||
                          event.event ||
                          'Lifecycle event',
                      ),

                      <StatusBadge
                        key="status"
                        value={
                          event.status ||
                          event.toStatus
                        }
                      />,

                      event.reason ||
                        event.notes ||
                        event.description ||
                        '—',

                      dateTime(
                        event.createdAt ||
                          event.occurredAt ||
                          event.date,
                      ),
                    ],
                  )}
                />
              ) : (
                <EmptyState message="No lifecycle history returned." />
              )}
            </Card>
          </>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function MembersPage() {
  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<'ALL' | MemberStatus>('ALL');

  const [relationship, setRelationship] =
    useState<'ALL' | Relationship>('ALL');

  const [page, setPage] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [pages, setPages] =
    useState(1);

  const pageSize = 12;

  const [formOpen, setFormOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Member | null>(null);

  const [form, setForm] =
    useState<MemberForm>({
      ...emptyForm,
    });

  const [formError, setFormError] =
    useState('');

  const [selected, setSelected] =
    useState<Member | null>(null);

  const [detailOpen, setDetailOpen] =
    useState(false);

  const [eligibility, setEligibility] =
    useState<any>(null);

  const [dependents, setDependents] =
    useState<Member[]>([]);

  const [history, setHistory] =
    useState<any[]>([]);

  const [card, setCard] =
    useState<any>(null);

  const [healthPlans, setHealthPlans] =
    useState<SelectOption[]>([]);

  const [providers, setProviders] =
    useState<SelectOption[]>([]);

  const [primaryMembers, setPrimaryMembers] =
    useState<Member[]>([]);

  const [renewOpen, setRenewOpen] =
    useState(false);

  const [renewEndDate, setRenewEndDate] =
    useState('');

  const [renewReason, setRenewReason] =
    useState('');

  const [suspendOpen, setSuspendOpen] =
    useState(false);

  const [suspendReason, setSuspendReason] =
    useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  /* =======================================================
     LOAD REFERENCE DATA

     IMPORTANT:
     All API calls use relative paths.
     ======================================================= */

  const loadReferenceData =
    useCallback(async () => {
      try {
        const [
          healthPlansResult,
          providersResult,
          primaryMembersResult,
        ] = await Promise.all([
          api<any>(
            `${HEALTH_PLANS_API}?page=1&limit=100&status=ACTIVE`,
          ),

          api<any>(
            `${PROVIDERS_API}?page=1&limit=100`,
          ).catch(() => []),

          api<any>(
            `${MEMBERS_API}?relationship=PRIMARY&status=ACTIVE&page=1&limit=100`,
          ).catch(() => []),
        ]);

        const healthPlanData =
          healthPlansResult?.data ??
          healthPlansResult;

        const providerData =
          providersResult?.data ??
          providersResult;

        const primaryData =
          primaryMembersResult?.data ??
          primaryMembersResult;

        setHealthPlans(
          asArray(healthPlanData).filter(Boolean),
        );

        setProviders(
          asArray(providerData).filter(Boolean),
        );

        const primaryList =
          Array.isArray(primaryData?.members)
            ? primaryData.members
            : asArray(primaryData);

        setPrimaryMembers(
          primaryList.filter(
            (member: Member) =>
              member.relationship ===
              'PRIMARY',
          ),
        );
      } catch (err: any) {
        setError(
          err?.message ||
            'Unable to load health plans and providers.',
        );
      }
    }, []);

  /* =======================================================
     LOAD MEMBERS
     ======================================================= */

  const loadMembers =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const params =
          new URLSearchParams({
            page: String(page),
            limit: String(pageSize),
          });

        if (search.trim()) {
          params.set(
            'search',
            search.trim(),
          );
        }

        if (status !== 'ALL') {
          params.set('status', status);
        }

        if (relationship !== 'ALL') {
          params.set(
            'relationship',
            relationship,
          );
        }

        const result = await api<{
          members: Member[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(
          `${MEMBERS_API}?${params.toString()}`,
        );

        setMembers(
          Array.isArray(result?.members)
            ? result.members
            : asArray(result),
        );

        setTotal(
          Number(result?.total || 0),
        );

        setPages(
          Math.max(
            1,
            Number(result?.totalPages || 1),
          ),
        );
      } catch (err: any) {
        setError(
          err?.message ||
            'Unable to load members.',
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      relationship,
      search,
      status,
    ]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadMembers(),
      search.trim() ? 350 : 0,
    );

    return () =>
      window.clearTimeout(timer);
  }, [loadMembers, search]);

  useEffect(() => {
    setPage(1);
  }, [status, relationship]);

  /* =======================================================
     EDIT
     ======================================================= */

  const openEdit = (
    member: Member,
  ) => {
    clearMessages();

    setEditing(member);

    setForm(
      formFromMember(member),
    );

    setFormError('');
    setFormOpen(true);
  };

  /* =======================================================
     ADD DEPENDANT
     ======================================================= */

  const openAddDependent = () => {
    if (!selected || selected.relationship !== 'PRIMARY') return;

    clearMessages();

    setDetailOpen(false);

    setEditing(null);

    setForm({
      ...emptyForm,

      startDate: new Date()
        .toISOString()
        .slice(0, 10),

      relationship: 'CHILD',

      primaryMemberId:
        selected._id,

      healthPlanId:
        idOf(
          selected.healthPlanId,
        ),

      primaryProviderId:
        idOf(
          selected.primaryProviderId,
        ),
    });

    setFormError('');
    setFormOpen(true);
  };

  /* =======================================================
     DETAILS
     ======================================================= */

  const openDetails =
    async (member: Member) => {
      clearMessages();

      setSelected(member);
      setDetailOpen(true);

      setDetailLoading(true);

      setEligibility(null);
      setDependents([]);
      setHistory([]);
      setCard(null);

      try {
        const [
          detailResult,
          eligibilityResult,
          dependentsResult,
          historyResult,
          cardResult,
        ] = await Promise.all([
          api<Member>(
            `${MEMBERS_API}/${member._id}`,
          ),

          api<any>(
            `${MEMBERS_API}/${member._id}/eligibility`,
          ).catch(() => null),

          member.relationship ===
          'PRIMARY'
            ? api<Member[]>(
                `${MEMBERS_API}/${member._id}/dependents`,
              ).catch(() => [])
            : Promise.resolve(
                [] as Member[],
              ),

          api<any[]>(
            `${MEMBERS_API}/${member._id}/history`,
          ).catch(() => []),

          api<any>(
            `${MEMBERS_API}/${member._id}/card`,
          ).catch(() => null),
        ]);

        const detail =
          (detailResult as any)
            ?.member ||
          detailResult;

        const current =
          detail || member;

        setSelected(current);

        setEligibility(
          eligibilityResult,
        );

        setDependents(
          asArray(
            dependentsResult,
          ),
        );

        setHistory(
          asArray(historyResult),
        );

        setCard(cardResult);
      } catch (err: any) {
        setError(
          err?.message ||
            'Unable to load member details.',
        );
      } finally {
        setDetailLoading(false);
      }
    };

  /* =======================================================
     VALIDATION
     ======================================================= */

  const validateForm = (): string | null => {
    if (
      !editing &&
      !form.policyNumber.trim()
    ) {
      return 'Policy number is required.';
    }

    if (!form.firstName.trim()) {
      return 'First name is required.';
    }

    if (!form.lastName.trim()) {
      return 'Last name is required.';
    }

    if (!form.email.trim()) {
      return 'Email is required.';
    }

    if (!form.phone.trim()) {
      return 'Phone number is required.';
    }

    if (!form.dateOfBirth) {
      return 'Date of birth is required.';
    }

    if (!form.healthPlanId.trim()) {
      return 'Health plan is required. Select a health plan from the list.';
    }

    if (!editing && form.relationship === 'PRIMARY') {
      return 'Primary members are created from the Enrollee page. Use Add dependant from a primary member profile.';
    }

    if (
      form.relationship !==
        'PRIMARY' &&
      !form.primaryMemberId.trim()
    ) {
      return 'Select the primary member for this dependant.';
    }

    return null;
  };

  /* =======================================================
     SAVE MEMBER
     ======================================================= */

  const saveMember = async () => {
    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError,
      );
      return;
    }

    setSaving(true);
    setFormError('');
    clearMessages();

    const payload: Record<
      string,
      unknown
    > = {
      firstName:
        form.firstName.trim(),

      lastName:
        form.lastName.trim(),

      otherNames:
        form.otherNames.trim() ||
        undefined,

      email:
        form.email.trim(),

      phone:
        form.phone.trim(),

      gender:
        form.gender,

      dateOfBirth:
        form.dateOfBirth,

      maritalStatus:
        form.maritalStatus ||
        undefined,

      address: {
        street:
          form.street.trim() ||
          undefined,

        city:
          form.city.trim() ||
          undefined,

        state:
          form.state.trim() ||
          undefined,

        country:
          form.country.trim() ||
          undefined,
      },

      healthPlanId:
        form.healthPlanId.trim(),

      primaryProviderId:
        form.primaryProviderId.trim() ||
        undefined,

      relationship:
        form.relationship,

      primaryMemberId:
        form.relationship ===
        'PRIMARY'
          ? undefined
          : form.primaryMemberId.trim(),

      status:
        form.status,

      startDate:
        form.startDate ||
        undefined,

      endDate:
        form.endDate ||
        undefined,

      photoUrl:
        form.photoUrl.trim() ||
        undefined,
    };

    if (!editing) {
      payload.policyNumber =
        form.policyNumber
          .trim()
          .toUpperCase();
    }

    try {
      const result =
        await api<Member>(
          editing
            ? `${MEMBERS_API}/${editing._id}`
            : MEMBERS_API,
          {
            method:
              editing
                ? 'PATCH'
                : 'POST',

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const saved =
        (result as any)?.member ||
        result;

      setFormOpen(false);
      setEditing(null);
      setForm({
        ...emptyForm,
      });

      setSuccess(
        editing
          ? 'Member updated successfully.'
          : 'Member created successfully.',
      );

      await loadMembers();

      if (saved?._id) {
        await openDetails(
          saved,
        );
      }
    } catch (err: any) {
      setFormError(
        err?.message ||
          'Unable to save member.',
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     STATUS
     ======================================================= */

  const updateStatus = async (
    member: Member,
    nextStatus: MemberStatus,
    reason?: string,
  ) => {
    setBusy(true);
    clearMessages();

    try {
      const payload: Record<string, unknown> = { status: nextStatus };

      if (nextStatus === 'SUSPENDED') {
        const trimmedReason = reason?.trim() || '';
        if (!trimmedReason) {
          setError('A suspended reason is required.');
          setBusy(false);
          return;
        }
        payload.reason = trimmedReason;
        payload.suspensionReason = trimmedReason;
      }

      const result = await api<Member>(
        `${MEMBERS_API}/${member._id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );

      const updated = (result as any)?.member || result;

      setSelected(updated || { ...member, status: nextStatus });
      setSuspendOpen(false);
      setSuspendReason('');
      setSuccess(`Member status changed to ${human(nextStatus)}.`);

      await loadMembers();

      if (updated?._id) {
        await openDetails(updated);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update member status.');
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     RENEWAL
     ======================================================= */

  const openRenew = () => {
    if (!selected) return;

    const currentEnd =
      selected.endDate
        ? new Date(
            selected.endDate,
          )
        : new Date();

    const next =
      new Date(currentEnd);

    if (next <= new Date()) {
      next.setDate(
        new Date().getDate() +
          365,
      );
    } else {
      next.setFullYear(
        next.getFullYear() +
          1,
      );
    }

    setRenewEndDate(
      next.toISOString().slice(0, 10),
    );

    setRenewReason('');
    setRenewOpen(true);
  };

  const renewMember = async () => {
    if (
      !selected ||
      !renewEndDate
    ) {
      return;
    }

    setBusy(true);
    clearMessages();

    try {
      const result =
        await api<Member>(
          `${MEMBERS_API}/${selected._id}/renew`,
          {
            method: 'POST',

            body: JSON.stringify({
              endDate:
                renewEndDate,

              reason:
                renewReason.trim() ||
                undefined,
            }),
          },
        );

      const updated =
        (result as any)?.member ||
        result;

      setRenewOpen(false);

      setSuccess(
        'Member renewed successfully.',
      );

      await loadMembers();

      if (updated?._id) {
        await openDetails(
          updated,
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to renew member.',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     COUNTS
     ======================================================= */

  const activeCount =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.status ===
            'ACTIVE',
        ).length,
      [members],
    );

  const pendingCount =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.status ===
            'PENDING',
        ).length,
      [members],
    );

  const dependentCount =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.relationship !==
            'PRIMARY',
        ).length,
      [members],
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-full space-y-5 bg-slate-50/50 p-1 text-slate-800">
      {(error || success) && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs ${
            error
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}

          <span className="font-semibold">
            {error || success}
          </span>

          <button
            className="ml-auto"
            onClick={clearMessages}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER */}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">
                Members
              </h1>

              <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-extrabold text-[#1b7b68]">
                HMO
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Manage canonical HMSMember identities created
              through enrolment, then add and manage
              dependants from each primary member profile.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className={secondary}
              onClick={() =>
                void loadMembers()
              }
              disabled={loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loading
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </button>

          </div>
        </div>
      </div>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <Activity className="h-5 w-5 text-[#1b7b68]" />

          <div className="mt-4 text-2xl font-black">
            {total}
          </div>

          <div className="mt-1 text-[10px] font-extrabold uppercase text-slate-500">
            Total members
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            Current filtered registry total
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />

          <div className="mt-4 text-2xl font-black">
            {activeCount}
          </div>

          <div className="mt-1 text-[10px] font-extrabold uppercase text-slate-500">
            Active on page
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            Active coverage records
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <Clock3 className="h-5 w-5 text-amber-600" />

          <div className="mt-4 text-2xl font-black">
            {pendingCount}
          </div>

          <div className="mt-1 text-[10px] font-extrabold uppercase text-slate-500">
            Pending on page
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            Awaiting activation
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <Users className="h-5 w-5 text-sky-600" />

          <div className="mt-4 text-2xl font-black">
            {dependentCount}
          </div>

          <div className="mt-1 text-[10px] font-extrabold uppercase text-slate-500">
            Dependants on page
          </div>

          <div className="mt-1 text-[10px] text-slate-400">
            Spouse, child or dependent
          </div>
        </div>
      </div>

      {/* MEMBER REGISTRY */}

      <Card
        title="Member registry"
        sub="Search and filter members through the current /members API."
        icon={Users}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />

            <input
              className={`${input} pl-9`}
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search policy, name, email or phone"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className={input}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | 'ALL'
                    | MemberStatus,
                )
              }
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="PENDING">
                Pending
              </option>
              <option value="SUSPENDED">
                Suspended
              </option>
              <option value="TERMINATED">
                Terminated
              </option>
            </select>

            <select
              className={input}
              value={relationship}
              onChange={(e) =>
                setRelationship(
                  e.target.value as
                    | 'ALL'
                    | Relationship,
                )
              }
            >
              <option value="ALL">
                All relationships
              </option>
              <option value="PRIMARY">
                Primary
              </option>
              <option value="SPOUSE">
                Spouse
              </option>
              <option value="CHILD">
                Child
              </option>
              <option value="DEPENDENT">
                Dependent
              </option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading members…
          </div>
        ) : members.length ? (
          <Table
            heads={[
              'Member',
              'Policy',
              'Plan',
              'Relationship',
              'Coverage',
              'Status',
              'Actions',
            ]}
            rows={members.map(
              (member) => [
                <button
                  key="member"
                  className="text-left"
                  onClick={() =>
                    void openDetails(
                      member,
                    )
                  }
                >
                  <div className="font-black text-slate-800 hover:text-[#1b7b68]">
                    {fullName(member)}
                  </div>

                  <div className="mt-0.5 text-[9px] text-slate-400">
                    {member.email}
                  </div>
                </button>,

                <div key="policy">
                  <div className="font-black">
                    {member.policyNumber}
                  </div>

                  <div className="text-[9px] text-slate-400">
                    {member.phone}
                  </div>
                </div>,

                <span
                  key="plan"
                  className="text-[10px]"
                >
                  {optionName(
                    member.healthPlanId,
                    healthPlans,
                  )}
                </span>,

                human(
                  member.relationship,
                ),

                <div key="coverage">
                  <div>
                    {dateOnly(
                      member.startDate,
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400">
                    to{' '}
                    {dateOnly(
                      member.endDate,
                    )}
                  </div>
                </div>,

                <StatusBadge
                  key="status"
                  value={member.status}
                />,

                <div
                  key="actions"
                  className="flex gap-1.5"
                >
                  <button
                    title="View"
                    className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
                    onClick={() =>
                      void openDetails(
                        member,
                      )
                    }
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>

                  <button
                    title="Edit"
                    className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50"
                    onClick={() =>
                      openEdit(member)
                    }
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>,
              ],
            )}
          />
        ) : (
          <EmptyState message="No members match the current filters." />
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] text-slate-400">
            Page {page} of {pages} · {total}{' '}
            total members
          </div>

          <div className="flex gap-2">
            <button
              className={secondary}
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage((value) =>
                  Math.max(
                    1,
                    value - 1,
                  ),
                )
              }
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <button
              className={secondary}
              disabled={
                page >= pages ||
                loading
              }
              onClick={() =>
                setPage((value) =>
                  Math.min(
                    pages,
                    value + 1,
                  ),
                )
              }
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* CAPABILITIES */}

      <Card
        title="Backend-aligned capabilities"
        sub="Actions exposed by the rebuilt member compatibility API."
        icon={ShieldCheck}
      >
        <div className="grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [
                'Eligibility',
                'Live eligibility check for a member.',
                BadgeCheck,
              ],
              [
                'Digital card',
                'Retrieve the HMO card issued by the registry.',
                CreditCard,
              ],
              [
                'Dependants',
                'View dependants attached to a primary member.',
                Users,
              ],
              [
                'Lifecycle',
                'Review auditable member history.',
                History,
              ],
              [
                'Renewal',
                'Extend coverage through the renewal endpoint.',
                CalendarDays,
              ],
              [
                'Status',
                'Activate, suspend or terminate coverage.',
                Activity,
              ],
              [
                'Profile',
                'Edit canonical member demographics and coverage.',
                UserRound,
              ],
              [
                'Audit identity',
                'All requests use the authenticated HMO context.',
                ShieldCheck,
              ],
            ] as Array<
              [
                string,
                string,
                React.ElementType,
              ]
            >
          ).map(
            ([
              title,
              description,
              Icon,
            ]) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <Icon className="h-4 w-4 text-[#1b7b68]" />

                <div className="mt-3 text-xs font-black">
                  {title}
                </div>

                <div className="mt-1 text-[10px] leading-5 text-slate-400">
                  {description}
                </div>
              </div>
            ),
          )}
        </div>
      </Card>

      {/* MEMBER FORM */}

      {formOpen && (
        <MemberFormModal
          open={formOpen}
          editing={editing}
          form={form}
          setForm={setForm}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) {
              setFormOpen(false);
            }
          }}
          onSave={() =>
            void saveMember()
          }
          healthPlans={healthPlans}
          providers={providers}
          parentMember={
            form.primaryMemberId
              ? primaryMembers.find(
                  (member) => member._id === form.primaryMemberId,
                ) || selected || null
              : null
          }
        />
      )}

      {/* MEMBER DETAILS */}

      {detailOpen && selected && (
        <MemberDetailsModal
          member={selected}
          loading={
            detailLoading || busy
          }
          eligibility={
            eligibility
          }
          dependents={
            dependents
          }
          history={history}
          card={card}
          onClose={() =>
            setDetailOpen(false)
          }
          onEdit={() => {
            setDetailOpen(false);
            openEdit(selected);
          }}
          onStatus={(nextStatus) => {
            if (nextStatus === 'SUSPENDED') {
              setSuspendReason('');
              setSuspendOpen(true);
              return;
            }
            void updateStatus(selected, nextStatus);
          }}
          onRenew={openRenew}
          onAddDependent={
            openAddDependent
          }
          healthPlans={
            healthPlans
          }
          primaryMembers={
            primaryMembers
          }
        />
      )}

      {/* SUSPENSION */}

      {suspendOpen && selected && (
        <Modal
          title="Suspend member"
          sub={`${selected.policyNumber} · ${fullName(selected)}`}
          onClose={() => {
            if (!busy) setSuspendOpen(false);
          }}
        >
          <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              A suspension reason is required before this member can be suspended.
            </div>

            <Field label="Suspension reason" required>
              <textarea
                className={input}
                rows={5}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this member..."
                autoFocus
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button className={secondary} onClick={() => setSuspendOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className={danger}
                onClick={() => void updateStatus(selected, 'SUSPENDED', suspendReason)}
                disabled={busy || !suspendReason.trim()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Suspend member
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* RENEWAL */}

      {renewOpen && selected && (
        <Modal
          title="Renew member"
          sub={`${selected.policyNumber} · ${fullName(
            selected,
          )}`}
          onClose={() => {
            if (!busy) {
              setRenewOpen(false);
            }
          }}
        >
          <div className="space-y-5 p-5">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
              Renewal is sent to{' '}
              <span className="font-black">
                POST /members/:id/renew
              </span>{' '}
              and requires an end date. The
              backend remains responsible for
              lifecycle and card behavior.
            </div>

            <Field
              label="New end date"
              required
            >
              <input
                className={input}
                type="date"
                value={renewEndDate}
                onChange={(e) =>
                  setRenewEndDate(
                    e.target.value,
                  )
                }
              />
            </Field>

            <Field label="Reason">
              <textarea
                className={input}
                rows={4}
                value={renewReason}
                onChange={(e) =>
                  setRenewReason(
                    e.target.value,
                  )
                }
                placeholder="Optional renewal reason"
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                className={secondary}
                onClick={() =>
                  setRenewOpen(false)
                }
                disabled={busy}
              >
                Cancel
              </button>

              <button
                className={primary}
                onClick={() =>
                  void renewMember()
                }
                disabled={
                  busy ||
                  !renewEndDate
                }
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}

                Renew coverage
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}