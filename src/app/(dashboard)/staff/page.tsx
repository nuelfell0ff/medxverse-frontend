'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { AppointmentApiService } from '@/services/appointment.service';
import { communicationService } from '@/services/communication.service';
import { staffWorkService } from '@/services/staff-work.service';
import { AppointmentStatus } from '@/types/appointment';

export default function StaffHomePage() {
  const account = useAuthStore((state) => state.account);
  const firstName =
    account?.firstName || account?.name?.split(' ')[0] || 'there';

  const [appointments, setAppointments] = useState<number | null>(null);
  const [openTasks, setOpenTasks] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const staffUserId = useMemo(
    () => account?.userId || account?.id || account?._id || '',
    [account],
  );

  const loadWorkspace = async () => {
    if (!staffUserId) {
      setLoadingWorkspace(false);
      return;
    }

    setLoadingWorkspace(true);
    setWorkspaceError(null);

    try {
      const today = new Date();
      const date = `${today.getFullYear()}-${String(
        today.getMonth() + 1,
      ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const [
        scheduled,
        checkedIn,
        inProgress,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        inbox,
      ] = await Promise.all([
        AppointmentApiService.getAppointments({
          doctorId: staffUserId,
          date,
          status: AppointmentStatus.SCHEDULED,
          page: 1,
          limit: 1,
        }),
        AppointmentApiService.getAppointments({
          doctorId: staffUserId,
          date,
          status: AppointmentStatus.CHECKED_IN,
          page: 1,
          limit: 1,
        }),
        AppointmentApiService.getAppointments({
          doctorId: staffUserId,
          date,
          status: AppointmentStatus.IN_PROGRESS,
          page: 1,
          limit: 1,
        }),
        staffWorkService.getTasks({
          status: 'PENDING',
          page: 1,
          limit: 1,
        }),
        staffWorkService.getTasks({
          status: 'IN_PROGRESS',
          page: 1,
          limit: 1,
        }),
        staffWorkService.getTasks({
          status: 'OVERDUE',
          page: 1,
          limit: 1,
        }),
        communicationService.getInbox(1, 100),
      ]);

      setAppointments(
        Number(scheduled.total || 0) +
          Number(checkedIn.total || 0) +
          Number(inProgress.total || 0),
      );

      setOpenTasks(
        Number(pendingTasks.pagination?.total || 0) +
          Number(inProgressTasks.pagination?.total || 0) +
          Number(overdueTasks.pagination?.total || 0),
      );

      // InboxResponse uses `items`, not `conversations`.
      // Each item is a Conversation and may contain unreadCount.
      const conversations = inbox?.items ?? [];

      setUnreadMessages(
        conversations.reduce(
          (total, conversation) =>
            total + Number(conversation?.unreadCount || 0),
          0,
        ),
      );
    } catch (error) {
      console.error(
        '[Staff Dashboard] Failed to load workspace counts:',
        error,
      );
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : 'Unable to load workspace counts.',
      );
      setAppointments(null);
      setOpenTasks(null);
      setUnreadMessages(null);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [staffUserId]);

  const cards = [
    {
      label: 'Messages',
      description: 'Open conversations and hospital channels.',
      href: '/staff/messages',
      icon: MessageCircle,
    },
    {
      label: 'My Patients',
      description: 'Patients connected to your care conversations.',
      href: '/staff/patients',
      icon: Users,
    },
    {
      label: 'Tasks & Tickets',
      description: 'Track requests, escalations, and work items.',
      href: '/staff/tasks',
      icon: Ticket,
    },
  ];

  const countLabel = (value: number | null) =>
    loadingWorkspace
      ? '…'
      : value === null
        ? '—'
        : value.toLocaleString();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#1b7b68] p-6 text-white shadow-lg shadow-[#1b7b68]/10 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Staff workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Good morning, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Your hospital workspace brings communication, patients, tasks,
              and clinical work together in one secure place.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/80 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" /> Secure staff access
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1b7b68]" />
              </div>

              <h2 className="mt-5 text-sm font-bold text-slate-800">
                {card.label}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {card.description}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Today
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-800">
                Your workspace at a glance
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadWorkspace()}
                disabled={loadingWorkspace}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-[#1b7b68] disabled:opacity-50"
                aria-label="Refresh workspace"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loadingWorkspace ? 'animate-spin' : ''
                  }`}
                />
              </button>
              <Clock3 className="h-5 w-5 text-slate-300" />
            </div>
          </div>

          {workspaceError && (
            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {workspaceError}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link
              href="/hms/appointments"
              className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="text-2xl font-bold text-slate-800">
                {countLabel(appointments)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Appointments
              </p>
              <p className="mt-1 text-[9px] text-slate-400">Open today</p>
            </Link>

            <Link
              href="/staff/tasks"
              className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="text-2xl font-bold text-slate-800">
                {countLabel(openTasks)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Open tasks
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Assigned to you
              </p>
            </Link>

            <Link
              href="/staff/messages"
              className="rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100"
            >
              <p className="text-2xl font-bold text-slate-800">
                {countLabel(unreadMessages)}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Unread messages
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Across your conversations
              </p>
            </Link>
          </div>

          {loadingWorkspace && (
            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading your current workspace...
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Getting started
          </p>

          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1b7b68]" />
              <span>Your staff account is active.</span>
            </div>

            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 text-[#1b7b68]" />
              <span>
                Open Messages to find your hospital conversations.
              </span>
            </div>

            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 text-[#1b7b68]" />
              <span>
                Your patient context is available when care conversations
                exist.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
