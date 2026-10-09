'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Send,
  Video,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/useAuthStore';

type PatientRef = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  phone?: string;
};

type DoctorRef = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  specialization?: string;
};

type Consultation = {
  _id: string;
  patientId: string | PatientRef;
  doctorId: string | DoctorRef;
  consultationType: 'VIDEO' | 'VOICE' | 'CHAT';
  status: 'WAITING_ROOM' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  scheduledStartTime: string;
  meetingUrl?: string;
  meetingRoomId?: string;
  chiefComplaint?: string;
};

type ConsultationMessage = {
  _id: string;
  sessionId: string;
  senderId: string;
  senderModel: 'User' | 'Patient';
  messageText: string;
  attachmentUrl?: string;
  sentAt: string;
};

function unwrap<T>(response: any, fallback: T): T {
  let value = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== 'object' || !('data' in value)) break;
    value = value.data;
  }
  return (value ?? fallback) as T;
}

function patientName(session: Consultation): string {
  if (typeof session.patientId === 'string') return 'Patient consultation';
  return `${session.patientId?.firstName || ''} ${session.patientId?.lastName || ''}`.trim() || 'Patient consultation';
}

function formatDate(value?: string): string {
  if (!value) return 'Time not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time not set'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: Consultation['status']): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function avatarLetters(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P'
  );
}

export default function StaffPatientConsultationsPage() {
  const { account } = useAuthStore();
  const currentUserId = account?.userId || account?.id || account?._id || '';
  const selectedIdRef = useRef('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [sessions, setSessions] = useState<Consultation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const loadSessions = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await apiClient.get('/telemedicine/sessions', {
        params: { page: 1, limit: 50 },
      });
      const payload = unwrap<any>(response, {});
      const result = Array.isArray(payload?.sessions) ? payload.sessions : Array.isArray(payload) ? payload : [];
      setSessions(result);
      setSelectedId((current) => current || result[0]?._id || '');
      setError('');
    } catch (cause: any) {
      setError(cause?.message || 'Unable to load patient consultations. Check your staff session and backend deployment.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string, showSpinner = false) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    if (showSpinner) setLoadingMessages(true);
    try {
      const response = await apiClient.get(`/telemedicine/messages/session/${encodeURIComponent(sessionId)}`);
      const payload = unwrap<any>(response, []);
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.messages)
          ? payload.messages
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
      if (selectedIdRef.current !== sessionId) return;
      setMessages((current) => {
        const pending = current.filter(
          (message) => message.sessionId === sessionId && String(message._id).startsWith('local-'),
        );
        const merged = [...items];
        for (const message of pending) {
          if (!merged.some((item: ConsultationMessage) => item._id === message._id)) {
            merged.push(message);
          }
        }
        return merged;
      });
    } catch (cause: any) {
      setError(cause?.message || 'Unable to load this consultation’s messages.');
    } finally {
      if (showSpinner) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions(true);
    const interval = window.setInterval(() => void loadSessions(false), 10000);
    return () => window.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    void loadMessages(selectedId, true);
    if (!selectedId) return;
    const interval = window.setInterval(() => void loadMessages(selectedId, false), 4000);
    return () => window.clearInterval(interval);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [messages]);

  const selected = useMemo(() => sessions.find((item) => item._id === selectedId) || null, [sessions, selectedId]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (filter === 'ACTIVE' && session.status !== 'WAITING_ROOM' && session.status !== 'IN_PROGRESS') {
        return false;
      }
      if (filter === 'UPCOMING' && (session.status !== 'WAITING_ROOM' || new Date(session.scheduledStartTime).getTime() <= Date.now())) {
        return false;
      }
      if (filter === 'COMPLETED' && session.status !== 'COMPLETED') {
        return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) return true;

      const pName = patientName(session).toLowerCase();
      const complaint = (session.chiefComplaint || '').toLowerCase();
      return pName.includes(query) || complaint.includes(query);
    });
  }, [sessions, filter, search]);

  const sendMessage = async () => {
    if (!selected || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    const optimistic: ConsultationMessage = {
      _id: `local-${Date.now()}`,
      sessionId: selected._id,
      senderId: currentUserId,
      senderModel: 'User',
      messageText: text,
      sentAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    try {
      const response = await apiClient.post('/telemedicine/messages', {
        sessionId: selected._id,
        messageText: text,
      });
      const saved = unwrap<ConsultationMessage | null>(response, null);
      if (saved?._id) {
        setMessages((current) => current.map((item) => item._id === optimistic._id ? saved : item));
      } else {
        await loadMessages(selected._id, false);
      }
    } catch (cause: any) {
      setMessages((current) => current.filter((item) => item._id !== optimistic._id));
      setDraft(text);
      setError(cause?.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const joinConsultation = async (session: Consultation) => {
    const savedUrl = String(session.meetingUrl || '').trim();
    const isUsableSavedUrl = /^https:\/\//i.test(savedUrl) && !savedUrl.includes('telemed.hospital.com');
    const meetingUrl = isUsableSavedUrl
      ? savedUrl
      : session.meetingRoomId
        ? `https://meet.jit.si/${encodeURIComponent(session.meetingRoomId)}`
        : '';

    if (!meetingUrl) {
      setError('This consultation has no valid meeting link or room ID. Ask the administrator to check the consultation setup.');
      return;
    }

    const meetingWindow = window.open('about:blank', '_blank');
    if (meetingWindow) meetingWindow.opener = null;

    setError('');
    if (session.status === 'WAITING_ROOM') {
      try {
        await apiClient.patch(`/telemedicine/sessions/${encodeURIComponent(session._id)}/status`, { status: 'IN_PROGRESS' });
        setSessions((current) => current.map((item) => item._id === session._id ? { ...item, status: 'IN_PROGRESS' } : item));
      } catch (cause: any) {
        setError(cause?.message || 'The call is opening, but the consultation status could not be updated.');
      }
    }

    if (meetingWindow) {
      meetingWindow.location.href = meetingUrl;
    } else {
      window.location.assign(meetingUrl);
    }
  };

  const completeConsultation = async (session: Consultation) => {
    try {
      await apiClient.patch(`/telemedicine/sessions/${encodeURIComponent(session._id)}/status`, { status: 'COMPLETED' });
      setSessions((current) => current.map((item) => item._id === session._id ? { ...item, status: 'COMPLETED' } : item));
    } catch (cause: any) {
      setError(cause?.message || 'Unable to complete this consultation.');
    }
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] overflow-hidden overscroll-none rounded-3xl border border-slate-100 bg-white font-sans shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_240px]">
        {/* Left Sidebar */}
        <aside
          className={`${
            selectedId ? 'hidden md:flex' : 'flex'
          } min-h-0 flex-col border-r border-slate-100 bg-white`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">
                  Communication centre
                </p>
                <h1 className="mt-1 text-lg font-bold text-slate-800">
                  Patient care
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/staff/messages"
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-100"
                  title="Back to staff messages"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Staff chat</span>
                </Link>

                <button
                  type="button"
                  onClick={() => void loadSessions(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  aria-label="Refresh consultations"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search consultations"
                className="h-10 w-full rounded-xl border border-slate-100 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68] focus:bg-white"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['ALL', 'ACTIVE', 'UPCOMING', 'COMPLETED'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                    filter === item
                      ? 'bg-[#1b7b68] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item === 'ALL' ? 'All' : item === 'ACTIVE' ? 'Waiting / live' : item === 'UPCOMING' ? 'Upcoming' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-none">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" />
              </div>
            ) : filteredSessions.length ? (
              filteredSessions.map((session) => {
                const pName = patientName(session);
                const active = selectedId === session._id;

                return (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => setSelectedId(session._id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                      active ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        active ? 'bg-[#1b7b68] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {avatarLetters(pName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {pName}
                        </p>
                        <span className="shrink-0 text-[9px] text-slate-400">
                          {formatTime(session.scheduledStartTime)}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-1">
                        <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
                          {session.consultationType === 'VIDEO' ? (
                            <Video className="h-3 w-3 shrink-0" />
                          ) : session.consultationType === 'VOICE' ? (
                            <Phone className="h-3 w-3 shrink-0" />
                          ) : (
                            <MessageCircle className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{session.chiefComplaint || `${session.consultationType} consultation`}</span>
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                            session.status === 'IN_PROGRESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : session.status === 'WAITING_ROOM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {statusLabel(session.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-center">
                <MessageCircle className="mx-auto h-7 w-7 text-slate-200" />
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  No consultations found
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Patient consultations assigned to your account will appear here.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Center Chat View */}
        <section
          className={`${
            selectedId ? 'flex' : 'hidden md:flex'
          } min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f8fafc]`}
        >
          {selected ? (
            <>
              <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId('')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden"
                    aria-label="Back to consultations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">
                    {avatarLetters(patientName(selected))}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-slate-800">
                      {patientName(selected)}
                    </h2>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-400">
                      {selected.consultationType} · {formatDate(selected.scheduledStartTime)} · {statusLabel(selected.status)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void loadMessages(selected._id, true)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-50"
                    title="Refresh messages"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  {selected.consultationType !== 'CHAT' && (
                    <button
                      type="button"
                      onClick={() => void joinConsultation(selected)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c]"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{selected.status === 'IN_PROGRESS' ? 'Join call' : 'Start consultation'}</span>
                    </button>
                  )}

                  {selected.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => void completeConsultation(selected)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </header>

              {error && (
                <div className="mx-4 mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div
                ref={messagesContainerRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
              >
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" />
                  </div>
                ) : messages.length ? (
                  <div className="mx-auto max-w-3xl space-y-3">
                    {messages.map((message) => {
                      const mine = message.senderModel !== 'Patient' || message.senderId === currentUserId;

                      return (
                        <div
                          key={message._id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
                              mine
                                ? 'rounded-br-md bg-[#1b7b68] text-white'
                                : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                            }`}
                          >
                            {!mine && (
                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1b7b68]">
                                {message.senderModel === 'Patient' ? 'Patient' : 'Care team'}
                              </p>
                            )}

                            <p className="whitespace-pre-wrap text-sm leading-5">
                              {message.messageText}
                            </p>

                            <div
                              className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                                mine ? 'text-white/60' : 'text-slate-400'
                              }`}
                            >
                              <span>{formatTime(message.sentAt)}</span>
                              {mine && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                      <MessageCircle className="h-6 w-6" />
                    </div>

                    <h3 className="mt-4 text-sm font-bold text-slate-700">
                      Start the patient conversation
                    </h3>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                      Messages sent here are delivered directly to the patient in their portal consultation room.
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1b7b68] focus-within:bg-white">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    rows={2}
                    placeholder="Write a secure patient consultation message..."
                    className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <div className="flex items-center justify-between">
                    <span className="px-2 text-[10px] text-slate-400">
                      Press Enter to send
                    </span>

                    <button
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={!draft.trim() || sending}
                      className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]">
                <Video className="h-7 w-7 text-[#1b7b68]" />
              </div>

              <h2 className="mt-5 text-lg font-bold text-slate-800">
                Patient consultation room
              </h2>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Select a consultation from the queue on the left to review details, chat with the patient, or attend their video call.
              </p>
            </div>
          )}
        </section>

        {/* Right Info Sidebar */}
        <aside className="hidden min-w-0 max-w-60 border-l border-slate-100 bg-white p-4 lg:block overflow-y-auto">
          {selected ? (
            <div className="space-y-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Patient
                </p>

                <h3 className="mt-1 text-sm font-bold text-slate-800">
                  {patientName(selected)}
                </h3>

                {typeof selected.patientId === 'object' && selected.patientId?.mrn && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    MRN: {selected.patientId.mrn}
                  </p>
                )}

                {typeof selected.patientId === 'object' && selected.patientId?.phone && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>{selected.patientId.phone}</span>
                  </p>
                )}
              </div>

              {selected.chiefComplaint && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Chief Complaint
                  </p>
                  <p className="mt-1 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
                    {selected.chiefComplaint}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Consultation Type
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  {selected.consultationType === 'VIDEO' ? (
                    <Video className="h-3.5 w-3.5 text-[#1b7b68]" />
                  ) : selected.consultationType === 'VOICE' ? (
                    <Phone className="h-3.5 w-3.5 text-[#1b7b68]" />
                  ) : (
                    <MessageCircle className="h-3.5 w-3.5 text-[#1b7b68]" />
                  )}
                  {selected.consultationType} Consultation
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                    selected.status === 'IN_PROGRESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selected.status === 'WAITING_ROOM'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Scheduled Time
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{formatDate(selected.scheduledStartTime)}</span>
                </p>
              </div>

              {selected.consultationType !== 'CHAT' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => void joinConsultation(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#176c5c]"
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>{selected.status === 'IN_PROGRESS' ? 'Join video room' : 'Start consultation'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400">Select a consultation to view details</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
