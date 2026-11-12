import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PullToRefresh from "@/components/PullToRefresh";
import { SITE_URL } from "@/lib/site";
import "./globals.css";
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--display" });
const body = Newsreader({ subsets: ["latin"], variable: "--body" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Scenic Rails",
  description: "Train routes mapped with the sights worth looking up for.",
  openGraph: {
    title: "Scenic Rails",
    description: "Train routes mapped with the sights worth looking up for.",
  },
  other: { monetag: "bff1dfe537a7ef92f5a5ff04e0de0c3e" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070b14" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <script src="https://quge5.com/88/tag.min.js" data-zone="309215" async data-cfasync="false" />
      </head>
      <body>{children}<PullToRefresh /><Analytics /><SpeedInsights /></body>
    </html>
  );
}
