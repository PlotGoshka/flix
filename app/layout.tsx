import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLIX — Money, under control",
  description:
    "A clear home for your subscriptions, recurring payments, and upcoming charges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
