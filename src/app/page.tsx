'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Activity,
  Zap,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Globe,
  Clock,
  Terminal,
  CheckCircle2,
  Copy,
  Plus,
  X
} from 'lucide-react';

interface LogStream {
  id: string;
  time: string;
  status: string;
  endpoint: string;
  duration: string;
  region: string;
}

const INITIAL_LOGS: LogStream[] = [
  { id: '1', time: '14:28:01.402', status: '200 OK', endpoint: 'POST /v1/telemetry/ingest', duration: '8.4ms', region: 'bom-1' },
  { id: '2', time: '14:28:01.912', status: '201 CREATED', endpoint: 'PUT /v2/vector/index', duration: '14.2ms', region: 'sin-1' },
  { id: '3', time: '14:28:02.108', status: '200 OK', endpoint: 'GET /v1/insights/aggregate', duration: '6.1ms', region: 'fra-1' },
  { id: '4', time: '14:28:02.845', status: '200 OK', endpoint: 'POST /v1/events/dispatch', duration: '11.8ms', region: 'iad-1' },
  { id: '5', time: '14:28:03.210', status: '200 OK', endpoint: 'GET /v1/nodes/health', duration: '3.9ms', region: 'tok-1' }
];

export default function HomePage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [logs, setLogs] = useState<LogStream[]>(INITIAL_LOGS);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [keyCreated, setKeyCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Periodic log stream generator
  useEffect(() => {
    const interval = setInterval(() => {
      const endpoints = [
        'POST /v1/telemetry/ingest',
        'GET /v1/metrics/stream',
        'POST /v1/alerts/evaluate',
        'PUT /v2/vector/index',
        'GET /v1/query/analytics'
      ];
      const regions = ['bom-1', 'sin-1', 'fra-1', 'iad-1', 'tok-1'];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const newEntry: LogStream = {
        id: String(Date.now()),
        time: timeStr,
        status: '200 OK',
        endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
        duration: (Math.random() * 12 + 4).toFixed(1) + 'ms',
        region: regions[Math.floor(Math.random() * regions.length)]
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 5)]);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const handleCopyKey = () => {
    navigator.clipboard.writeText('vx_live_9a8f4c21e0b573d88190af6');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden border-b border-indigo-950/60">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[250px] bg-indigo-600/15 blur-[110px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-indigo-800/60 text-xs font-semibold text-cyan-300 mb-6 shadow-sm">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>High-throughput real-time telemetry and edge analytics</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Next-Generation{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-emerald-400">
              PulseMetrics Cloud Analytics
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Distributed edge observability platform with sub-15ms global latency, live stream logs, and automated vector indexing.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create API Token</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-900/60 text-slate-200 hover:text-white font-semibold text-sm transition-all"
            >
              <span>View Live Telemetry</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Real-time KPI Metric Cards */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950/80 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Ingested Events (24h)</span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">48.2M</div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <span>↑ 18.4% vs last period</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950/80 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>p95 Global Latency</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 mt-2">12.4ms</div>
              <div className="text-[11px] text-slate-400 mt-1">Across 48 edge locations</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950/80 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Service Availability</span>
                <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">99.999%</div>
              <div className="text-[11px] text-cyan-400 mt-1">Zero downtime this quarter</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950/80 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Active Edge Instances</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-white mt-2">128 Nodes</div>
              <div className="text-[11px] text-emerald-400 mt-1">Auto-balanced across 12 zones</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Event Stream Console */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h2 className="text-2xl font-bold text-white tracking-tight">Live Telemetry Pipeline</h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">Streaming continuous micro-telemetry from edge proxy listeners.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">STREAMING LIVE</span>
          </div>
        </div>

        {/* Console Box */}
        <div className="rounded-2xl bg-[#080d1a] border border-indigo-950 shadow-2xl overflow-hidden font-mono text-xs">
          <div className="bg-[#0b1224] px-4 py-3 border-b border-indigo-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-slate-400 text-[11px]">telemetry.stream.prod</span>
            </div>
            <span className="text-slate-500 text-[11px]">Filter: ALL_REGIONS</span>
          </div>

          <div className="divide-y divide-indigo-950/40">
            {logs.map((log) => (
              <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{log.time}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {log.status}
                  </span>
                  <span className="text-white font-medium">{log.endpoint}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="text-cyan-300">{log.duration}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
                    {log.region}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 bg-[#040710] border-t border-indigo-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered For Massive Throughput
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Built natively with Next.js 15 App Router Edge runtime, WebSockets, and low-latency storage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Zero Cold Start Edge Ingestion</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requests route directly to the nearest geographic edge node without spinning up compute containers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Cryptographic Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every event payload is signed with HMAC SHA-256 tokens and validated against client public keys.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Vector Indexing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continuous background embeddings enable sub-millisecond semantic search across billions of logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API Key Generator Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-indigo-900/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => { setApiKeyModalOpen(false); setKeyCreated(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {keyCreated ? (
              <div className="space-y-4 py-2">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white text-center">API Token Generated</h3>
                <p className="text-xs text-slate-400 text-center">
                  Copy your token now. It will not be shown again.
                </p>

                <div className="p-3 bg-slate-950 rounded-xl border border-indigo-950 flex items-center justify-between font-mono text-xs">
                  <span className="text-cyan-300 truncate">vx_live_9a8f4c21e0b573d88190af6</span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => { setApiKeyModalOpen(false); setKeyCreated(false); }}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Access Control</span>
                  <h3 className="text-lg font-bold text-white mt-1">Generate Live API Token</h3>
                  <p className="text-xs text-slate-400">Used to authenticate edge telemetry and log streaming.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Token Description / Application</label>
                    <input
                      type="text"
                      defaultValue="Production Ingest Proxy"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Permission Scope</label>
                    <select className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500">
                      <option>Read & Write Telemetry (Full)</option>
                      <option>Write-Only Ingest</option>
                      <option>Read-Only Analytics Query</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setApiKeyModalOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setKeyCreated(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/30"
                  >
                    Generate Token
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
