export type ConversationType =
  | 'DIRECT'
  | 'GROUP'
  | 'DEPARTMENT'
  | 'PATIENT_CARE'
  | 'SUPPORT';

export type MessageType = 'TEXT' | 'FILE' | 'IMAGE' | 'SYSTEM';
export type ConversationPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT' | 'CRITICAL';
export type PresenceStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory =
  | 'GENERAL'
  | 'CLINICAL'
  | 'APPOINTMENT'
  | 'LABORATORY'
  | 'PHARMACY'
  | 'BILLING'
  | 'INSURANCE'
  | 'MEDICAL_RECORDS'
  | 'TECHNICAL';

export interface CommunicationParticipant {
  type?: string;
  userId?: string;
  joinedAt?: string;
  lastReadAt?: string;
  muted?: boolean;
}

export interface CommunicationPatient {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  mrn?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface Conversation {
  _id: string;
  hospitalId?: string;
  type: ConversationType;
  title?: string;
  departmentId?: string | { _id?: string; name?: string; code?: string };
  patientId?: string | CommunicationPatient;
  directKey?: string;
  participants: CommunicationParticipant[];
  priority?: ConversationPriority;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface MessageReadReceipt {
  userId: string;
  readAt: string;
}

export interface Message {
  _id: string;
  hospitalId?: string;
  conversationId: string;
  senderType?: string;
  senderUserId?: string;
  body?: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  readBy?: MessageReadReceipt[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffSearchResult {
  id: string;
  email: string;
  role?: string;
  staff?: {
    _id?: string;
    staffId?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    jobTitle?: string;
    profilePhotoUrl?: string;
    employment?: { departmentId?: string };
  };
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface Ticket {
  _id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description?: string;
  escalationReason?: string;
  patientId?: CommunicationPatient;
  assignedTo?: { _id?: string; email?: string; role?: string };
  assignedDepartmentId?: { _id?: string; name?: string; code?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface InboxResponse {
  items: Conversation[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MessagesResponse {
  items: Message[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface WebSocketEvent {
  type: string;
  hospitalId?: string;
  userIds?: string[];
  conversationId?: string;
  messageId?: string;
  ticketId?: string;
  payload?: any;
  occurredAt?: string;
}
