import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "PulseMetrics Cloud Analytics — High-throughput real-time telemetry and edge analytics",
  description: "Distributed edge observability platform with sub-15ms global latency, live stream logs, and automated vector indexing.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#070a12] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
