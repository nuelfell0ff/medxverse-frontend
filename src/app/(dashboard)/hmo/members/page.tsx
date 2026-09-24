'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  HeartPulse,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';

/* =========================================================
   LOCAL TYPES
   Everything stays in this file.
   ========================================================= */

type MemberPortalProfileInput = {
  preferredLanguage: string;
  preferredContactChannel: string;
  marketingConsent: boolean;
  healthDataConsent: boolean;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
};

type ProviderPortalProfileInput = {
  notificationEmail: string;
  notificationPhone: string;
  preferredContactChannel: string;
  claimsNotificationEnabled: boolean;
  paymentNotificationEnabled: boolean;
};

type Role = 'member' | 'provider';

/* =========================================================
   API CONFIG
   ========================================================= */

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://medxverse-backend.onrender.com/api/v1'
).replace(/\/+$/, '');

const input =
  'w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1b7b68] focus:ring-4 focus:ring-[#1b7b68]/10';

const primary =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1b7b68] px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50';

const secondary =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 disabled:opacity-50';

/* =========================================================
   AUTH TOKEN
   ========================================================= */

const tok = () => {
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

      if (typeof parsed === 'string') return parsed;
      if (parsed?.accessToken) return parsed.accessToken;
      if (parsed?.token) return parsed.token;
    } catch {
      return value;
    }
  }

  return null;
};

/* =========================================================
   API HELPER
   ========================================================= */

async function api(
  path: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  const token = tok();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        `Request failed (${response.status})`,
    );
  }

  return json?.data ?? json;
}

/* =========================================================
   HELPERS
   ========================================================= */

const arr = (value: any): any[] => {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.providers)) return value.providers;
  if (Array.isArray(value?.benefits)) return value.benefits;

  return [];
};

const money = (
  value: any,
  currency = 'NGN',
) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
  }).format(Number(value || 0));

const dt = (value: any) =>
  value
    ? new Date(value).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

const sid = (value: any) => {
  if (!value) return '—';

  const stringValue = String(value);

  return stringValue.length > 14
    ? `${stringValue.slice(0, 7)}…${stringValue.slice(-5)}`
    : stringValue;
};

const human = (value: any) =>
  String(value ?? '—')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

/* =========================================================
   UI COMPONENTS
   ========================================================= */

function Badge({ v }: { v: any }) {
  const status = String(
    v || 'UNKNOWN',
  ).toUpperCase();

  const className = [
    'ACTIVE',
    'ELIGIBLE',
    'APPROVED',
    'PAID',
    'COMPLETED',
    'ENROLLED',
  ].includes(status)
    ? 'bg-emerald-50 text-emerald-700'
    : [
          'PENDING',
          'SUBMITTED',
          'UNDER_REVIEW',
          'PROCESSING',
        ].includes(status)
      ? 'bg-amber-50 text-amber-700'
      : [
            'REJECTED',
            'DENIED',
            'TERMINATED',
            'SUSPENDED',
            'EXPIRED',
          ].includes(status)
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase ${className}`}
    >
      {human(status)}
    </span>
  );
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'teal',
}: any) {
  const className =
    {
      teal: 'bg-[#e8f5f3] text-[#1b7b68]',
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      blue: 'bg-sky-50 text-sky-700',
    }[tone as string] ||
    'bg-[#e8f5f3] text-[#1b7b68]';

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <span
        className={`inline-flex rounded-xl p-2.5 ${className}`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="mt-4 text-2xl font-black">
        {value}
      </div>

      <div className="mt-1 text-[10px] font-extrabold uppercase text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-[10px] text-slate-400">
        {detail}
      </div>
    </div>
  );
}

function Card({
  title,
  sub,
  icon: Icon,
  action,
  children,
}: any) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-[#e8f5f3] p-2 text-[#1b7b68]">
            <Icon className="h-4 w-4" />
          </span>

          <div>
            <h2 className="text-sm font-black">
              {title}
            </h2>

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

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Table({ heads, rows }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175 text-left">
        <thead className="bg-slate-50">
          <tr>
            {heads.map((head: string) => (
              <th
                key={head}
                className="px-4 py-3 text-[9px] font-extrabold uppercase text-slate-400"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.map(
            (row: any[], rowIndex: number) => (
              <tr
                key={rowIndex}
                className="hover:bg-slate-50/70"
              >
                {row.map(
                  (cell: any, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-xs text-slate-600"
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
      <span className="text-xs font-bold">
        {label}
      </span>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full ${
          value
            ? 'bg-[#1b7b68]'
            : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            value ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function Info({ label, value }: any) {
  return (
    <div>
      <div className="text-[9px] font-extrabold uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-black">
        {value || '—'}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function MemberProviderPortalPage() {
  const query =
    typeof window !== 'undefined'
      ? new URLSearchParams(
          window.location.search,
        )
      : null;

  const [role, setRole] = useState<Role>(
    query?.get('role') === 'provider'
      ? 'provider'
      : 'member',
  );

  const [hmoId, setHmoId] = useState(
    query?.get('hmoId') || '',
  );

  const [memberId, setMemberId] = useState(
    query?.get('memberId') || '',
  );

  const [providerId, setProviderId] =
    useState(
      query?.get('providerId') || '',
    );

  const [tab, setTab] =
    useState('overview');

  const [loading, setLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [dash, setDash] =
    useState<any>();

  const [profile, setProfile] =
    useState<any>();

  const [benefits, setBenefits] =
    useState<any>();

  const [providers, setProviders] =
    useState<any[]>([]);

  const [records, setRecords] =
    useState<any[]>([]);

  const [notifs, setNotifs] =
    useState<any[]>([]);

  const [members, setMembers] =
    useState<any[]>([]);

  const [claims, setClaims] =
    useState<any[]>([]);

  const [auths, setAuths] =
    useState<any[]>([]);

  const [settlements, setSettlements] =
    useState<any[]>([]);

  const [search, setSearch] =
    useState('');

  const [elig, setElig] =
    useState<any>();

  const [memberForm, setMemberForm] =
    useState({
      preferredLanguage: 'en',
      preferredContactChannel: 'EMAIL',
      marketingConsent: false,
      healthDataConsent: false,
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: '',
    });

  const [providerForm, setProviderForm] =
    useState({
      notificationEmail: '',
      notificationPhone: '',
      preferredContactChannel: 'EMAIL',
      claimsNotificationEnabled: true,
      paymentNotificationEnabled: true,
    });

  const [claim, setClaim] =
    useState({
      memberId: '',
      claimNumber: '',
      preAuthorizationId: '',
      diagnosis: '',
      icdCode: '',
      treatmentDate: '',
      notes: '',
      serviceCode: '',
      serviceName: '',
      quantity: '1',
      unitAmount: '',
      claimedAmount: '',
    });

  const [preauth, setPreauth] =
    useState({
      memberId: '',
      benefitId: '',
      benefitCode: '',
      serviceCode: '',
      serviceName: '',
      diagnosisCodes: '',
      requestedAmount: '',
      requestedDate: '',
      clinicalNotes: '',
      referralProviderId: '',
    });

  const memberBase =
    `/hmo-portals/member/${hmoId}/${memberId}`;

  const providerBase =
    `/hmo-portals/provider/${hmoId}/${providerId}`;

  /* =======================================================
     MEMBER LOAD
     ======================================================= */

  const loadMember = useCallback(
    async () => {
      if (!hmoId || !memberId) return;

      setLoading(true);
      setError('');

      try {
        const [
          dashboard,
          memberProfile,
          memberBenefits,
          memberProviders,
          notifications,
        ] = await Promise.all([
          api(`${memberBase}/dashboard`),
          api(`${memberBase}/profile`),
          api(`${memberBase}/benefits`),
          api(
            `${memberBase}/providers?page=1&limit=100`,
          ),
          api(`${memberBase}/notifications`),
        ]);

        setDash(dashboard);
        setProfile(memberProfile);
        setBenefits(memberBenefits);
        setProviders(
          arr(memberProviders),
        );
        setNotifs(
          arr(notifications),
        );

        const portalProfile =
          memberProfile?.portalProfile;

        if (portalProfile) {
          setMemberForm({
            preferredLanguage:
              portalProfile.preferredLanguage ||
              'en',

            preferredContactChannel:
              portalProfile.preferredContactChannel ||
              'EMAIL',

            marketingConsent:
              !!portalProfile.marketingConsent,

            healthDataConsent:
              !!portalProfile.healthDataConsent,

            emergencyName:
              portalProfile.emergencyContact
                ?.name || '',

            emergencyPhone:
              portalProfile.emergencyContact
                ?.phone || '',

            emergencyRelationship:
              portalProfile.emergencyContact
                ?.relationship || '',
          });
        }
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to load member portal',
        );
      } finally {
        setLoading(false);
      }
    },
    [hmoId, memberId, memberBase],
  );

  /* =======================================================
     PROVIDER LOAD
     ======================================================= */

  const loadProvider = useCallback(
    async () => {
      if (!hmoId || !providerId) return;

      setLoading(true);
      setError('');

      try {
        const [
          dashboard,
          providerProfile,
        ] = await Promise.all([
          api(`${providerBase}/dashboard`),
          api(`${providerBase}/profile`),
        ]);

        setDash(dashboard);
        setProfile(providerProfile);

        const portalProfile =
          providerProfile?.portalProfile;

        if (portalProfile) {
          setProviderForm({
            notificationEmail:
              portalProfile.notificationEmail ||
              '',

            notificationPhone:
              portalProfile.notificationPhone ||
              '',

            preferredContactChannel:
              portalProfile.preferredContactChannel ||
              'EMAIL',

            claimsNotificationEnabled:
              portalProfile.claimsNotificationEnabled !==
              false,

            paymentNotificationEnabled:
              portalProfile.paymentNotificationEnabled !==
              false,
          });
        }
      } catch (err: any) {
        setError(
          err.message ||
            'Unable to load provider portal',
        );
      } finally {
        setLoading(false);
      }
    },
    [hmoId, providerId, providerBase],
  );

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    setTab('overview');

    if (role === 'member') {
      void loadMember();
    } else {
      void loadProvider();
    }
  }, [
    role,
    loadMember,
    loadProvider,
  ]);

  /* =======================================================
     MEMBER RECORDS
     ======================================================= */

  const loadMemberRecords =
    useCallback(
      async (type: string) => {
        try {
          const result = await api(
            `${memberBase}/records/${type}`,
          );

          setRecords(arr(result));
        } catch (err: any) {
          setError(
            err.message ||
              'Unable to load records',
          );
        }
      },
      [memberBase],
    );

  useEffect(() => {
    if (
      role === 'member' &&
      [
        'claims',
        'authorizations',
        'invoices',
        'utilization',
      ].includes(tab)
    ) {
      void loadMemberRecords(
        tab === 'authorizations'
          ? 'preAuths'
          : tab,
      );
    }
  }, [
    role,
    tab,
    loadMemberRecords,
  ]);

  /* =======================================================
     PROVIDER DATA
     ======================================================= */

  const loadProviderData =
    useCallback(
      async (type: string) => {
        try {
          if (type === 'members') {
            const result = await api(
              `${providerBase}/members?page=1&limit=100${
                search
                  ? `&search=${encodeURIComponent(
                      search,
                    )}`
                  : ''
              }`,
            );

            setMembers(arr(result));
          }

          if (type === 'claims') {
            const result = await api(
              `${providerBase}/claims?page=1&limit=100`,
            );

            setClaims(arr(result));
          }

          if (type === 'authorizations') {
            const result = await api(
              `${providerBase}/authorizations?page=1&limit=100`,
            );

            setAuths(arr(result));
          }

          if (type === 'settlements') {
            const result = await api(
              `${providerBase}/settlements?page=1&limit=100`,
            );

            setSettlements(arr(result));
          }
        } catch (err: any) {
          setError(
            err.message ||
              'Unable to load provider data',
          );
        }
      },
      [providerBase, search],
    );

  useEffect(() => {
    if (
      role === 'provider' &&
      tab !== 'overview' &&
      tab !== 'profile'
    ) {
      void loadProviderData(tab);
    }
  }, [
    role,
    tab,
    loadProviderData,
  ]);

  /* =======================================================
     SAVE MEMBER
     ======================================================= */

  const saveMember = async () => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const payload: MemberPortalProfileInput =
        {
          preferredLanguage:
            memberForm.preferredLanguage,

          preferredContactChannel:
            memberForm.preferredContactChannel,

          marketingConsent:
            memberForm.marketingConsent,

          healthDataConsent:
            memberForm.healthDataConsent,

          emergencyContact: {
            name: memberForm.emergencyName,
            phone: memberForm.emergencyPhone,
            relationship:
              memberForm.emergencyRelationship,
          },
        };

      await api(`${memberBase}/profile`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess(
        'Member profile saved.',
      );

      await loadMember();
    } catch (err: any) {
      setError(
        err.message || 'Save failed',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     SAVE PROVIDER
     ======================================================= */

  const saveProvider = async () => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const payload: ProviderPortalProfileInput =
        {
          notificationEmail:
            providerForm.notificationEmail,

          notificationPhone:
            providerForm.notificationPhone,

          preferredContactChannel:
            providerForm.preferredContactChannel,

          claimsNotificationEnabled:
            providerForm.claimsNotificationEnabled,

          paymentNotificationEnabled:
            providerForm.paymentNotificationEnabled,
        };

      await api(`${providerBase}/profile`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccess(
        'Provider profile saved.',
      );

      await loadProvider();
    } catch (err: any) {
      setError(
        err.message || 'Save failed',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     ELIGIBILITY
     ======================================================= */

  const eligibility = async () => {
    if (!search.trim()) return;

    setBusy(true);
    setError('');

    try {
      const result = await api(
        `${providerBase}/members/${search.trim()}/eligibility`,
      );

      setElig(result);
    } catch (err: any) {
      setError(
        err.message ||
          'Eligibility check failed',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     CREATE CLAIM
     ======================================================= */

  const createClaim = async () => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await api(`${providerBase}/claims`, {
        method: 'POST',
        body: JSON.stringify({
          memberId: claim.memberId,

          claimNumber:
            claim.claimNumber || undefined,

          preAuthorizationId:
            claim.preAuthorizationId ||
            undefined,

          diagnosis: claim.diagnosis,

          icdCode: claim.icdCode,

          treatmentDate:
            claim.treatmentDate,

          notes: claim.notes,

          items: [
            {
              serviceCode:
                claim.serviceCode,

              serviceName:
                claim.serviceName,

              quantity: Number(
                claim.quantity || 1,
              ),

              unitAmount: Number(
                claim.unitAmount || 0,
              ),

              claimedAmount:
                claim.claimedAmount
                  ? Number(
                      claim.claimedAmount,
                    )
                  : undefined,
            },
          ],
        }),
      });

      setSuccess(
        'Claim submitted.',
      );

      await loadProviderData(
        'claims',
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Claim submission failed',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     CREATE AUTHORIZATION
     ======================================================= */

  const createAuth = async () => {
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await api(
        `${providerBase}/authorizations`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...preauth,

            diagnosisCodes:
              preauth.diagnosisCodes
                .split(',')
                .map(
                  (value) =>
                    value.trim(),
                )
                .filter(Boolean),

            requestedAmount:
              Number(
                preauth.requestedAmount ||
                  0,
              ),

            benefitId:
              preauth.benefitId ||
              undefined,

            referralProviderId:
              preauth.referralProviderId ||
              undefined,
          }),
        },
      );

      setSuccess(
        'Pre-authorization submitted.',
      );

      await loadProviderData(
        'authorizations',
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Authorization submission failed',
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     TABS
     ======================================================= */

  const tabs =
    role === 'member'
      ? [
          [
            'overview',
            'Overview',
            Activity,
          ],
          [
            'profile',
            'Profile',
            UserRound,
          ],
          [
            'benefits',
            'Benefits',
            HeartPulse,
          ],
          [
            'providers',
            'Providers',
            MapPin,
          ],
          [
            'claims',
            'Claims',
            FileText,
          ],
          [
            'authorizations',
            'Authorizations',
            ShieldCheck,
          ],
          [
            'invoices',
            'Invoices',
            CreditCard,
          ],
          [
            'utilization',
            'Utilization',
            Activity,
          ],
          [
            'notifications',
            'Notifications',
            Bell,
          ],
        ]
      : [
          [
            'overview',
            'Overview',
            Activity,
          ],
          [
            'profile',
            'Profile',
            UserRound,
          ],
          [
            'members',
            'Members',
            Users,
          ],
          [
            'claims',
            'Claims',
            FileText,
          ],
          [
            'authorizations',
            'Authorizations',
            ShieldCheck,
          ],
          [
            'settlements',
            'Settlements',
            WalletCards,
          ],
        ];

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-full space-y-6 bg-slate-50/50 p-1 text-slate-800">
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
            onClick={() => {
              setError('');
              setSuccess('');
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">
                {role === 'member'
                  ? 'Member Portal'
                  : 'Provider Portal'}
              </h1>

              <span className="rounded-full bg-[#e8f5f3] px-2.5 py-1 text-[9px] font-extrabold text-[#1b7b68]">
                HMO
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {role === 'member'
                ? 'Coverage, benefits, providers, claims and utilization.'
                : 'Eligibility, claims, authorizations and settlements.'}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className={
                role === 'member'
                  ? primary
                  : secondary
              }
              onClick={() =>
                setRole('member')
              }
            >
              <UserRound className="h-3.5 w-3.5" />
              Member
            </button>

            <button
              className={
                role === 'provider'
                  ? primary
                  : secondary
              }
              onClick={() =>
                setRole('provider')
              }
            >
              <Users className="h-3.5 w-3.5" />
              Provider
            </button>

            <button
              className={secondary}
              onClick={() =>
                role === 'member'
                  ? loadMember()
                  : loadProvider()
              }
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

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Field label="HMO ID">
            <input
              className={input}
              value={hmoId}
              onChange={(event) =>
                setHmoId(event.target.value)
              }
              placeholder="MongoDB HMO ID"
            />
          </Field>

          <Field
            label={
              role === 'member'
                ? 'Member ID'
                : 'Provider ID'
            }
          >
            <input
              className={input}
              value={
                role === 'member'
                  ? memberId
                  : providerId
              }
              onChange={(event) => {
                if (role === 'member') {
                  setMemberId(
                    event.target.value,
                  );
                } else {
                  setProviderId(
                    event.target.value,
                  );
                }
              }}
              placeholder="MongoDB ID"
            />
          </Field>

          <button
            className={`${primary} h-10.5 w-full self-end`}
            disabled={
              loading ||
              !hmoId ||
              (role === 'member'
                ? !memberId
                : !providerId)
            }
            onClick={() =>
              role === 'member'
                ? loadMember()
                : loadProvider()
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Load portal
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
        {tabs.map(
          ([id, label, Icon]: any) => (
            <button
              key={id}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[10px] font-extrabold ${
                tab === id
                  ? 'bg-[#1b7b68] text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              onClick={() =>
                setTab(id)
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ),
        )}
      </div>

      {role === 'member' ? (
        <MemberView
          tab={tab}
          dash={dash}
          profile={profile}
          benefits={benefits}
          providers={providers}
          records={records}
          notifs={notifs}
          memberForm={memberForm}
          setMemberForm={setMemberForm}
          saveMember={saveMember}
          busy={busy}
          search={search}
          setSearch={setSearch}
        />
      ) : (
        <ProviderView
          tab={tab}
          dash={dash}
          profile={profile}
          providerForm={providerForm}
          setProviderForm={
            setProviderForm
          }
          saveProvider={saveProvider}
          busy={busy}
          members={members}
          claims={claims}
          auths={auths}
          settlements={settlements}
          search={search}
          setSearch={setSearch}
          elig={elig}
          eligibility={eligibility}
          claim={claim}
          setClaim={setClaim}
          createClaim={createClaim}
          preauth={preauth}
          setPreauth={setPreauth}
          createAuth={createAuth}
        />
      )}
    </div>
  );
}

/* =========================================================
   MEMBER VIEW
   ========================================================= */

function MemberView({
  tab,
  dash,
  profile,
  benefits,
  providers,
  records,
  notifs,
  memberForm,
  setMemberForm,
  saveMember,
  busy,
  search,
  setSearch,
}: any) {
  const name =
    dash?.member?.name ||
    profile?.member?.name ||
    'Member';

  return (
    <>
      {tab === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Claims"
              value={
                dash?.metrics?.claimCount ||
                0
              }
              detail="All member claims"
              icon={FileText}
            />

            <Kpi
              label="Pending claims"
              value={
                dash?.metrics
                  ?.pendingClaims || 0
              }
              detail="Awaiting processing"
              icon={Clock3}
              tone="amber"
            />

            <Kpi
              label="Authorizations"
              value={
                dash?.metrics
                  ?.preAuthCount || 0
              }
              detail="Requests"
              icon={ShieldCheck}
              tone="blue"
            />

            <Kpi
              label="Utilization"
              value={
                dash?.metrics
                  ?.utilizationCount || 0
              }
              detail="Events"
              icon={Activity}
              tone="green"
            />
          </div>

          <Card
            title={name}
            sub="Coverage summary"
            icon={UserRound}
          >
            <div className="grid gap-5 p-5 md:grid-cols-4">
              <Info
                label="Policy"
                value={
                  dash?.member
                    ?.policyNumber
                }
              />

              <Info
                label="Status"
                value={
                  <Badge
                    v={
                      dash?.member
                        ?.status
                    }
                  />
                }
              />

              <Info
                label="Plan"
                value={sid(
                  dash?.member?.planId,
                )}
              />

              <Info
                label="Coverage"
                value={`${dt(
                  dash?.member
                    ?.effectiveFrom,
                )} — ${dt(
                  dash?.member
                    ?.effectiveTo,
                )}`}
              />
            </div>
          </Card>
        </>
      )}

      {tab === 'profile' && (
        <Card
          title="Member profile"
          sub="Preferences and emergency contact"
          icon={UserRound}
          action={
            <button
              className={primary}
              onClick={saveMember}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save
            </button>
          }
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="Language">
              <input
                className={input}
                value={
                  memberForm.preferredLanguage
                }
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    preferredLanguage:
                      event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Contact channel">
              <select
                className={input}
                value={
                  memberForm.preferredContactChannel
                }
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    preferredContactChannel:
                      event.target.value,
                  })
                }
              >
                {[
                  'EMAIL',
                  'SMS',
                  'PHONE',
                  'PUSH',
                ].map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Toggle
              label="Marketing consent"
              value={
                memberForm.marketingConsent
              }
              onChange={(value) =>
                setMemberForm({
                  ...memberForm,
                  marketingConsent: value,
                })
              }
            />

            <Toggle
              label="Health-data consent"
              value={
                memberForm.healthDataConsent
              }
              onChange={(value) =>
                setMemberForm({
                  ...memberForm,
                  healthDataConsent: value,
                })
              }
            />

            <Field label="Emergency name">
              <input
                className={input}
                value={
                  memberForm.emergencyName
                }
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    emergencyName:
                      event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Emergency phone">
              <input
                className={input}
                value={
                  memberForm.emergencyPhone
                }
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    emergencyPhone:
                      event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Relationship">
              <input
                className={input}
                value={
                  memberForm.emergencyRelationship
                }
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    emergencyRelationship:
                      event.target.value,
                  })
                }
              />
            </Field>
          </div>
        </Card>
      )}

      {tab === 'benefits' && (
        <Card
          title="Benefits & plan"
          sub="Current plan and benefits"
          icon={HeartPulse}
        >
          <div className="p-5">
            <div className="rounded-3xl bg-[#e8f5f3]/60 p-5">
              <div className="text-[9px] font-extrabold uppercase text-[#1b7b68]">
                Plan
              </div>

              <div className="mt-1 text-lg font-black">
                {benefits?.plan?.name ||
                  benefits?.plan?.code ||
                  'No plan found'}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(benefits?.benefits ||
                []).map(
                (benefit: any) => (
                  <div
                    key={String(
                      benefit._id,
                    )}
                    className="rounded-2xl border border-slate-100 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs font-black">
                          {benefit.name ||
                            benefit.code ||
                            'Benefit'}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          {benefit.category ||
                            'General'}
                        </div>
                      </div>

                      <Badge
                        v={
                          benefit.status ||
                          'ACTIVE'
                        }
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </Card>
      )}

      {tab === 'providers' && (
        <Card
          title="Network providers"
          sub="HMO provider directory"
          icon={MapPin}
        >
          <div className="p-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />

              <input
                className={`${input} pl-9`}
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search provider, specialty or city"
              />
            </div>
          </div>

          <Table
            heads={[
              'Provider',
              'Type',
              'Specialty',
              'Location',
              'Status',
            ]}
            rows={providers
              .filter(
                (provider: any) =>
                  [
                    provider.name,
                    provider.code,
                    provider.providerType,
                    provider.specialty,
                    provider.city,
                  ]
                    .join(' ')
                    .toLowerCase()
                    .includes(
                      search.toLowerCase(),
                    ),
              )
              .map((provider: any) => [
                <div key="name">
                  <div className="font-black">
                    {provider.name ||
                      'Provider'}
                  </div>

                  <div className="font-mono text-[9px] text-slate-400">
                    {sid(
                      provider._id,
                    )}
                  </div>
                </div>,

                provider.providerType ||
                  '—',

                provider.specialty ||
                  '—',

                [
                  provider.city,
                  provider.state,
                ]
                  .filter(Boolean)
                  .join(', ') ||
                  provider.address ||
                  '—',

                <Badge
                  key="status"
                  v={
                    provider.status ||
                    provider.accreditationStatus ||
                    'ACTIVE'
                  }
                />,
              ])}
          />
        </Card>
      )}

      {[
        'claims',
        'authorizations',
        'invoices',
        'utilization',
      ].includes(tab) && (
        <Card
          title={human(tab)}
          sub="Live member records"
          icon={
            tab === 'utilization'
              ? Activity
              : FileText
          }
        >
          <Table
            heads={[
              'Reference',
              'Status',
              'Description',
              'Date',
              'Amount',
            ]}
            rows={records.map(
              (record: any) => [
                sid(
                  record._id ||
                    record.claimNumber ||
                    record.authorizationNumber ||
                    record.invoiceNumber,
                ),

                <Badge
                  key="status"
                  v={record.status}
                />,

                record.serviceName ||
                  record.description ||
                  record.serviceCode ||
                  record.category ||
                  '—',

                dt(
                  record.createdAt ||
                    record.serviceDate ||
                    record.treatmentDate ||
                    record.requestedDate,
                ),

                money(
                  record.totalClaimedAmount ??
                    record.requestedAmount ??
                    record.totalAmount ??
                    record.amount,
                ),
              ],
            )}
          />

          {!records.length && (
            <div className="p-10 text-center text-xs text-slate-400">
              No records found.
            </div>
          )}
        </Card>
      )}

      {tab === 'notifications' && (
        <Card
          title="Notifications"
          sub="Member messages"
          icon={Bell}
        >
          <div className="divide-y divide-slate-100">
            {notifs.map(
              (notification: any) => (
                <div
                  key={String(
                    notification._id,
                  )}
                  className="p-5"
                >
                  <div className="text-sm font-black">
                    {notification.title}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {notification.message}
                  </div>

                  <div className="mt-2 text-[9px] text-slate-400">
                    {dt(
                      notification.createdAt,
                    )}
                  </div>
                </div>
              ),
            )}

            {!notifs.length && (
              <div className="p-10 text-center text-xs text-slate-400">
                No notifications.
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

/* =========================================================
   PROVIDER VIEW
   ========================================================= */

function ProviderView({
  tab,
  dash,
  profile,
  providerForm,
  setProviderForm,
  saveProvider,
  busy,
  members,
  claims,
  auths,
  settlements,
  search,
  setSearch,
  elig,
  eligibility,
  claim,
  setClaim,
  createClaim,
  preauth,
  setPreauth,
  createAuth,
}: any) {
  return (
    <>
      {tab === 'overview' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Claims"
              value={
                dash?.metrics?.claimCount ||
                0
              }
              detail="Provider claims"
              icon={FileText}
            />

            <Kpi
              label="Pending"
              value={
                dash?.metrics
                  ?.pendingClaims || 0
              }
              detail="Awaiting action"
              icon={Clock3}
              tone="amber"
            />

            <Kpi
              label="Authorizations"
              value={
                dash?.metrics
                  ?.preAuthCount || 0
              }
              detail="Requests"
              icon={ShieldCheck}
              tone="blue"
            />

            <Kpi
              label="Settlements"
              value={money(
                dash?.metrics
                  ?.settlementTotal,
              )}
              detail="Settlement value"
              icon={WalletCards}
              tone="green"
            />
          </div>

          <Card
            title={
              dash?.provider?.name ||
              profile?.provider?.name ||
              'Provider'
            }
            sub="Provider summary"
            icon={UserRound}
          >
            <div className="grid gap-5 p-5 md:grid-cols-4">
              <Info
                label="Code"
                value={
                  dash?.provider?.code
                }
              />

              <Info
                label="Type"
                value={
                  dash?.provider
                    ?.providerType
                }
              />

              <Info
                label="Status"
                value={
                  <Badge
                    v={
                      dash?.provider
                        ?.status
                    }
                  />
                }
              />

              <Info
                label="Provider ID"
                value={sid(
                  dash?.provider?.id,
                )}
              />
            </div>
          </Card>
        </>
      )}

      {tab === 'profile' && (
        <Card
          title="Provider profile"
          sub="Notification preferences"
          icon={UserRound}
          action={
            <button
              className={primary}
              onClick={saveProvider}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Save
            </button>
          }
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <Field label="Email">
              <input
                className={input}
                value={
                  providerForm.notificationEmail
                }
                onChange={(event) =>
                  setProviderForm({
                    ...providerForm,
                    notificationEmail:
                      event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Phone">
              <input
                className={input}
                value={
                  providerForm.notificationPhone
                }
                onChange={(event) =>
                  setProviderForm({
                    ...providerForm,
                    notificationPhone:
                      event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Contact channel">
              <select
                className={input}
                value={
                  providerForm.preferredContactChannel
                }
                onChange={(event) =>
                  setProviderForm({
                    ...providerForm,
                    preferredContactChannel:
                      event.target.value,
                  })
                }
              >
                {[
                  'EMAIL',
                  'SMS',
                  'PHONE',
                  'PUSH',
                ].map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <div className="space-y-3">
              <Toggle
                label="Claims notifications"
                value={
                  providerForm.claimsNotificationEnabled
                }
                onChange={(value) =>
                  setProviderForm({
                    ...providerForm,
                    claimsNotificationEnabled:
                      value,
                  })
                }
              />

              <Toggle
                label="Payment notifications"
                value={
                  providerForm.paymentNotificationEnabled
                }
                onChange={(value) =>
                  setProviderForm({
                    ...providerForm,
                    paymentNotificationEnabled:
                      value,
                  })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {tab === 'members' && (
        <>
          <Card
            title="Provider member search"
            sub="Find members and verify eligibility"
            icon={Users}
          >
            <div className="flex gap-2 p-4">
              <input
                className={input}
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Member ID, name, policy, email or phone"
              />

              <button
                className={primary}
                onClick={eligibility}
                disabled={
                  !search.trim() || busy
                }
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Check ID
              </button>
            </div>

            <Table
              heads={[
                'Member',
                'Policy',
                'Status',
                'Contact',
              ]}
              rows={members.map(
                (member: any) => [
                  <div key="name">
                    <div className="font-black">
                      {member.name ||
                        [
                          member.firstName,
                          member.lastName,
                        ]
                          .filter(Boolean)
                          .join(' ') ||
                        'Member'}
                    </div>

                    <div className="font-mono text-[9px] text-slate-400">
                      {sid(member._id)}
                    </div>
                  </div>,

                  member.policyNumber ||
                    member.membershipNumber ||
                    member.memberNumber ||
                    '—',

                  <Badge
                    key="status"
                    v={member.status}
                  />,

                  [
                    member.phone,
                    member.email,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—',
                ],
              )}
            />

            {!members.length && (
              <div className="p-10 text-center text-xs text-slate-400">
                No members loaded. Search from the backend to populate this list.
              </div>
            )}
          </Card>

          {elig && (
            <Card
              title="Eligibility result"
              sub="Current HMO coverage check"
              icon={ShieldCheck}
            >
              <div
                className={`m-5 rounded-2xl border p-4 ${
                  elig.eligible
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div className="font-black">
                  {elig.eligible
                    ? 'Eligible'
                    : 'Not eligible'}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {elig.reason}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'claims' && (
        <>
          <Card
            title="Provider claims"
            sub="Submitted claims"
            icon={FileText}
          >
            <Table
              heads={[
                'Claim',
                'Member',
                'Status',
                'Date',
                'Amount',
              ]}
              rows={claims.map(
                (item: any) => [
                  item.claimNumber ||
                    sid(item._id),

                  sid(item.memberId),

                  <Badge
                    key="status"
                    v={item.status}
                  />,

                  dt(
                    item.treatmentDate,
                  ),

                  money(
                    item.totalClaimedAmount,
                  ),
                ],
              )}
            />

            {!claims.length && (
              <div className="p-10 text-center text-xs text-slate-400">
                No claims found.
              </div>
            )}
          </Card>

          <Card
            title="Submit claim"
            sub="CreateProviderClaimInput"
            icon={Send}
          >
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Member ID">
                <input
                  className={input}
                  value={claim.memberId}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      memberId:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Treatment date">
                <input
                  className={input}
                  type="date"
                  value={
                    claim.treatmentDate
                  }
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      treatmentDate:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Claim number">
                <input
                  className={input}
                  value={claim.claimNumber}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      claimNumber:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Pre-authorization ID">
                <input
                  className={input}
                  value={
                    claim.preAuthorizationId
                  }
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      preAuthorizationId:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Diagnosis">
                <input
                  className={input}
                  value={claim.diagnosis}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      diagnosis:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="ICD code">
                <input
                  className={input}
                  value={claim.icdCode}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      icdCode:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Service code">
                <input
                  className={input}
                  value={claim.serviceCode}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      serviceCode:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Service name">
                <input
                  className={input}
                  value={claim.serviceName}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      serviceName:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Quantity">
                <input
                  className={input}
                  type="number"
                  min="1"
                  value={claim.quantity}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      quantity:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Unit amount">
                <input
                  className={input}
                  type="number"
                  min="0"
                  value={claim.unitAmount}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      unitAmount:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Claimed amount">
                <input
                  className={input}
                  type="number"
                  min="0"
                  value={
                    claim.claimedAmount
                  }
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      claimedAmount:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Notes">
                <textarea
                  className={input}
                  rows={3}
                  value={claim.notes}
                  onChange={(event) =>
                    setClaim({
                      ...claim,
                      notes:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <div className="flex justify-end md:col-span-2">
                <button
                  className={primary}
                  onClick={createClaim}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit claim
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {tab === 'authorizations' && (
        <>
          <Card
            title="Authorizations"
            sub="Submitted pre-authorization requests"
            icon={ShieldCheck}
          >
            <Table
              heads={[
                'Service',
                'Member',
                'Status',
                'Requested',
                'Amount',
              ]}
              rows={auths.map(
                (authorization: any) => [
                  authorization.serviceName ||
                    authorization.serviceCode ||
                    'Service',

                  sid(
                    authorization.memberId,
                  ),

                  <Badge
                    key="status"
                    v={
                      authorization.status
                    }
                  />,

                  dt(
                    authorization.requestedDate,
                  ),

                  money(
                    authorization.requestedAmount,
                  ),
                ],
              )}
            />

            {!auths.length && (
              <div className="p-10 text-center text-xs text-slate-400">
                No authorization requests found.
              </div>
            )}
          </Card>

          <Card
            title="New authorization"
            sub="CreateProviderAuthorizationInput"
            icon={Send}
          >
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Member ID">
                <input
                  className={input}
                  value={preauth.memberId}
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      memberId:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Benefit ID">
                <input
                  className={input}
                  value={preauth.benefitId}
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      benefitId:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Benefit code">
                <input
                  className={input}
                  value={
                    preauth.benefitCode
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      benefitCode:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Service code">
                <input
                  className={input}
                  value={
                    preauth.serviceCode
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      serviceCode:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Service name">
                <input
                  className={input}
                  value={
                    preauth.serviceName
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      serviceName:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Diagnosis codes">
                <input
                  className={input}
                  value={
                    preauth.diagnosisCodes
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      diagnosisCodes:
                        event.target.value,
                    })
                  }
                  placeholder="ICD10-A, ICD10-B"
                />
              </Field>

              <Field label="Requested amount">
                <input
                  className={input}
                  type="number"
                  min="0"
                  value={
                    preauth.requestedAmount
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      requestedAmount:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Requested date">
                <input
                  className={input}
                  type="date"
                  value={
                    preauth.requestedDate
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      requestedDate:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Referral provider ID">
                <input
                  className={input}
                  value={
                    preauth.referralProviderId
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      referralProviderId:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Clinical notes">
                <textarea
                  className={input}
                  rows={3}
                  value={
                    preauth.clinicalNotes
                  }
                  onChange={(event) =>
                    setPreauth({
                      ...preauth,
                      clinicalNotes:
                        event.target.value,
                    })
                  }
                />
              </Field>

              <div className="flex justify-end md:col-span-2">
                <button
                  className={primary}
                  onClick={createAuth}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit authorization
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {tab === 'settlements' && (
        <Card
          title="Settlements"
          sub="Provider settlement records"
          icon={WalletCards}
        >
          <Table
            heads={[
              'Settlement',
              'Status',
              'Amount',
              'Created',
            ]}
            rows={settlements.map(
              (settlement: any) => [
                settlement.referenceNumber ||
                  settlement.settlementNumber ||
                  sid(settlement._id),

                <Badge
                  key="status"
                  v={settlement.status}
                />,

                money(
                  settlement.amount ??
                    settlement.totalAmount,
                ),

                dt(
                  settlement.createdAt,
                ),
              ],
            )}
          />

          {!settlements.length && (
            <div className="p-10 text-center text-xs text-slate-400">
              No settlements found.
            </div>
          )}
        </Card>
      )}
    </>
  );
}