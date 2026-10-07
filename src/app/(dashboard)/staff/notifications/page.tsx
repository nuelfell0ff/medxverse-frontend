'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import { staffNotificationsService } from '@/services/staff-notifications.service';
import { StaffNotificationItem } from '@/types/staff-notifications';

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function relativeDue(value?: string) {
  if (!value) return '';

  const date = new Date(value).getTime();
  const diff = date - Date.now();
  const minutes = Math.round(Math.abs(diff) / 60000);

  if (minutes < 60) {
    return diff < 0
      ? `${minutes}m overdue`
      : `Due in ${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return diff < 0
      ? `${hours}h overdue`
      : `Due in ${hours}h`;
  }

  const days = Math.round(hours / 24);

  return diff < 0
    ? `${days}d overdue`
    : `Due in ${days}d`;
}

function iconFor(item: StaffNotificationItem) {
  if (item.kind === 'MESSAGE_UNREAD') {
    return MessageCircle;
  }

  if (item.kind === 'TICKET_ACTION') {
    return Ticket;
  }

  if (item.kind === 'TASK_OVERDUE') {
    return AlertCircle;
  }

  return Clock3;
}

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<StaffNotificationItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    unreadMessages: 0,
    dueSoonTasks: 0,
    overdueTasks: 0,
    actionableTickets: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'ALL' | 'TASKS' | 'MESSAGES' | 'TICKETS'
  >('ALL');

  const load = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const feed = await staffNotificationsService.getFeed({
        windowMinutes: 24 * 60,
        limit: 100,
      });

      setItems(feed.items || []);
      setSummary(feed.summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load notifications.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load(true);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [load]);

  const filteredItems = useMemo(() => {
    if (filter === 'TASKS') {
      return items.filter((item) =>
        item.kind.startsWith('TASK_'),
      );
    }

    if (filter === 'MESSAGES') {
      return items.filter(
        (item) => item.kind === 'MESSAGE_UNREAD',
      );
    }

    if (filter === 'TICKETS') {
      return items.filter(
        (item) => item.kind === 'TICKET_ACTION',
      );
    }

    return items;
  }, [filter, items]);

  const tabs = [
    {
      key: 'ALL' as const,
      label: 'All',
      count: summary.total,
    },
    {
      key: 'TASKS' as const,
      label: 'Tasks',
      count: summary.dueSoonTasks + summary.overdueTasks,
    },
    {
      key: 'MESSAGES' as const,
      label: 'Messages',
      count: summary.unreadMessages,
    },
    {
      key: 'TICKETS' as const,
      label: 'Tickets',
      count: summary.actionableTickets,
    },
  ];

  const summaryCards = [
    {
      label: 'Due soon',
      count: summary.dueSoonTasks,
      icon: Clock3,
    },
    {
      label: 'Overdue',
      count: summary.overdueTasks,
      icon: AlertCircle,
    },
    {
      label: 'Unread messages',
      count: summary.unreadMessages,
      icon: MessageCircle,
    },
    {
      label: 'Tickets',
      count: summary.actionableTickets,
      icon: Ticket,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#1b7b68] p-6 text-white shadow-lg shadow-[#1b7b68]/10 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Staff notifications
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Stay ahead of your work.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Tasks approaching their due time, overdue work,
              unread conversations, and tickets needing attention
              appear here automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />

            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {card.label}
                </p>

                <Icon className="h-4 w-4 text-[#1b7b68]" />
              </div>

              <p className="mt-2 text-2xl font-bold text-slate-800">
                {card.count}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  filter === tab.key
                    ? 'bg-[#1b7b68] text-white'
                    : 'bg-slate-50 text-slate-500 hover:bg-[#e8f5f3] hover:text-[#1b7b68]'
                }`}
              >
                {tab.label}

                <span className="ml-1 opacity-70">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400">
            Due-soon window: next 24 hours · refreshes every 30
            seconds
          </p>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your notifications...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-sm font-bold text-slate-800">
              You are all caught up
            </h2>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
              Nothing currently needs your attention in this
              category.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const Icon = iconFor(item);

              const urgent =
                item.kind === 'TASK_OVERDUE' ||
                item.priority === 'URGENT' ||
                item.priority === 'CRITICAL';

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex gap-4 p-4 transition hover:bg-slate-50 sm:p-5"
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      urgent
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-[#e8f5f3] text-[#1b7b68]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {item.title}
                      </p>

                      {item.priority && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                          {item.priority}
                        </span>
                      )}

                      {item.unread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1b7b68]" />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.message}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                      <span>{formatDate(item.createdAt)}</span>

                      {item.dueAt && (
                        <span
                          className={
                            urgent
                              ? 'font-semibold text-rose-600'
                              : 'font-semibold text-[#1b7b68]'
                          }
                        >
                          {relativeDue(item.dueAt)} ·{' '}
                          {formatDate(item.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}