import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseMetrics Cloud Analytics — Telemetry and Observability",
  description: "Collect application telemetry, review persisted service metrics, search operational events and manage workspace alert rules.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#070a12] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
