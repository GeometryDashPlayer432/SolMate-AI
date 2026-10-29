import React, { useState, useEffect } from 'react';
import {
  Activity,
  Terminal,
  Play,
  Copy,
  Check,
  RefreshCw,
  Code,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { gateway, type GatewayTelemetry } from '../../services/workspaceGateway';
import { getAccessToken } from '../../services/firebase';

const PRESET_ENDPOINTS = [
  { service: 'Drive', method: 'GET', endpoint: 'https://www.googleapis.com/drive/v3/files?pageSize=10' },
  { service: 'Gmail', method: 'GET', endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5' },
  { service: 'Calendar', method: 'GET', endpoint: 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10' },
  { service: 'Tasks', method: 'GET', endpoint: 'https://tasks.googleapis.com/tasks/v1/users/@me/lists' },
  { service: 'People', method: 'GET', endpoint: 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=10' },
  { service: 'Chat', method: 'GET', endpoint: 'https://chat.googleapis.com/v1/spaces' },
  { service: 'Meet', method: 'POST', endpoint: 'https://meet.googleapis.com/v2/spaces', body: '{}' },
];

export const GatewayModule: React.FC = () => {
  const [telemetryList, setTelemetryList] = useState<GatewayTelemetry[]>([]);
  const [selectedService, setSelectedService] = useState('Drive');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE'>('GET');
  const [endpoint, setEndpoint] = useState('https://www.googleapis.com/drive/v3/files?pageSize=10');
  const [requestBody, setRequestBody] = useState('');
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionStatus, setExecutionStatus] = useState<number | string | null>(null);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    setTelemetryList(gateway.getHistory());
    const unsubscribe = gateway.subscribeTelemetry((item) => {
      setTelemetryList((prev) => [item, ...prev.slice(0, 49)]);
    });
    return () => unsubscribe();
  }, []);

  const handleSelectPreset = (preset: typeof PRESET_ENDPOINTS[0]) => {
    setSelectedService(preset.service);
    setMethod(preset.method as any);
    setEndpoint(preset.endpoint);
    setRequestBody(preset.body || '');
  };

  const handleExecuteRequest = async () => {
    setExecuting(true);
    setExecutionResult(null);
    setExecutionStatus(null);
    setExecutionDuration(null);

    const start = performance.now();
    try {
      let parsedBody: any = undefined;
      if (requestBody.trim()) {
        try {
          parsedBody = JSON.parse(requestBody);
        } catch {
          parsedBody = requestBody;
        }
      }

      const res = await gateway.execute({
        service: selectedService,
        endpoint,
        method,
        body: parsedBody,
      });

      const dur = Math.round(performance.now() - start);
      setExecutionStatus(200);
      setExecutionDuration(dur);
      setExecutionResult(res);
    } catch (err: any) {
      const dur = Math.round(performance.now() - start);
      setExecutionStatus('ERROR');
      setExecutionDuration(dur);
      setExecutionResult({ error: err.message });
    } finally {
      setExecuting(false);
    }
  };

  const generateCurl = async () => {
    const token = (await getAccessToken()) || 'OAUTH_BEARER_TOKEN';
    let curl = `curl -X ${method} "${endpoint}" \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Accept: application/json"`;
    if (requestBody.trim()) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/'/g, "\\'")}'`;
    }
    return curl;
  };

  const handleCopyCurl = async () => {
    const curl = await generateCurl();
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-emerald-500" />
              Unified Workspace API Gateway &amp; Dev Center
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Centralized API proxy, live execution telemetry, unified request routing, and test bench across all Google Workspace APIs.
            </p>
          </div>

          <button
            onClick={() => {
              gateway.clearHistory();
              setTelemetryList([]);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Telemetry Logs
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive API Explorer & Telemetry Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Request Runner */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-500" />
              Live Workspace API Explorer
            </h3>

            <button
              onClick={handleCopyCurl}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCurl ? 'cURL Copied' : 'Copy cURL'}
            </button>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Endpoint Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ENDPOINTS.map((p) => (
                <button
                  key={p.service}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedService === p.service && endpoint === p.endpoint
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {p.service}
                </button>
              ))}
            </div>
          </div>

          {/* Method + URL Input */}
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              onClick={handleExecuteRequest}
              disabled={executing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
              {executing ? 'Running...' : 'Execute'}
            </button>
          </div>

          {/* Request Body (for POST/PATCH) */}
          {(method === 'POST' || method === 'PATCH') && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                JSON Body Payload
              </label>
              <textarea
                rows={3}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                placeholder="{}"
              />
            </div>
          )}

          {/* Response Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Gateway Execution Response
              </span>

              {executionStatus !== null && (
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold ${
                      executionStatus === 200
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    HTTP {executionStatus}
                  </span>
                  {executionDuration && (
                    <span className="text-slate-400">{executionDuration} ms</span>
                  )}
                </div>
              )}
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
              {executionResult
                ? JSON.stringify(executionResult, null, 2)
                : '// Click "Execute" to trigger live request through the unified API gateway.'}
            </pre>
          </div>
        </div>

        {/* Live Telemetry Stream */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Live Gateway Telemetry Stream
            </h3>

            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {telemetryList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No telemetry recorded yet. Interact with any module (Drive, Gmail, Tasks, etc.) to view real-time gateway metrics.
              </div>
            ) : (
              telemetryList.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                    item.success
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {item.service} &bull; {item.method}
                    </span>

                    <span
                      className={`font-semibold text-[11px] ${
                        item.success ? 'text-emerald-600' : 'text-rose-500'
                      }`}
                    >
                      {item.status} ({item.durationMs}ms)
                    </span>
                  </div>

                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {item.endpoint}
                  </p>

                  {item.error ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      Error: {item.error}
                    </p>
                  ) : item.payloadSummary ? (
                    <p className="text-[10px] text-slate-400">
                      Result: {item.payloadSummary}
                    </p>
                  ) : null}

                  <div className="text-[10px] text-slate-400 pt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
