'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { staffWorkService } from '@/services/staff-work.service';
import { WorkActivity, WorkModuleKey } from '@/types/staff-work';

const modules: WorkModuleKey[] = ['outpatient','surgery','radiology','lab','appointments','pharmacy','emergency','icu','bed_ward'];

const moduleLabels: Record<WorkModuleKey, string> = {
  patients: 'Patients EMR',
  emergency: 'Emergency',
  icu: 'ICU',
  bed_ward: 'Bed & Ward',
  outpatient: 'Outpatient',
  surgery: 'Surgery & OT',
  radiology: 'Radiology',
  lab: 'Laboratory',
  appointments: 'Appointments',
  pharmacy: 'Pharmacy',
  rostering: 'Staff Rostering',
  other: 'Other',
};

function label(value?: string) {
  return (value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function detailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? `${value.length} item${value.length === 1 ? '' : 's'}` : 'None';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default function StaffActivityPage() {
  const [items, setItems] = useState<WorkActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState<WorkModuleKey | ''>('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WorkActivity | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await staffWorkService.getActivity({
        limit: 100,
        ...(module ? { module } : {}),
        ...(status ? { status } : {}),
      });
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your work activity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [module, status]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [
      item.title,
      item.summary,
      item.sourceModule,
      item.sourceType,
      item.patient?.name,
      item.patient?.mrn,
    ].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkActivity[]>();
    visible.forEach((item) => {
      const key = new Date(item.occurredAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      map.set(key, [...(map.get(key) || []), item]);
    });
    return Array.from(map.entries());
  }, [visible]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[#1b7b68]"><Activity className="h-4 w-4" /><p className="text-[9px] font-bold uppercase tracking-[0.22em]">Read-only clinical workspace</p></div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Work Activity</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">A single timeline of hospital activity connected to your staff role. This view does not edit the underlying HMS records.</p>
          </div>
          <button type="button" onClick={() => void load()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-[#1b7b68]/30 hover:text-[#1b7b68]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {modules.map((item) => <button key={item} type="button" onClick={() => setModule(module === item ? '' : item)} className={`rounded-full border px-3 py-2 text-[9px] font-bold uppercase tracking-wider ${module === item ? 'border-[#1b7b68] bg-[#e8f5f3] text-[#1b7b68]' : 'border-slate-200 bg-white text-slate-500 hover:border-[#1b7b68]/30'}`}>{moduleLabels[item]}</button>)}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your activity..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs outline-none focus:border-[#1b7b68]/40" /></div>
        <div className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-8 text-xs outline-none sm:w-48"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option><option value="SCHEDULED">Scheduled</option><option value="CANCELLED">Cancelled</option></select></div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {loading ? <div className="rounded-2xl border border-slate-100 bg-white p-14 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1b7b68]" /><p className="mt-3 text-xs text-slate-400">Loading clinical activity...</p></div> : grouped.length ? (
        <div className="space-y-7">
          {grouped.map(([date, activities]) => <section key={date}><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><CalendarDays className="h-3.5 w-3.5" />{date}</div><div className="relative ml-2 border-l border-slate-200 pl-6">{activities.map((item) => <button type="button" key={item.id} onClick={() => setSelected(item)} className="group relative mb-3 block w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-[#1b7b68]/20 hover:shadow-md"><span className="absolute -left-[31px] top-6 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#1b7b68] ring-1 ring-[#1b7b68]/20" /><div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold uppercase text-[#1b7b68]">{moduleLabels[item.sourceModule]}</span>{item.status && <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-500">{label(item.status)}</span>}<span className="text-[9px] text-slate-400">{formatDate(item.occurredAt)}</span></div><h2 className="mt-2 text-sm font-bold text-slate-800">{item.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{item.summary}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400">{item.patient?.name && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{item.patient.name}{item.patient.mrn ? ` · ${item.patient.mrn}` : ''}</span>}<span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Read-only</span></div></div><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#1b7b68]" /></div></button>)}</div></section>)}
        </div>
      ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center"><Activity className="mx-auto h-9 w-9 text-slate-200" /><h2 className="mt-3 text-sm font-bold text-slate-700">No activity found</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">Relevant clinical and operational records will appear here when your staff account is connected to them.</p></div>}

      {selected && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/25 backdrop-blur-sm"><button type="button" className="absolute inset-0" onClick={() => setSelected(null)} aria-label="Close" /><aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">{moduleLabels[selected.sourceModule]} · Read-only</p><h2 className="mt-1 text-lg font-bold text-slate-800">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X className="h-5 w-5" /></button></div><div className="space-y-4 pt-5"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs leading-5 text-slate-600">{selected.summary}</p></div>{selected.patient && <Info title="Patient" value={`${selected.patient.name || 'Patient'}${selected.patient.mrn ? ` · MRN ${selected.patient.mrn}` : ''}`} />}{selected.status && <Info title="Status" value={label(selected.status)} />}{selected.priority && <Info title="Priority" value={label(selected.priority)} />}{selected.occurredAt && <Info title="Activity time" value={formatDate(selected.occurredAt)} />}<div><p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Record details</p><div className="space-y-2">{Object.entries(selected.details || {}).map(([key,value]) => <div key={key} className="rounded-xl border border-slate-100 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label(key)}</p><p className="mt-1 break-words text-xs leading-5 text-slate-700">{detailValue(value)}</p></div>)}</div></div><div className="flex items-center gap-2 rounded-xl border border-[#1b7b68]/10 bg-[#e8f5f3] px-4 py-3 text-[10px] font-semibold text-[#1b7b68]"><Eye className="h-4 w-4" />This activity is read-only in the Staff portal.</div></div></aside></div>}
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{title}</p><p className="mt-1 text-xs leading-5 text-slate-700">{value}</p></div>;
}
