import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScholarHub — Verified Scholarship Discovery & Readiness",
  description: "Discover verified master's and bachelor's scholarships in Germany and Europe. Check your eligibility and manage document requirements.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

