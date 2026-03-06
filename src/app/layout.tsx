import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Combat Nutrition Log Updater",
  description: "Protected daily_log.md update endpoint and UI."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
