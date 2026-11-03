"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, LoaderCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createBrowserSupabaseClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password, options: { data: { workspace_name: workspaceName.trim() || undefined }, emailRedirectTo: window.location.origin + "/auth/callback" },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage("Check your inbox to confirm your email, then sign in.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#060a14] text-slate-100 flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-indigo-950 bg-[#090f20] p-8 shadow-2xl shadow-black/30">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-lg">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20"><Activity className="w-5 h-5 text-cyan-400" /></span>
          PulseMetrics
        </Link>
        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">Cloud observability</p>
          <h1 className="text-3xl font-bold text-white mt-2">{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
          <p className="text-sm text-slate-400 mt-2">{mode === "login" ? "Sign in to inspect telemetry and manage your services." : "Your account receives a private workspace automatically."}</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && <label className="block text-sm text-slate-300">Workspace name <span className="text-slate-500">(optional)</span>
            <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} maxLength={80} placeholder="Acme Engineering" className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500" />
          </label>}
          <label className="block text-sm text-slate-300">Email
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500" />
          </label>
          <label className="block text-sm text-slate-300">Password
            <input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 px-3 py-2 text-sm">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-3 py-2 text-sm">{message}</p>}
          <button disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white">
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="text-sm text-slate-400 mt-6 text-center">
          {mode === "login" ? "New to PulseMetrics?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }} className="text-cyan-300 hover:text-cyan-200 font-semibold">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}