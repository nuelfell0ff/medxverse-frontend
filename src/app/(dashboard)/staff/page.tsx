'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, ShieldCheck, Ticket, Users } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function StaffHomePage() {
  const account = useAuthStore((state) => state.account);
  const firstName = account?.firstName || account?.name?.split(' ')[0] || 'there';

  const cards = [
    { label: 'Messages', description: 'Open conversations and hospital channels.', href: '/staff/messages', icon: MessageCircle },
    { label: 'My Patients', description: 'Patients connected to your care conversations.', href: '/staff/patients', icon: Users },
    { label: 'Tasks & Tickets', description: 'Track requests, escalations, and work items.', href: '/staff/tasks', icon: Ticket },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[#1b7b68] p-6 text-white shadow-lg shadow-[#1b7b68]/10 sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Staff workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Good morning, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Your hospital workspace brings communication, patients, tasks, and clinical work together in one secure place.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/80 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4" /> Secure staff access
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return <Link key={card.href} href={card.href} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1b7b68]/20 hover:shadow-md">
            <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5f3] text-[#1b7b68]"><Icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#1b7b68]" /></div>
            <h2 className="mt-5 text-sm font-bold text-slate-800">{card.label}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{card.description}</p>
          </Link>;
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Today</p><h2 className="mt-1 text-lg font-bold text-slate-800">Your workspace at a glance</h2></div><Clock3 className="h-5 w-5 text-slate-300" /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-800">—</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Appointments</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-800">—</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open tasks</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-2xl font-bold text-slate-800">—</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unread messages</p></div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Getting started</p>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1b7b68]" /><span>Your staff account is active.</span></div>
            <div className="flex items-start gap-3"><MessageCircle className="mt-0.5 h-4 w-4 text-[#1b7b68]" /><span>Open Messages to find your hospital conversations.</span></div>
            <div className="flex items-start gap-3"><Users className="mt-0.5 h-4 w-4 text-[#1b7b68]" /><span>Your patient context is available when care conversations exist.</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
