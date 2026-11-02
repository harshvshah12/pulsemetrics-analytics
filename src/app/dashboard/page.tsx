'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Server, Activity, Shield, Key, Bell, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-950 pb-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Production Cluster Online</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Cloud Console & Resource Manager</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage edge pipelines, access tokens, and telemetry quotas.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-950 text-xs text-slate-300">
              Environment: <strong className="text-white">Production (Edge)</strong>
            </span>
          </div>
        </div>

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Active API Keys</span>
              <Key className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">3 Active</div>
            <div className="text-[11px] text-emerald-400 mt-1">1 created today</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Monthly Ingestion Quota</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">48.2M / 100M</div>
            <div className="text-[11px] text-slate-400 mt-1">48.2% consumed</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#090f20] border border-indigo-950">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Global SLA</span>
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">100%</div>
            <div className="text-[11px] text-slate-400 mt-1">Zero downtime recorded</div>
          </div>
        </div>

        {/* API Keys Table */}
        <div className="rounded-2xl bg-[#090f20] border border-indigo-950 overflow-hidden font-mono text-xs">
          <div className="p-5 border-b border-indigo-950 flex items-center justify-between font-sans">
            <h3 className="text-sm font-bold text-white">Active Access Tokens</h3>
            <span className="text-xs text-slate-400">Auth Tier: Pro Edge</span>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-sans">Production Ingest Gateway</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">vx_live_9a8f...0af6 • Full Write Scope</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
                Active
              </span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
