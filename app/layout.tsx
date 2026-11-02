import type { Metadata } from "next";
import { Bricolage_Grotesque, Newsreader } from "next/font/google";
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>);
}
