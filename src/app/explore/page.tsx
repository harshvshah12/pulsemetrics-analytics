'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, Zap, Globe, Cpu, Database, Activity } from 'lucide-react';

export default function CapabilitiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="border-b border-indigo-950 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Cloud Architecture & Edge Topology</h1>
          <p className="text-slate-400 text-sm mt-1">
            Global high-frequency telemetry infrastructure designed for extreme developer velocity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Global Edge Routing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              BGP Anycast automatically directs traffic to the closest server among 128 points of presence, ensuring latency remains under 15ms globally.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">DuckDB In-Memory OLAP</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Embedded columnar data engines parse millions of telemetry rows in milliseconds without the operational overhead of a heavyweight external data warehouse.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#090f20] border border-indigo-950 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Real-Time Anomaly Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Lightweight WASM models inspect moving-window metric deviations and trigger alerts before end users experience degradation.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
