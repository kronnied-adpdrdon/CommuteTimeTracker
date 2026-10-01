import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppLinks from "@/components/AppLinks";
import BottomNav from "@/components/BottomNav";
import { THEME_BOOT_SCRIPT, ThemeSync } from "@/lib/theme";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <AppLinks />
        <div className="mobile-container">
          <main className="content-area">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
