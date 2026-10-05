'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, MessageCircle, Search, UserRound } from 'lucide-react';
import { communicationService } from '@/services/communication.service';
import { CommunicationPatient } from '@/types/communication';

export default function StaffPatientsPage() {
  const [patients, setPatients] = useState<Array<{ patient: CommunicationPatient; conversationId: string; priority?: string }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (query = '') => {
    setLoading(true);
    try {
      const data = await communicationService.getMyPatients(query);
      setPatients(data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Clinical workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">My Patients</h1><p className="mt-1 text-xs text-slate-500">Patients connected to your hospital care conversations.</p></div>
        <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load(search); }} placeholder="Search name, MRN or phone" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]" /></div>
      </div>

      {error && <div className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {loading ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-xs text-slate-400">Loading your patients...</div> : patients.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{patients.map((item) => { const patient = item.patient; const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient'; return <div key={item.conversationId || patient._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><UserRound className="h-5 w-5" /></div>{patient.isFlagged && <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold uppercase text-rose-600">Flagged</span>}</div><h2 className="mt-4 text-sm font-bold text-slate-800">{name}</h2><p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">MRN: {patient.mrn || '—'}</p><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">Phone</p><p className="mt-1 truncate text-[10px] font-semibold text-slate-700">{patient.phone || '—'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] text-slate-400">Priority</p><p className="mt-1 text-[10px] font-semibold text-slate-700">{item.priority || 'NORMAL'}</p></div></div>{patient.flagReason && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-[10px] leading-4 text-rose-700">{patient.flagReason}</p>}<Link href={`/staff/messages?conversation=${encodeURIComponent(item.conversationId)}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white"><MessageCircle className="h-3.5 w-3.5" />Open care conversation</Link></div>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-200" /><h2 className="mt-3 text-sm font-bold text-slate-700">No patient conversations yet</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">When you are added to a patient-care conversation, the patient will appear here automatically.</p></div>}
    </div>
  );
}
