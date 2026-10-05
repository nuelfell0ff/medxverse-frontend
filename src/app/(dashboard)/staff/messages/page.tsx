'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { communicationService, getCommunicationWebSocketUrl } from '@/services/communication.service';
import { Conversation, Department, Message, StaffSearchResult } from '@/types/communication';

function idOf(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) return String((value as any)._id);
  return String(value);
}

function conversationLabel(conversation: Conversation): string {
  if (conversation.title) return conversation.title;
  if (conversation.type === 'PATIENT_CARE') {
    const patient = typeof conversation.patientId === 'object' ? conversation.patientId : undefined;
    if (patient) return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient care team';
    return 'Patient care team';
  }
  if (conversation.type === 'DEPARTMENT') {
    return typeof conversation.departmentId === 'object' ? conversation.departmentId.name || 'Department' : 'Department channel';
  }
  return 'Direct conversation';
}

function formatTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function avatarLetters(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
}

export default function StaffMessagesPage() {
  const { account, token } = useAuthStore();
  const currentUserId = account?.userId || '';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffResults, setStaffResults] = useState<StaffSearchResult[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatMode, setNewChatMode] = useState<'DIRECT' | 'GROUP' | 'PATIENT' | 'DEPARTMENT'>('DIRECT');
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [patientOptions, setPatientOptions] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<'connecting' | 'connected' | 'offline'>('offline');
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) => {
      const label = conversationLabel(conversation).toLowerCase();
      const preview = (conversation.lastMessagePreview || '').toLowerCase();
      return label.includes(query) || preview.includes(query);
    });
  }, [conversations, search]);

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    try {
      const result = await communicationService.getInbox();
      setConversations(result.items || []);
      setSelectedId((current) => current || result.items?.[0]?._id || null);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your conversations.');
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const [conversation, messageResult] = await Promise.all([
        communicationService.getConversation(conversationId),
        communicationService.getMessages(conversationId),
      ]);
      setSelectedConversation(conversation);
      setMessages(messageResult.items || []);
      await communicationService.markRead(conversationId).catch(() => undefined);
      setConversations((current) => current.map((item) => item._id === conversationId ? { ...item, unreadCount: 0 } : item));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to open this conversation.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => { void loadInbox(); }, [loadInbox]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const conversationId = new URLSearchParams(window.location.search).get('conversation');
    if (conversationId) setSelectedId(conversationId);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }
    void loadConversation(selectedId);
  }, [loadConversation, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!token || account?.userType !== 'STAFF') return;
    setSocketState('connecting');
    const socket = new WebSocket(getCommunicationWebSocketUrl(token));
    socketRef.current = socket;

    socket.onopen = () => setSocketState('connected');
    socket.onerror = () => setSocketState('offline');
    socket.onclose = () => {
      setSocketState('offline');
      socketRef.current = null;
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message.created' && payload.payload) {
          const incoming = payload.payload as Message;
          setConversations((current) => {
            const existing = current.find((item) => item._id === payload.conversationId);
            if (!existing) return current;
            const isOpen = selectedId === payload.conversationId;
            return current.map((item) => item._id === payload.conversationId ? {
              ...item,
              lastMessageAt: incoming.createdAt || new Date().toISOString(),
              lastMessagePreview: incoming.body || '[message]',
              unreadCount: isOpen ? 0 : (item.unreadCount || 0) + 1,
            } : item);
          });
          if (selectedId === payload.conversationId) {
            setMessages((current) => current.some((message) => message._id === incoming._id) ? current : [...current, incoming]);
            void communicationService.markRead(payload.conversationId).catch(() => undefined);
          }
        }
      } catch {
        // Ignore malformed socket events; the REST API remains the source of truth.
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [account?.userType, selectedId, token]);

  useEffect(() => {
    if (!showNewChat) return;
    if (newChatMode === 'PATIENT') {
      void communicationService.getMyPatients().then(setPatientOptions).catch(() => setPatientOptions([]));
    }
    if (newChatMode === 'DEPARTMENT') {
      void communicationService.getDepartments().then(setDepartmentOptions).catch(() => setDepartmentOptions([]));
    }
  }, [newChatMode, showNewChat]);

  const searchForStaff = async (value: string) => {
    setStaffSearch(value);
    if (value.trim().length < 2) {
      setStaffResults([]);
      return;
    }
    setSearchingStaff(true);
    try {
      setStaffResults(await communicationService.searchStaff(value));
    } catch {
      setStaffResults([]);
    } finally {
      setSearchingStaff(false);
    }
  };

  const openCreatedConversation = (conversation: Conversation) => {
    setConversations((current) => [conversation, ...current.filter((item) => item._id !== conversation._id)]);
    setSelectedId(conversation._id);
    setShowNewChat(false);
    setStaffSearch('');
    setStaffResults([]);
    setSelectedMembers([]);
    setGroupTitle('');
    setSelectedPatientId('');
    setSelectedDepartmentId('');
  };

  const startDirectChat = async (staff: StaffSearchResult) => {
    if (!staff.id) return;
    setCreatingChat(true);
    setError(null);
    try {
      const conversation = await communicationService.createDirectConversation(staff.id);
      openCreatedConversation(conversation);
    } catch (err: any) {
      setError(err?.message || 'Unable to start the conversation.');
    } finally {
      setCreatingChat(false);
    }
  };

  const createSelectedConversation = async () => {
    setCreatingChat(true);
    setError(null);
    try {
      if (newChatMode === 'GROUP') {
        if (!groupTitle.trim() || selectedMembers.length === 0) throw new Error('Enter a group name and select at least one staff member.');
        const conversation = await communicationService.createGroupConversation(groupTitle, selectedMembers);
        openCreatedConversation(conversation);
      } else if (newChatMode === 'PATIENT') {
        if (!selectedPatientId || selectedMembers.length === 0) throw new Error('Select a patient and at least one care-team member.');
        const patient = patientOptions.find((item) => idOf(item.patient?._id || item.patient?.id) === selectedPatientId)?.patient;
        const title = patient ? `${patient.firstName || ''} ${patient.lastName || ''} Care Team`.trim() : undefined;
        const conversation = await communicationService.createPatientCareConversation(selectedPatientId, selectedMembers, title);
        openCreatedConversation(conversation);
      } else if (newChatMode === 'DEPARTMENT') {
        if (!selectedDepartmentId) throw new Error('Select a department.');
        const conversation = await communicationService.createDepartmentConversation(selectedDepartmentId);
        openCreatedConversation(conversation);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to create the conversation.');
    } finally {
      setCreatingChat(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await communicationService.sendMessage(selectedId, body);
      setMessages((current) => current.some((item) => item._id === message._id) ? current : [...current, message]);
      setConversations((current) => current.map((item) => item._id === selectedId ? { ...item, lastMessageAt: message.createdAt, lastMessagePreview: message.body || '' } : item));
      setDraft('');
    } catch (err: any) {
      setError(err?.message || 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] min-h-[620px] overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
      <div className="grid h-full grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-slate-100 bg-white`}>
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#1b7b68]">Communication centre</p><h1 className="mt-1 text-lg font-bold text-slate-800">Messages</h1></div>
              <button type="button" onClick={() => setShowNewChat(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b7b68] text-white shadow-sm transition hover:bg-[#176c5c]" aria-label="New conversation"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="h-10 w-full rounded-xl border border-slate-100 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#1b7b68] focus:bg-white" /></div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loadingInbox ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" /></div> : filteredConversations.length ? filteredConversations.map((conversation) => {
              const label = conversationLabel(conversation);
              const active = selectedId === conversation._id;
              return <button key={conversation._id} type="button" onClick={() => setSelectedId(conversation._id)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${active ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${active ? 'bg-[#1b7b68] text-white' : 'bg-slate-100 text-slate-500'}`}>{avatarLetters(label)}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-slate-800">{label}</p><span className="shrink-0 text-[9px] text-slate-400">{formatTime(conversation.lastMessageAt)}</span></div><p className="mt-1 truncate text-[10px] text-slate-400">{conversation.lastMessagePreview || 'No messages yet'}</p></div>
                {!!conversation.unreadCount && <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1b7b68] px-1.5 text-[9px] font-bold text-white">{conversation.unreadCount}</span>}
              </button>;
            }) : <div className="p-5 text-center"><MessageCircle className="mx-auto h-7 w-7 text-slate-200" /><p className="mt-3 text-xs font-semibold text-slate-600">No conversations yet</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Start a secure conversation with another member of your hospital.</p><button type="button" onClick={() => setShowNewChat(true)} className="mt-4 rounded-xl bg-[#1b7b68] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white">Start chat</button></div>}
          </div>
        </aside>

        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} min-w-0 flex-col bg-[#f8fafc]`}>
          {selectedConversation ? <>
            <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 md:hidden" aria-label="Back to conversations">←</button><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">{avatarLetters(conversationLabel(selectedConversation))}</div><div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-800">{conversationLabel(selectedConversation)}</h2><p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-slate-400">{selectedConversation.type.replace('_', ' ')} · {socketState === 'connected' ? 'Real-time connected' : 'Syncing via secure API'}</p></div></div>
              <button type="button" className="rounded-xl p-2 text-slate-400 hover:bg-slate-50" aria-label="Conversation options"><MoreHorizontal className="h-5 w-5" /></button>
            </header>

            {error && <div className="mx-4 mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#1b7b68]" /></div> : messages.length ? <div className="mx-auto max-w-3xl space-y-3">{messages.map((message) => {
                const mine = message.senderUserId === currentUserId;
                return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? 'rounded-br-md bg-[#1b7b68] text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'}`}><p className="whitespace-pre-wrap text-sm leading-5">{message.body || `[${message.type.toLowerCase()}]`}</p><div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? 'text-white/60' : 'text-slate-400'}`}>{formatTime(message.createdAt)}{mine && <Check className="h-3 w-3" />}</div></div></div>;
              })}</div> : <div className="flex h-full flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><MessageCircle className="h-6 w-6" /></div><h3 className="mt-4 text-sm font-bold text-slate-700">Start the conversation</h3><p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">Messages sent here are scoped to your hospital and delivered to the participants in this conversation.</p></div>}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
              <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1b7b68] focus-within:bg-white">
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onComposerKeyDown} rows={2} placeholder="Write a secure hospital message..." className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
                <div className="flex items-center justify-between"><button type="button" onClick={() => void send()} disabled={!draft.trim() || sending} className="flex items-center gap-2 rounded-xl bg-[#1b7b68] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Send</button></div>
              </div>
            </div>
          </> : <div className="flex h-full flex-col items-center justify-center p-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5f3] text-[#1b7b68]"><MessageCircle className="h-7 w-7" /></div><h2 className="mt-5 text-lg font-bold text-slate-800">Your hospital conversations</h2><p className="mt-1 max-w-md text-xs leading-5 text-slate-400">Select a conversation from the left, or start a new secure conversation with a staff member.</p><button type="button" onClick={() => setShowNewChat(true)} className="mt-5 flex items-center gap-2 rounded-xl bg-[#1b7b68] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white"><Plus className="h-3.5 w-3.5" />New conversation</button></div>}
        </section>

        <aside className="hidden border-l border-slate-100 bg-white p-4 lg:block">
          {selectedConversation ? <div className="space-y-5"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Conversation</p><h3 className="mt-1 text-sm font-bold text-slate-800">{conversationLabel(selectedConversation)}</h3><p className="mt-1 text-[10px] text-slate-400">{selectedConversation.priority || 'NORMAL'} priority</p></div>{typeof selectedConversation.patientId === 'object' && selectedConversation.patientId && <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">Patient context</p><p className="mt-2 text-sm font-bold text-slate-800">{selectedConversation.patientId.firstName} {selectedConversation.patientId.lastName}</p><p className="mt-1 text-[10px] text-slate-400">MRN: {selectedConversation.patientId.mrn || '—'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-white p-2"><p className="text-slate-400">Gender</p><p className="mt-0.5 font-semibold text-slate-700">{selectedConversation.patientId.gender || '—'}</p></div><div className="rounded-lg bg-white p-2"><p className="text-slate-400">Phone</p><p className="mt-0.5 font-semibold text-slate-700">{selectedConversation.patientId.phone || '—'}</p></div></div></div>}<div className="rounded-2xl border border-slate-100 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Participants</p><p className="mt-2 text-xs text-slate-500">{selectedConversation.participants?.length || 0} participant{selectedConversation.participants?.length === 1 ? '' : 's'}</p></div></div> : <div className="pt-3 text-center"><Users className="mx-auto h-6 w-6 text-slate-200" /><p className="mt-2 text-xs font-semibold text-slate-500">Conversation context</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Patient and participant details appear here when a conversation is selected.</p></div>}
        </aside>
      </div>

      {showNewChat && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1b7b68]">New conversation</p><h2 className="mt-1 text-lg font-bold text-slate-800">Start a hospital conversation</h2></div><button type="button" onClick={() => setShowNewChat(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50" aria-label="Close"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {([['DIRECT','Direct'],['GROUP','Group'],['PATIENT','Patient care'],['DEPARTMENT','Department']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => { setNewChatMode(value); setError(null); }} className={`rounded-lg px-2 py-2 text-[9px] font-bold uppercase tracking-wider ${newChatMode === value ? 'bg-white text-[#1b7b68] shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
        </div>

        {newChatMode === 'DIRECT' && <>
          <div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus value={staffSearch} onChange={(e) => void searchForStaff(e.target.value)} placeholder="Search by email or role" className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#1b7b68]" /></div>
          <div className="mt-3 max-h-64 overflow-y-auto">{searchingStaff ? <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-[#1b7b68]" /></div> : staffResults.length ? staffResults.map((staff) => { const name = `${staff.staff?.firstName || ''} ${staff.staff?.lastName || ''}`.trim() || staff.email; return <button key={staff.id} type="button" disabled={creatingChat} onClick={() => void startDirectChat(staff)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-[#e8f5f3]"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f5f3] text-xs font-bold text-[#1b7b68]">{avatarLetters(name)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{name}</p><p className="truncate text-[10px] text-slate-400">{staff.role || staff.staff?.jobTitle || staff.email}</p></div><UserPlus className="h-4 w-4 text-slate-300" /></button>; }) : <div className="p-6 text-center text-[11px] leading-5 text-slate-400">Enter at least two characters to search staff in your hospital.</div>}</div>
        </>}

        {newChatMode === 'GROUP' && <div className="mt-4 space-y-3"><input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="Group name" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1b7b68]" /><input value={staffSearch} onChange={(e) => void searchForStaff(e.target.value)} placeholder="Search staff to add" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1b7b68]" /><div className="max-h-44 overflow-y-auto">{staffResults.map((staff) => { const name = `${staff.staff?.firstName || ''} ${staff.staff?.lastName || ''}`.trim() || staff.email; const selected = selectedMembers.includes(staff.id); return <button key={staff.id} type="button" onClick={() => setSelectedMembers((current) => selected ? current.filter((id) => id !== staff.id) : [...current, staff.id])} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${selected ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'}`}><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{avatarLetters(name)}</div><span className="flex-1 text-xs font-semibold text-slate-700">{name}</span>{selected && <Check className="h-4 w-4 text-[#1b7b68]" />}</button>; })}</div><button type="button" disabled={creatingChat} onClick={() => void createSelectedConversation()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50">{creatingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}Create group</button></div>}

        {newChatMode === 'PATIENT' && <div className="mt-4 space-y-3"><select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1b7b68]"><option value="">Select patient</option>{patientOptions.map((item) => { const patient = item.patient; const id = idOf(patient?._id || patient?.id); return <option key={id} value={id}>{patient?.firstName} {patient?.lastName} · {patient?.mrn || 'No MRN'}</option>; })}</select><input value={staffSearch} onChange={(e) => void searchForStaff(e.target.value)} placeholder="Search care-team staff" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#1b7b68]" /><div className="max-h-40 overflow-y-auto">{staffResults.map((staff) => { const name = `${staff.staff?.firstName || ''} ${staff.staff?.lastName || ''}`.trim() || staff.email; const selected = selectedMembers.includes(staff.id); return <button key={staff.id} type="button" onClick={() => setSelectedMembers((current) => selected ? current.filter((id) => id !== staff.id) : [...current, staff.id])} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${selected ? 'bg-[#e8f5f3]' : 'hover:bg-slate-50'}`}><span className="flex-1 text-xs font-semibold text-slate-700">{name}</span>{selected && <Check className="h-4 w-4 text-[#1b7b68]" />}</button>; })}</div><button type="button" disabled={creatingChat} onClick={() => void createSelectedConversation()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50">{creatingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Create patient care chat</button></div>}

        {newChatMode === 'DEPARTMENT' && <div className="mt-4 space-y-3"><select value={selectedDepartmentId} onChange={(e) => setSelectedDepartmentId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1b7b68]"><option value="">Select department</option>{departmentOptions.map((department) => <option key={department._id} value={department._id}>{department.name} · {department.code}</option>)}</select><p className="rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500">Department channels are hospital-scoped. The backend checks your department membership when required.</p><button type="button" disabled={creatingChat} onClick={() => void createSelectedConversation()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1b7b68] text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50">{creatingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}Open department channel</button></div>}
        {error && <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
      </div></div>}

    </div>
  );
}
