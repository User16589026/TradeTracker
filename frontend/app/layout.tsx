import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Analytics Dashboard",
  description: "Professional MT5 Trading Performance Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex gap-6 text-sm">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            📊 Trade Tracker
          </Link>
          <Link href="/gold" className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
            🥇 FinRLX Gold
          </Link>
        </nav>

        {children}
      </body>
    </html>
  );
}
