import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

const labName = process.env.LAB_NAME ?? "Lab Internal Tool";
const appUrl = process.env.APP_URL ?? "/";
const marketingUrl = process.env.MARKETING_SITE_URL ?? "/";
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

export const metadata: Metadata = {
  title: labName,
  description: "Local-first lab website for instruments, manuals, maintenance logs, and reservations."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${sourceSerif.variable}`}>
        <div className="page-shell">
          <Header user={user} labName={labName} appUrl={appUrl} marketingUrl={marketingUrl} />
          <main className="page-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
