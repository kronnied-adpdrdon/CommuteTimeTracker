import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import AppLinks from "@/components/AppLinks";
import BottomNav from "@/components/BottomNav";
import PlacesDialog from "@/components/PlacesDialog";
import { DiagnosticsSync } from "@/lib/diagnostics";
import { RemindersSync } from "@/lib/notifications";
import { THEME_BOOT_SCRIPT, ThemeSync } from "@/lib/theme";

// Downloaded once at build time and bundled with the app, so text renders offline.
// Fraunces (serif) is for headings and big numbers; DM Sans is for everything else.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Commute Time Tracker",
  description: "Track your commute time and distance",
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
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <AppLinks />
        <DiagnosticsSync />
        <RemindersSync />
        <div className="mobile-container">
          <main className="content-area">
            {children}
          </main>
          <BottomNav />
          <PlacesDialog />
        </div>
      </body>
    </html>
  );
}
