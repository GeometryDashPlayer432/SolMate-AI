import { getAccessToken, auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

export interface GatewayTelemetry {
  id: string;
  service: string;
  endpoint: string;
  method: string;
  status: number | string;
  durationMs: number;
  timestamp: string;
  success: boolean;
  error?: string;
  payloadSummary?: string;
}

export type TelemetryListener = (telemetry: GatewayTelemetry) => void;

class WorkspaceAPIGateway {
  private listeners: Set<TelemetryListener> = new Set();
  private telemetryHistory: GatewayTelemetry[] = [];

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHistory(): GatewayTelemetry[] {
    return [...this.telemetryHistory];
  }

  public clearHistory() {
    this.telemetryHistory = [];
  }

  private notifyTelemetry(item: GatewayTelemetry) {
    this.telemetryHistory.unshift(item);
    if (this.telemetryHistory.length > 100) {
      this.telemetryHistory.pop();
    }
    this.listeners.forEach((listener) => {
      try {
        listener(item);
      } catch (err) {
        console.error('Telemetry listener error:', err);
      }
    });

    // Optionally log into Firestore asynchronously if user is signed in
    if (auth.currentUser) {
      const logId = item.id;
      const logDoc = doc(db, 'gateway_logs', logId);
      setDoc(logDoc, {
        userId: auth.currentUser.uid,
        service: item.service.slice(0, 64),
        endpoint: item.endpoint.slice(0, 256),
        status: String(item.status).slice(0, 32),
        durationMs: String(item.durationMs),
        timestamp: item.timestamp,
      }).catch((e) => {
        // Non-blocking telemetry log
        console.debug('Telemetry persistence notice:', e);
      });
    }
  }

  public async execute<T = any>(options: {
    service: string;
    endpoint: string;
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    queryParams?: Record<string, string | number | boolean | undefined>;
  }): Promise<T> {
    const {
      service,
      endpoint,
      method = 'GET',
      body,
      headers = {},
      queryParams,
    } = options;

    const token = await getAccessToken();
    if (!token) {
      const unauthErr: GatewayTelemetry = {
        id: 'gw_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        service,
        endpoint,
        method,
        status: 401,
        durationMs: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: 'No active Google Workspace OAuth access token. Please sign in.',
      };
      this.notifyTelemetry(unauthErr);
      throw new Error(unauthErr.error);
    }

    let url = endpoint;
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, val]) => {
        if (val !== undefined) searchParams.append(key, String(val));
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const start = performance.now();
    const reqHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...headers,
    };
    if (body && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const telemetryId = 'gw_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    try {
      const response = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });

      const durationMs = Math.round(performance.now() - start);
      const isJson = response.headers.get('content-type')?.includes('application/json');

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errData = isJson ? await response.json() : await response.text();
          if (typeof errData === 'object' && errData?.error?.message) {
            errMessage = errData.error.message;
          } else if (typeof errData === 'string') {
            errMessage = errData;
          }
        } catch {
          // ignore parsing error
        }

        const failTele: GatewayTelemetry = {
          id: telemetryId,
          service,
          endpoint,
          method,
          status: response.status,
          durationMs,
          timestamp: new Date().toISOString(),
          success: false,
          error: errMessage,
        };
        this.notifyTelemetry(failTele);
        throw new Error(`[${service} API Error ${response.status}] ${errMessage}`);
      }

      let data: any = null;
      if (response.status !== 204) {
        data = isJson ? await response.json() : await response.text();
      }

      const successTele: GatewayTelemetry = {
        id: telemetryId,
        service,
        endpoint,
        method,
        status: response.status,
        durationMs,
        timestamp: new Date().toISOString(),
        success: true,
        payloadSummary: isJson && data ? (Array.isArray(data.items || data.files || data.messages) ? `${(data.items || data.files || data.messages).length} items returned` : 'Data OK') : 'OK',
      };
      this.notifyTelemetry(successTele);

      return data as T;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      if (!err.message?.startsWith(`[${service} API Error`)) {
        this.notifyTelemetry({
          id: telemetryId,
          service,
          endpoint,
          method,
          status: 'NETWORK_ERR',
          durationMs,
          timestamp: new Date().toISOString(),
          success: false,
          error: err.message || 'Network request failed',
        });
      }
      throw err;
    }
  }

  // Google Drive
  public drive = {
    listFiles: (params?: { q?: string; pageSize?: number; fields?: string; orderBy?: string }) => {
      return this.execute<{ files: any[]; nextPageToken?: string }>({
        service: 'Drive',
        endpoint: 'https://www.googleapis.com/drive/v3/files',
        method: 'GET',
        queryParams: {
          pageSize: params?.pageSize || 25,
          q: params?.q || "trashed = false",
          fields: params?.fields || 'nextPageToken, files(id, name, mimeType, iconLink, webViewLink, thumbnailLink, modifiedTime, size, owners, shared)',
          orderBy: params?.orderBy || 'modifiedTime desc',
        },
      });
    },
    getFile: (fileId: string) => {
      return this.execute({
        service: 'Drive',
        endpoint: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
        method: 'GET',
        queryParams: {
          fields: 'id, name, mimeType, webViewLink, modifiedTime, size, description',
        },
      });
    },
    deleteFile: (fileId: string) => {
      return this.execute({
        service: 'Drive',
        endpoint: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
        method: 'DELETE',
      });
    },
  };

  // Gmail
  public gmail = {
    listMessages: (params?: { maxResults?: number; q?: string; pageToken?: string }) => {
      return this.execute<{ messages?: { id: string; threadId: string }[]; resultSizeEstimate?: number; nextPageToken?: string }>({
        service: 'Gmail',
        endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
        method: 'GET',
        queryParams: {
          maxResults: params?.maxResults || 20,
          q: params?.q || 'in:inbox',
          pageToken: params?.pageToken,
        },
      });
    },
    getMessage: (id: string) => {
      return this.execute<{
        id: string;
        threadId: string;
        labelIds: string[];
        snippet: string;
        payload: {
          headers: { name: string; value: string }[];
          body?: { data?: string; size: number };
          parts?: any[];
        };
        internalDate: string;
      }>({
        service: 'Gmail',
        endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`,
        method: 'GET',
        queryParams: { format: 'full' },
      });
    },
    modifyMessage: (id: string, body: { addLabelIds?: string[]; removeLabelIds?: string[] }) => {
      return this.execute({
        service: 'Gmail',
        endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}/modify`,
        method: 'POST',
        body,
      });
    },
    trashMessage: (id: string) => {
      return this.execute({
        service: 'Gmail',
        endpoint: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}/trash`,
        method: 'POST',
      });
    },
    sendEmail: (options: { to: string; subject: string; bodyHtml: string }) => {
      const { to, subject, bodyHtml } = options;
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        bodyHtml,
      ];
      const email = emailLines.join('\r\n');
      const bytes = new TextEncoder().encode(email);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const rawBase64Url = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      return this.execute<{ id: string; threadId: string; labelIds: string[] }>({
        service: 'Gmail',
        endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        body: { raw: rawBase64Url },
      });
    },
  };

  // Google Calendar
  public calendar = {
    listEvents: (params?: { maxResults?: number; timeMin?: string; q?: string }) => {
      return this.execute<{ items: any[] }>({
        service: 'Calendar',
        endpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        method: 'GET',
        queryParams: {
          maxResults: params?.maxResults || 25,
          timeMin: params?.timeMin || new Date().toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          q: params?.q,
        },
      });
    },
    createEvent: (eventData: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      attendees?: { email: string }[];
      addMeetCall?: boolean;
    }) => {
      const payload: any = {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        attendees: eventData.attendees,
      };
      if (eventData.addMeetCall) {
        payload.conferenceData = {
          createRequest: {
            requestId: 'meet_' + Date.now(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }
      return this.execute({
        service: 'Calendar',
        endpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        method: 'POST',
        queryParams: { conferenceDataVersion: eventData.addMeetCall ? 1 : 0 },
        body: payload,
      });
    },
    deleteEvent: (eventId: string) => {
      return this.execute({
        service: 'Calendar',
        endpoint: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
        method: 'DELETE',
      });
    },
  };

  // Google Tasks
  public tasks = {
    listTaskLists: () => {
      return this.execute<{ items: { id: string; title: string; updated: string }[] }>({
        service: 'Tasks',
        endpoint: 'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
        method: 'GET',
      });
    },
    listTasks: (taskListId: string = '@default') => {
      return this.execute<{ items?: any[] }>({
        service: 'Tasks',
        endpoint: `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`,
        method: 'GET',
        queryParams: { showCompleted: true, showHidden: true },
      });
    },
    createTask: (taskListId: string = '@default', task: { title: string; notes?: string; due?: string }) => {
      return this.execute({
        service: 'Tasks',
        endpoint: `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`,
        method: 'POST',
        body: task,
      });
    },
    updateTask: (taskListId: string = '@default', taskId: string, task: any) => {
      return this.execute({
        service: 'Tasks',
        endpoint: `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
        method: 'PATCH',
        body: task,
      });
    },
    deleteTask: (taskListId: string = '@default', taskId: string) => {
      return this.execute({
        service: 'Tasks',
        endpoint: `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
        method: 'DELETE',
      });
    },
  };

  // Google Docs
  public docs = {
    getDocument: (docId: string) => {
      return this.execute({
        service: 'Docs',
        endpoint: `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`,
        method: 'GET',
      });
    },
    createDocument: (title: string) => {
      return this.execute<{ documentId: string; title: string }>({
        service: 'Docs',
        endpoint: 'https://docs.googleapis.com/v1/documents',
        method: 'POST',
        body: { title },
      });
    },
  };

  // Google Sheets
  public sheets = {
    getSpreadsheet: (spreadsheetId: string) => {
      return this.execute({
        service: 'Sheets',
        endpoint: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`,
        method: 'GET',
      });
    },
    getValues: (spreadsheetId: string, range: string) => {
      return this.execute<{ values?: any[][] }>({
        service: 'Sheets',
        endpoint: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
        method: 'GET',
      });
    },
  };

  // Google Slides
  public slides = {
    getPresentation: (presentationId: string) => {
      return this.execute<{ presentationId: string; title: string; slides?: any[] }>({
        service: 'Slides',
        endpoint: `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}`,
        method: 'GET',
      });
    },
    createPresentation: (title: string) => {
      return this.execute<{ presentationId: string; title: string }>({
        service: 'Slides',
        endpoint: 'https://slides.googleapis.com/v1/presentations',
        method: 'POST',
        body: { title },
      });
    },
  };

  // Google People (Contacts)
  public people = {
    getConnections: (params?: { pageSize?: number; personFields?: string }) => {
      return this.execute<{ connections?: any[]; totalPeople?: number }>({
        service: 'People',
        endpoint: 'https://people.googleapis.com/v1/people/me/connections',
        method: 'GET',
        queryParams: {
          pageSize: params?.pageSize || 30,
          personFields: params?.personFields || 'names,emailAddresses,phoneNumbers,photos,organizations',
          sortOrder: 'FIRST_NAME_ASCENDING',
        },
      });
    },
    createContact: (person: {
      givenName: string;
      familyName?: string;
      email?: string;
      phone?: string;
      jobTitle?: string;
    }) => {
      const payload: any = {
        names: [{ givenName: person.givenName, familyName: person.familyName || '' }],
      };
      if (person.email) {
        payload.emailAddresses = [{ value: person.email, type: 'work' }];
      }
      if (person.phone) {
        payload.phoneNumbers = [{ value: person.phone, type: 'work' }];
      }
      if (person.jobTitle) {
        payload.organizations = [{ title: person.jobTitle }];
      }
      return this.execute({
        service: 'People',
        endpoint: 'https://people.googleapis.com/v1/people:createContact',
        method: 'POST',
        body: payload,
      });
    },
  };

  // Google Meet
  public meet = {
    createSpace: () => {
      return this.execute<{ name: string; meetingUri: string; meetingCode: string }>({
        service: 'Meet',
        endpoint: 'https://meet.googleapis.com/v2/spaces',
        method: 'POST',
        body: {},
      });
    },
  };

  // Google Chat
  public chat = {
    listSpaces: () => {
      return this.execute<{ spaces?: any[] }>({
        service: 'Chat',
        endpoint: 'https://chat.googleapis.com/v1/spaces',
        method: 'GET',
      });
    },
  };

  // Google Forms
  public forms = {
    getForm: (formId: string) => {
      return this.execute<{ formId: string; info: { title: string; description?: string }; items?: any[] }>({
        service: 'Forms',
        endpoint: `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`,
        method: 'GET',
      });
    },
  };
}

export const gateway = new WorkspaceAPIGateway();
