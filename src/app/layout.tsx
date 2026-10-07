import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import AppLinks from "@/components/AppLinks";
import BottomNav from "@/components/BottomNav";
import SetupWizard from "@/components/SetupWizard";
import { DiagnosticsSync } from "@/lib/diagnostics";
import { AutoTrackingSync } from "@/lib/auto";
import { RemindersSync } from "@/lib/notifications";
import { SharingSync } from "@/lib/sharing";
import { THEME_BOOT_SCRIPT, ThemeSync } from "@/lib/theme";

// Downloaded once at build time and bundled with the app, so text renders offline.
// Barlow Condensed (highway-sign look) is for headings and big numbers; Barlow is for everything else.
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed", display: "swap" });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow", display: "swap" });

export const metadata: Metadata = {
  title: "MYCE",
  description: "MYCE: track your commute time and distance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the status and navigation bars; the CSS pads content with the safe-area insets.
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The boot script may set data-theme before React hydrates.
    <html lang="en" className={`${barlowCondensed.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <AppLinks />
        <DiagnosticsSync />
        <RemindersSync />
        <AutoTrackingSync />
        <SharingSync />
        <div className="mobile-container">
          <main className="content-area">
            {children}
          </main>
          <BottomNav />
          <SetupWizard />
        </div>
      </body>
    </html>
  );
}
