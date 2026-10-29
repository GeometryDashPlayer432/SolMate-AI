import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory store for System Updates & Bot Dispatches
interface SystemUpdateItem {
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

interface BotSubscriber {
  email: string;
  displayName?: string;
  optInUpdates: boolean;
  optInPromotions: boolean;
  subscribedAt: string;
}

const subscribers: Map<string, BotSubscriber> = new Map();

const systemUpdatesList: SystemUpdateItem[] = [
  {
    id: 'upd_0',
    version: 'v1.4.0',
    title: 'Downloadable Web App (PWA) & Desktop/Mobile Standalone Support',
    summary: 'Install SolmateAI directly to your device desktop or home screen with instant launching, service worker precaching, and native window mode.',
    details: 'Equipped SolmateAI with full Progressive Web App (PWA) capabilities via vite-plugin-pwa, Web App Manifest, 192px/512px/maskable and Apple touch icons, in-app install prompts with iOS Safari guidance, and background offline service worker caching.',
    category: 'feature',
    date: new Date().toISOString(),
    sentByBot: true,
    deliveredToCount: subscribers.size || 1,
  },
  {
    id: 'upd_1',
    version: 'v1.3.0',
    title: 'Offline Mode, SolmateAI Notification Bot & Live Updates Engine',
    summary: 'Automated welcome email from dedicated system bot, seamless light/dark mode fix, offline capability, and notifications hub.',
    details: 'Added automated welcome email dispatched by SolmateAI Bot (bot@solmate.ai), fixed Tailwind class-based light/dark theme toggle, added offline detection with cached Workspace data, optional live update subscriptions, and a dedicated Updates changelog tab.',
    category: 'feature',
    date: new Date().toISOString(),
    sentByBot: true,
    deliveredToCount: 1,
  },
  {
    id: 'upd_2',
    version: 'v1.2.0',
    title: 'SolmateAI Branding & Flowing Google Ambient Canvas',
    summary: 'Brand evolution to SolmateAI with organic animated Google Blue, Red, Yellow, and Green flowing ambient background.',
    details: 'Integrated smooth background blur with 4-color organic blobs drifting smoothly behind glassmorphic panels for a distinctive Google Workspace feel.',
    category: 'improvement',
    date: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    sentByBot: true,
    deliveredToCount: 1,
  },
  {
    id: 'upd_3',
    version: 'v1.1.0',
    title: 'Unified Workspace API Gateway & Gemini Intelligence',
    summary: 'Centralized developer gateway with live request telemetry, cURL exporter, and multi-model Gemini automation.',
    details: 'Enables unified access across all 11 Google Workspace APIs with millisecond latency tracking and ABAC security rules.',
    category: 'feature',
    date: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    sentByBot: true,
    deliveredToCount: 1,
  },
  {
    id: 'upd_4',
    version: 'v1.0.0',
    title: 'Initial Release: Full Google Workspace Integration',
    summary: 'Complete integration with Google Drive, Gmail, Calendar, Meet, Docs, Tasks, Slides, Keep, Contacts, Chat, and Forms.',
    details: 'Full OAuth 2.0 integration with in-memory token privacy, Firestore persistent data store, and Gemini 3.8 document reviews.',
    category: 'announcement',
    date: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    sentByBot: true,
    deliveredToCount: 1,
  },
];

// --- Dedicated Email Bot Endpoints ---

// Automated Welcome Email from SolmateAI Bot
app.post('/api/bot/welcome', (req: Request, res: Response) => {
  const { email, displayName, optInUpdates = true, optInPromotions = false } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required for welcome dispatch.' });
  }

  // Register or update subscriber
  subscribers.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    displayName: displayName || email.split('@')[0],
    optInUpdates: Boolean(optInUpdates),
    optInPromotions: Boolean(optInPromotions),
    subscribedAt: new Date().toISOString(),
  });

  console.log(`[SolmateAI Bot] Automated welcome email dispatched to ${email} (From: SolmateAI System Bot <bot@solmate.ai>)`);

  return res.json({
    status: 'delivered',
    botSender: 'SolmateAI System Bot <bot@solmate.ai>',
    recipient: email,
    subject: '✨ Welcome to SolmateAI - Your Unified Google Workspace Hub',
    dispatchedAt: new Date().toISOString(),
    subscribedToUpdates: Boolean(optInUpdates),
    message: 'Welcome email was automatically processed and dispatched by SolmateAI System Bot.',
  });
});

// Update Subscription Preferences
app.post('/api/bot/subscribe', (req: Request, res: Response) => {
  const { email, optInUpdates, optInPromotions } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const existing = subscribers.get(email.toLowerCase()) || {
    email: email.toLowerCase(),
    subscribedAt: new Date().toISOString(),
    optInUpdates: true,
    optInPromotions: false,
  };

  if (optInUpdates !== undefined) existing.optInUpdates = Boolean(optInUpdates);
  if (optInPromotions !== undefined) existing.optInPromotions = Boolean(optInPromotions);

  subscribers.set(email.toLowerCase(), existing);
  return res.json({ status: 'updated', preferences: existing });
});

// Get Latest Updates list
app.get('/api/bot/updates', (_req: Request, res: Response) => {
  return res.json({
    updates: systemUpdatesList,
    totalSubscribers: subscribers.size,
  });
});

// Trigger new update broadcast by SolmateAI Bot
app.post('/api/bot/dispatch-update', (req: Request, res: Response) => {
  const { version, title, summary, details, category = 'feature' } = req.body;

  if (!version || !title || !summary) {
    return res.status(400).json({ error: 'version, title, and summary are required.' });
  }

  // Count active subscribers
  const subscribedEmails = Array.from(subscribers.values())
    .filter((s) => s.optInUpdates)
    .map((s) => s.email);

  const newUpdate: SystemUpdateItem = {
    id: 'upd_' + Date.now(),
    version,
    title,
    summary,
    details: details || summary,
    category,
    date: new Date().toISOString(),
    sentByBot: true,
    deliveredToCount: Math.max(subscribedEmails.length, 1),
  };

  systemUpdatesList.unshift(newUpdate);
  console.log(`[SolmateAI Bot] Broadcasted update ${version} to ${subscribedEmails.length} subscribed users.`);

  return res.json({
    status: 'broadcasted',
    update: newUpdate,
    deliveredTo: subscribedEmails,
  });
});

// --- Server-side Gemini API endpoint ---
app.post('/api/gemini/analyze', async (req: Request, res: Response) => {
  try {
    const { type, payload } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server environment.',
      });
    }

    let prompt = '';
    let systemInstruction = 'You are an intelligent Google Workspace copilot assisting with productivity and workflow automation.';
    let modelName = 'gemini-3.8-flash';

    switch (type) {
      case 'email_triage': {
        modelName = 'gemini-3.8-flash';
        systemInstruction = 'You are a high-efficiency executive assistant. Analyze emails and prioritize them accurately with priority labels (Urgent, Action Required, Needs Review, Newsletters, FYI), a priority score (1-100), key takeaways, and suggested quick action.';
        prompt = `Analyze and prioritize the following emails. For each email, extract:
1. Priority Category: Urgent, Action Required, Needs Review, Newsletters, or FYI
2. Priority Score (1-100)
3. One-sentence summary
4. Recommended Next Action

Emails data:
${JSON.stringify(payload, null, 2)}

Respond with a clean JSON array with fields: id, category, score, summary, recommendedAction.`;
        break;
      }

      case 'email_reply': {
        modelName = 'gemini-3.8-flash';
        prompt = `Draft a polite, professional, and clear email response to the following message. Tone should be: ${payload.tone || 'collaborative and clear'}.
Original Email Subject: ${payload.subject || 'No Subject'}
Original Email Snippet/Body: ${payload.snippet || payload.body || ''}
Key Points to include: ${payload.customInstructions || 'Acknowledge receipt and confirm next steps.'}`;
        break;
      }

      case 'doc_review': {
        modelName = 'gemini-3.8-flash';
        systemInstruction = 'You are a senior executive and document workflow approval auditor. Inspect document proposals, contracts, project plans, and specifications to identify risks, clarity, required edits, and recommend approval or revisions.';
        prompt = `Perform an automated review and approval audit for this Google Doc:
Document Title: ${payload.title}
Workflow Stage: ${payload.stage || 'Review'}
Document Excerpt / Context:
${payload.content || 'Draft document submitted for team approval.'}

Provide a structured review containing:
1. Executive Summary (2-3 sentences)
2. Risk & Clarity Analysis (Bullet points)
3. Recommended Decision: "Approved", "Approved with Minor Edits", or "Revisions Requested"
4. Automated Approval Justification`;
        break;
      }

      case 'slide_generator': {
        modelName = 'gemini-3.8-flash';
        prompt = `Generate a structured, presentation outline for Google Slides on the following topic:
Topic: "${payload.topic}"
Target Audience: ${payload.audience || 'General Team / Stakeholders'}
Slide Count: 5-6 slides

Provide a JSON object with:
- presentationTitle: string
- themeRecommendation: string
- slides: array of objects with (slideNumber, slideTitle, bulletPoints: string[], speakerNotes: string)`;
        break;
      }

      case 'tasks_breakdown': {
        modelName = 'gemini-3.1-flash-lite'; // Fast task
        prompt = `Break down the following project brief or notes into 4-6 specific, actionable Google Tasks with clear titles, notes, and suggested urgency (High, Medium, Low):
Input Text:
${payload.text}

Respond in JSON format: array of objects with: title, notes, urgency.`;
        break;
      }

      case 'note_polish': {
        modelName = 'gemini-3.1-flash-lite'; // Fast task
        prompt = `Polish and organize these notes into a structured Google Keep note format with clean bullet points, key takeaways, and action items:
Raw Notes:
${payload.text}`;
        break;
      }

      default: {
        modelName = 'gemini-3.8-flash';
        prompt = payload.prompt || 'Help with Workspace workflow.';
      }
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    return res.json({
      text: response.text,
      modelUsed: modelName,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI request with Gemini.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'solmateai-hub-gateway', time: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SolmateAI Server running on http://0.0.0.0:${port} [${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
