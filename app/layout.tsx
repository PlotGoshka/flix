import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLIX — Subscription & Money Center",
  description: "Track subscriptions, recurring costs, and upcoming payments in one clear place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
