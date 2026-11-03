import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, AlertTriangle, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DashboardClient } from "@/components/DashboardClient";
import { getWorkspaceContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getWorkspaceContext();
  if (!context.ok && context.status === 401) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-[#060a14]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {context.ok ? (
          <DashboardClient
            workspaceId={context.workspace.id}
            workspaceName={context.workspace.name}
            role={context.role}
          />
        ) : (
          <div className="max-w-2xl mx-auto mt-12 rounded-3xl border border-amber-500/20 bg-[#090f20] p-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <AlertTriangle className="w-6 h-6 text-amber-300" />
            </div>
            <h1 className="text-2xl font-bold text-white mt-5">Workspace setup required</h1>
            <p className="text-sm text-slate-400 mt-2">{context.error}</p>
            <p className="text-xs text-slate-500 mt-4">The console will show real telemetry after the database schema and server credentials are configured. It will not display sample production metrics.</p>
            <Link href="/login" className="inline-flex items-center gap-2 mt-6 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white">Continue to sign in <ArrowRight className="w-4 h-4" /></Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}