import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Commute Time Tracker",
  description: "Track your commute time and distance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
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
