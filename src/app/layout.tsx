import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SeatScore - Find your dormant Copilot seats",
  description:
    "Upload your Microsoft 365 Copilot or ChatGPT Enterprise licence usage CSV. Get a one-page report of dormant seats and the GBP/month wasted in 30 seconds.",
  keywords: [
    "Microsoft 365 Copilot",
    "ChatGPT Enterprise",
    "licence utilisation",
    "seat audit",
    "AI consulting",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
