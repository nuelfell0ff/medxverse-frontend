'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2, Ticket } from 'lucide-react';
import { communicationService } from '@/services/communication.service';
import { Ticket as CommunicationTicket } from '@/types/communication';

const priorityClass: Record<string, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700',
  HIGH: 'bg-amber-50 text-amber-700',
  MEDIUM: 'bg-slate-100 text-slate-600',
  LOW: 'bg-slate-50 text-slate-400',
};

export default function StaffTasksPage() {
  const [tickets, setTickets] = useState<CommunicationTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTickets(await communicationService.getTickets());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load tasks and tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const complete = async (ticket: CommunicationTicket) => {
    setUpdating(ticket._id);
    try {
      const updated = await communicationService.updateTicket(ticket._id, { status: 'RESOLVED' });
      setTickets((current) => current.map((item) => item._id === ticket._id ? updated : item));
    } catch (err: any) {
      setError(err?.message || 'Unable to update this ticket.');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Operational workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800">Tasks & Tickets</h1><p className="mt-1 text-xs text-slate-500">Requests, escalations, and work items assigned within your hospital.</p></div>
      {error && <div className="flex gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#1b7b68]" /></div> : tickets.length ? <div className="space-y-3">{tickets.map((ticket) => { const patientName = ticket.patientId ? `${ticket.patientId.firstName || ''} ${ticket.patientId.lastName || ''}`.trim() : ''; const resolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'; return <div key={ticket._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${priorityClass[ticket.priority] || priorityClass.MEDIUM}`}>{ticket.priority}</span><span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold uppercase text-[#1b7b68]">{ticket.status.replace('_', ' ')}</span><span className="text-[9px] uppercase tracking-wider text-slate-400">{ticket.category.replace('_', ' ')}</span></div><h2 className="mt-3 text-sm font-bold text-slate-800">{ticket.subject}</h2>{ticket.description && <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{ticket.description}</p>}{patientName && <p className="mt-3 text-[10px] font-semibold text-slate-400">Patient: <span className="text-slate-600">{patientName}</span> · MRN {ticket.patientId?.mrn || '—'}</p>}</div><div className="flex shrink-0 items-center gap-2">{!resolved && <button type="button" disabled={updating === ticket._id} onClick={() => void complete(ticket)} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50">{updating === ticket._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Resolve</button>}</div></div></div>; })}</div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center"><Ticket className="mx-auto h-8 w-8 text-slate-200" /><h2 className="mt-3 text-sm font-bold text-slate-700">No open work items</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">Assigned communication tickets and escalations will appear here.</p></div>}
    </div>
  );
}
