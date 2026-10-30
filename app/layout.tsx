import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--display" });
const body = Newsreader({ subsets: ["latin"], variable: "--body" });
export const metadata: Metadata = {
  title: "Scenic Rails",
  description: "Train routes mapped with the sights worth looking up for.",
  openGraph: {
    title: "Scenic Rails",
    description: "Train routes mapped with the sights worth looking up for.",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#070b14" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6491192497291818" crossOrigin="anonymous" />
      </head>
      <body>{children}<Analytics /><SpeedInsights /></body>
    </html>
  );
}
