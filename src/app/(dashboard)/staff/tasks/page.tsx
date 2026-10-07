'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { staffWorkService } from '@/services/staff-work.service';
import {
  WorkModuleKey,
  WorkTask,
  WorkTaskPriority,
  WorkTaskStatus,
  WorkTicket,
  WorkTicketCategory,
  WorkTicketPriority,
  WorkTicketStatus,
} from '@/types/staff-work';

const taskStatuses: WorkTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
const ticketStatuses: WorkTicketStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

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

const taskPriorityClass: Record<string, string> = {
  URGENT: 'bg-rose-50 text-rose-700 border-rose-100',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-100',
  NORMAL: 'bg-slate-100 text-slate-600 border-slate-100',
  LOW: 'bg-slate-50 text-slate-500 border-slate-100',
};

const statusClass: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-rose-50 text-rose-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
  OPEN: 'bg-amber-50 text-amber-700',
  ASSIGNED: 'bg-blue-50 text-blue-700',
  WAITING: 'bg-violet-50 text-violet-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-500',
};

function label(value?: string) {
  return (value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function patientName(patient?: WorkTask['patientId'] | WorkTicket['patientId']) {
  if (!patient) return '';
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ') || 'Patient';
}

function staffName(staff?: WorkTask['assignedTo'] | WorkTicket['assignedTo']) {
  if (!staff) return '';
  return [staff.firstName, staff.lastName].filter(Boolean).join(' ') || staff.email || 'Staff member';
}

function formatDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isOverdue(task: WorkTask) {
  return Boolean(task.dueAt && new Date(task.dueAt).getTime() < Date.now() && !['COMPLETED', 'CANCELLED'].includes(task.status));
}

export default function StaffTasksPage() {
  const account = useAuthStore((state) => state.account);
  const [tab, setTab] = useState<'tasks' | 'tickets'>('tasks');
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [tickets, setTickets] = useState<WorkTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<WorkTask | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<WorkTicket | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskResponse, ticketResponse] = await Promise.all([
        staffWorkService.getTasks({
          limit: 100,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
        staffWorkService.getTickets({
          limit: 100,
          ...(tab === 'tickets' && statusFilter ? { status: statusFilter } : {}),
        }),
      ]);
      setTasks(taskResponse.items || []);
      setTickets(ticketResponse.items || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your work items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [statusFilter, tab]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      [task.title, task.description, task.patientId && patientName(task.patientId), task.relatedModule]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [tasks, search]);

  const updateTaskStatus = async (task: WorkTask, status: WorkTaskStatus) => {
    setSaving(task._id);
    try {
      const updated = await staffWorkService.updateTask(task._id, { status });
      setTasks((items) => items.map((item) => item._id === task._id ? updated : item));
      setSelectedTask(updated);
    } catch (err: any) {
      setError(err?.message || 'Unable to update the task.');
    } finally {
      setSaving(null);
    }
  };

  const updateTicketStatus = async (ticket: WorkTicket, status: WorkTicketStatus) => {
    setSaving(ticket._id);
    try {
      const updated = await staffWorkService.updateTicket(ticket._id, { status });
      setTickets((items) => items.map((item) => item._id === ticket._id ? updated : item));
      setSelectedTicket(updated);
    } catch (err: any) {
      setError(err?.message || 'Unable to update the ticket.');
    } finally {
      setSaving(null);
    }
  };

  const taskCount = tasks.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status) && !isOverdue(item)).length;
  const overdueCount = tasks.filter(isOverdue).length;
  const openTicketCount = tickets.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#0f6656] to-[#1b7b68] p-6 text-white shadow-lg shadow-[#1b7b68]/10 sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-100">Staff work centre</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Tasks & Tickets</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-emerald-50/90">
              Work assigned to you, issues you have raised, and hospital requests that need your attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => tab === 'tasks' ? setShowTaskForm(true) : setShowTicketForm(true)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#126b5a] shadow-sm">
              <Plus className="h-4 w-4" /> {tab === 'tasks' ? 'New task' : 'New ticket'}
            </button>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white hover:bg-white/15" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-xl">
          <Stat label="Active tasks" value={taskCount} />
          <Stat label="Overdue" value={overdueCount} />
          <Stat label="Open tickets" value={openTicketCount} />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button type="button" onClick={() => { setTab('tasks'); setStatusFilter(''); }} className={`rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${tab === 'tasks' ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-500'}`}>Tasks</button>
          <button type="button" onClick={() => { setTab('tickets'); setStatusFilter(''); }} className={`rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${tab === 'tickets' ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-500'}`}>Tickets</button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'tasks' ? 'Search tasks...' : 'Search tickets...'} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68]/40 sm:w-64" />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-xs outline-none">
              <option value="">All statuses</option>
              {(tab === 'tasks' ? taskStatuses : ticketStatuses).map((status) => <option key={status} value={status}>{label(status)}</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-14 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1b7b68]" /><p className="mt-3 text-xs text-slate-400">Loading your work...</p></div>
      ) : tab === 'tasks' ? (
        visibleTasks.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleTasks.map((task) => <TaskCard key={task._id} task={task} saving={saving === task._id} onOpen={() => setSelectedTask(task)} onStatus={(status) => void updateTaskStatus(task, status)} />)}
          </div>
        ) : <Empty icon={CheckCircle2} title="No tasks found" text="Assigned work will appear here when a task is created for you." action={() => setShowTaskForm(true)} actionLabel="Create a task" />
      ) : (
        tickets.filter((ticket) => {
          const query = search.trim().toLowerCase();
          return !query || [ticket.subject, ticket.description, ticket.ticketNumber, ticket.patientId && patientName(ticket.patientId), ticket.relatedModule].filter(Boolean).join(' ').toLowerCase().includes(query);
        }).length ? (
          <div className="space-y-3">
            {tickets.filter((ticket) => {
              const query = search.trim().toLowerCase();
              return !query || [ticket.subject, ticket.description, ticket.ticketNumber, ticket.patientId && patientName(ticket.patientId), ticket.relatedModule].filter(Boolean).join(' ').toLowerCase().includes(query);
            }).map((ticket) => <TicketCard key={ticket._id} ticket={ticket} saving={saving === ticket._id} onOpen={() => setSelectedTicket(ticket)} onStatus={(status) => void updateTicketStatus(ticket, status)} />)}
          </div>
        ) : <Empty icon={Ticket} title="No tickets found" text="Support requests and hospital issues assigned to you will appear here." action={() => setShowTicketForm(true)} actionLabel="Create a ticket" />
      )}

      {selectedTask && <TaskDetails task={selectedTask} saving={saving === selectedTask._id} onClose={() => setSelectedTask(null)} onStatus={(status) => void updateTaskStatus(selectedTask, status)} />}
      {selectedTicket && <TicketDetails ticket={selectedTicket} saving={saving === selectedTicket._id} onClose={() => setSelectedTicket(null)} onStatus={(status) => void updateTicketStatus(selectedTicket, status)} onComment={async (body) => { const updated = await staffWorkService.addTicketComment(selectedTicket._id, body); setTickets((items) => items.map((item) => item._id === updated._id ? updated : item)); setSelectedTicket(updated); }} />}
      {showTaskForm && <TaskForm accountStaffId={account?.staffId} onClose={() => setShowTaskForm(false)} onCreated={(task) => { setTasks((items) => [task, ...items]); setShowTaskForm(false); }} onError={setError} />}
      {showTicketForm && <TicketForm onClose={() => setShowTicketForm(false)} onCreated={(ticket) => { setTickets((items) => [ticket, ...items]); setShowTicketForm(false); }} onError={setError} />}
    </div>
  );
}

function Stat({ label: title, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3"><p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-100">{title}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function TaskCard({ task, saving, onOpen, onStatus }: { task: WorkTask; saving: boolean; onOpen: () => void; onStatus: (status: WorkTaskStatus) => void }) {
  const overdue = isOverdue(task);
  const effectiveStatus = overdue && task.status === 'PENDING' ? 'OVERDUE' : task.status;
  return <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${taskPriorityClass[task.priority]}`}>{label(task.priority)}</span>
          <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass[effectiveStatus]}`}>{label(effectiveStatus)}</span>
          {task.relatedModule && <span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold text-[#1b7b68]">{moduleLabels[task.relatedModule]}</span>}
        </div>
        <h2 className="mt-3 text-sm font-bold text-slate-800">{task.title}</h2>
        {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400">
          {task.patientId && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{patientName(task.patientId)}{task.patientId.mrn ? ` · ${task.patientId.mrn}` : ''}</span>}
          {task.dueAt && <span className={`flex items-center gap-1.5 ${overdue ? 'font-bold text-rose-600' : ''}`}><CalendarClock className="h-3.5 w-3.5" />Due {formatDate(task.dueAt)}</span>}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
    </div>
    {saving && <div className="mt-3 flex items-center gap-2 text-[10px] text-[#1b7b68]"><Loader2 className="h-3 w-3 animate-spin" />Updating...</div>}
  </button>;
}

function TicketCard({ ticket, saving, onOpen }: { ticket: WorkTicket; saving: boolean; onOpen: () => void; onStatus: (status: WorkTicketStatus) => void }) {
  return <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass[ticket.status]}`}>{label(ticket.status)}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600">{label(ticket.priority)}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label(ticket.category)}</span>
        </div>
        <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">{ticket.ticketNumber}</p>
        <h2 className="mt-1 text-sm font-bold text-slate-800">{ticket.subject}</h2>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{ticket.description}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400">
          {ticket.patientId && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" />{patientName(ticket.patientId)}{ticket.patientId.mrn ? ` · ${ticket.patientId.mrn}` : ''}</span>}
          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDate(ticket.updatedAt || ticket.createdAt)}</span>
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
    </div>
    {saving && <div className="mt-3 flex items-center gap-2 text-[10px] text-[#1b7b68]"><Loader2 className="h-3 w-3 animate-spin" />Updating...</div>}
  </button>;
}

function Empty({ icon: Icon, title, text, action, actionLabel }: { icon: typeof Ticket; title: string; text: string; action: () => void; actionLabel: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center"><Icon className="mx-auto h-9 w-9 text-slate-200" /><h2 className="mt-3 text-sm font-bold text-slate-700">{title}</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">{text}</p><button type="button" onClick={action} className="mt-5 rounded-xl bg-[#1b7b68] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white">{actionLabel}</button></div>;
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[80] flex justify-end bg-slate-900/25 backdrop-blur-sm"><button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" /><aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Work details</p><h2 className="mt-1 text-lg font-bold text-slate-800">{title}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X className="h-5 w-5" /></button></div>{children}</aside></div>;
}

function TaskDetails({ task, saving, onClose, onStatus }: { task: WorkTask; saving: boolean; onClose: () => void; onStatus: (status: WorkTaskStatus) => void }) {
  return <Drawer title={task.title} onClose={onClose}><div className="space-y-5 pt-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${taskPriorityClass[task.priority]}`}>{label(task.priority)}</span><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass[task.status]}`}>{label(task.status)}</span>{task.relatedModule && <span className="rounded-full bg-[#e8f5f3] px-2 py-1 text-[9px] font-bold text-[#1b7b68]">{moduleLabels[task.relatedModule]}</span>}</div>{task.description && <Info title="Description" value={task.description} />}{task.patientId && <Info title="Patient" value={`${patientName(task.patientId)}${task.patientId.mrn ? ` · MRN ${task.patientId.mrn}` : ''}`} />}{task.dueAt && <Info title="Due" value={formatDate(task.dueAt)} />}{task.assignedTo && <Info title="Assigned to" value={staffName(task.assignedTo)} />}{task.relatedRecordId && <Info title="Related record" value={task.relatedRecordId} />}{task.createdAt && <Info title="Created" value={formatDate(task.createdAt)} />}<div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Update status</p><div className="mt-2 grid grid-cols-2 gap-2">{taskStatuses.filter((s) => s !== 'OVERDUE').map((status) => <button key={status} type="button" disabled={saving || task.status === status} onClick={() => onStatus(status)} className={`rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase ${task.status === status ? 'border-[#1b7b68] bg-[#e8f5f3] text-[#1b7b68]' : 'border-slate-200 text-slate-500 hover:border-[#1b7b68]/30'} disabled:opacity-50`}>{status === task.status && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{label(status)}</button>)}</div></div></div></Drawer>;
}

function TicketDetails({ ticket, saving, onClose, onStatus, onComment }: { ticket: WorkTicket; saving: boolean; onClose: () => void; onStatus: (status: WorkTicketStatus) => void; onComment: (body: string) => Promise<void> }) {
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const submitComment = async (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; setCommenting(true); try { await onComment(comment.trim()); setComment(''); } finally { setCommenting(false); } };
  return <Drawer title={ticket.subject} onClose={onClose}><div className="space-y-5 pt-5"><div><p className="text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">{ticket.ticketNumber}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusClass[ticket.status]}`}>{label(ticket.status)}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600">{label(ticket.priority)}</span><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label(ticket.category)}</span></div></div><Info title="Description" value={ticket.description} />{ticket.patientId && <Info title="Patient" value={`${patientName(ticket.patientId)}${ticket.patientId.mrn ? ` · MRN ${ticket.patientId.mrn}` : ''}`} />}{ticket.assignedTo && <Info title="Assigned to" value={staffName(ticket.assignedTo)} />}{ticket.relatedModule && <Info title="Related HMS module" value={moduleLabels[ticket.relatedModule]} />}{ticket.relatedRecordId && <Info title="Related record" value={ticket.relatedRecordId} />}<div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Update status</p><div className="mt-2 grid grid-cols-2 gap-2">{ticketStatuses.map((status) => <button key={status} type="button" disabled={saving || ticket.status === status} onClick={() => onStatus(status)} className={`rounded-xl border px-3 py-2.5 text-[10px] font-bold uppercase ${ticket.status === status ? 'border-[#1b7b68] bg-[#e8f5f3] text-[#1b7b68]' : 'border-slate-200 text-slate-500 hover:border-[#1b7b68]/30'} disabled:opacity-50`}>{label(status)}</button>)}</div></div><div className="border-t border-slate-100 pt-5"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Ticket history</p><div className="mt-3 space-y-3">{ticket.comments?.length ? ticket.comments.map((item, index) => <div key={`${item.createdAt}-${index}`} className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-600">{item.body}</p><p className="mt-1 text-[9px] text-slate-400">{formatDate(item.createdAt)}</p></div>) : <p className="text-xs text-slate-400">No comments yet.</p>}</div><form onSubmit={submitComment} className="mt-4 flex gap-2"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40" /><button disabled={commenting || !comment.trim()} className="rounded-xl bg-[#1b7b68] px-3 text-[10px] font-bold text-white disabled:opacity-50">{commenting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</button></form></div></div></Drawer>;
}

function Info({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{title}</p><p className="mt-1 text-xs leading-5 text-slate-700">{value}</p></div>;
}

function TaskForm({ accountStaffId, onClose, onCreated, onError }: { accountStaffId?: string; onClose: () => void; onCreated: (task: WorkTask) => void; onError: (message: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkTaskPriority>('NORMAL');
  const [category, setCategory] = useState('GENERAL');
  const [module, setModule] = useState<WorkModuleKey | ''>('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !accountStaffId) return;
    setSaving(true);
    try {
      const task = await staffWorkService.createTask({ title: title.trim(), description: description.trim() || undefined, priority, category, assignedTo: accountStaffId, ...(module ? { relatedModule: module } : {}), ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}) });
      onCreated(task);
    } catch (err: any) {
      onError(err?.message || 'Unable to create the task.');
    } finally { setSaving(false); }
  };
  return <Modal title="Create task" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Task title"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review laboratory result" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40" /></Field><Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What needs to be done?" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40 resize-none" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as WorkTaskPriority)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40">{['LOW','NORMAL','HIGH','URGENT'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40">{['GENERAL','CLINICAL','FOLLOW_UP','REVIEW','DOCUMENTATION','ADMINISTRATIVE'].map((x) => <option key={x}>{label(x)}</option>)}</select></Field></div><Field label="Related HMS module"><select value={module} onChange={(e) => setModule(e.target.value as WorkModuleKey | '')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40"><option value="">Not linked</option>{Object.entries(moduleLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></Field><Field label="Due date"><input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40" /></Field><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-bold uppercase text-slate-500">Cancel</button><button disabled={saving || !accountStaffId} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-bold uppercase text-white disabled:opacity-50">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create task</button></div></form></Modal>;
}

function TicketForm({ onClose, onCreated, onError }: { onClose: () => void; onCreated: (ticket: WorkTicket) => void; onError: (message: string) => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkTicketPriority>('NORMAL');
  const [category, setCategory] = useState<WorkTicketCategory>('OTHER');
  const [module, setModule] = useState<WorkModuleKey | ''>('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSaving(true);
    try {
      const ticket = await staffWorkService.createTicket({ subject: subject.trim(), description: description.trim(), priority, category, ...(module ? { relatedModule: module } : {}) });
      onCreated(ticket);
    } catch (err: any) {
      onError(err?.message || 'Unable to create the ticket.');
    } finally { setSaving(false); }
  };
  return <Modal title="Create ticket" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="Subject"><input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What needs attention?" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40" /></Field><Field label="Description"><textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe the issue or request..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40 resize-none" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Priority"><select value={priority} onChange={(e) => setPriority(e.target.value as WorkTicketPriority)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40">{['LOW','NORMAL','HIGH','URGENT','CRITICAL'].map((x) => <option key={x}>{x}</option>)}</select></Field><Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value as WorkTicketCategory)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40">{['PATIENT','CLINICAL','APPOINTMENT','LABORATORY','RADIOLOGY','PHARMACY','SURGERY','EMERGENCY','TECHNICAL','ADMINISTRATIVE','OTHER'].map((x) => <option key={x}>{label(x)}</option>)}</select></Field></div><Field label="Related HMS module"><select value={module} onChange={(e) => setModule(e.target.value as WorkModuleKey | '')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#1b7b68]/40"><option value="">Not linked</option>{Object.entries(moduleLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></Field><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-bold uppercase text-slate-500">Cancel</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-bold uppercase text-white disabled:opacity-50">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Create ticket</button></div></form></Modal>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-800">{title}</h2><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function Field({ label: fieldLabel, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">{fieldLabel}</span>{children}</label>;
}
