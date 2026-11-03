"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, BellRing, LayoutDashboard, Menu, Search, Shield, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    { href: "/dashboard", label: "Telemetry", icon: LayoutDashboard },
    { href: "/search", label: "Search", icon: Search },
    { href: "/alerts", label: "Alerts", icon: BellRing },
    { href: "/explore", label: "Architecture", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080d1a]/90 border-b border-indigo-950/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#080d1a] rounded-[10px] flex items-center justify-center"><Activity className="w-4 h-4 text-cyan-400" /></div>
          </div>
          <div><span className="font-bold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">PulseMetrics</span><span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Cloud Analytics</span></div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((item) => <Link key={item.href} href={item.href} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"><item.icon className="w-4 h-4 text-cyan-400" />{item.label}</Link>)}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm text-slate-300 hover:text-white">Sign in</Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-500 hover:from-cyan-500 hover:to-indigo-400 shadow-md shadow-indigo-600/20">Launch console <ArrowRight className="w-4 h-4" /></Link>
        </div>

        <button onClick={() => setMobileMenuOpen((open) => !open)} className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Toggle navigation">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {mobileMenuOpen && <div className="lg:hidden border-t border-indigo-950 bg-[#080d1a] px-4 pt-3 pb-5 space-y-1">
        {links.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800 rounded-lg"><item.icon className="w-4 h-4 text-cyan-400" />{item.label}</Link>)}
        <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800 rounded-lg">Sign in</Link>
      </div>}
    </header>
  );
}