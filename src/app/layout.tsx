import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppTelemetry } from "@/components/telemetry/app-telemetry";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Easy Life",
  description:
    "Онлайн-платформа для новичков: фото, видео и тексты с AI за 1 день.",
  icons: {
    icon: "/brand/ai-easy-life-avatar.png",
    shortcut: "/brand/ai-easy-life-avatar.png",
    apple: "/brand/ai-easy-life-avatar.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <AppTelemetry />
        </Suspense>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
