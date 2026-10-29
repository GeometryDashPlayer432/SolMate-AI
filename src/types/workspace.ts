export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  size?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
  shared?: boolean;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  labelIds: string[];
  priorityCategory?: 'urgent' | 'action_required' | 'meetings' | 'newsletters' | 'general';
  priorityScore?: number;
  aiSummary?: string;
  recommendedAction?: string;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string; label?: string }[];
  };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  htmlLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  parent?: string;
  completed?: string;
}

export interface ContactPerson {
  resourceName: string;
  displayName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  jobTitle?: string;
}

export interface ChatSpaceItem {
  name: string;
  displayName: string;
  type: string;
  spaceType?: string;
  externalUserAllowed?: boolean;
}

export interface DocWorkflowRecord {
  id: string;
  userId: string;
  title: string;
  docId: string;
  docTitle: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  approverEmail: string;
  requesterEmail: string;
  aiReview?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeepNoteRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemUpdateItem {
  id: string;
  version: string;
  title: string;
  summary: string;
  details: string;
  category: 'feature' | 'improvement' | 'security' | 'announcement';
  date: string;
  sentByBot: boolean;
  deliveredToCount: number;
}

export interface UserNotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'welcome' | 'update' | 'promo' | 'system';
  read: boolean;
  createdAt: string;
  botSender?: string;
}
