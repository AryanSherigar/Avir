import type { Metadata } from "next";
import { Navbar } from "@/components/common/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avir (अविर) — Smart Air Adaptation & Navigation",
  description:
    "Decision-support system for budget-conscious multigenerational urban Indian households during winter smog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="font-semibold text-slate-700">Avir (अविर) — Smart Air Adaptation & Navigation System</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Built on Next.js 15, React 19, CPCB Observation Data & Google Gemini Flash.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
