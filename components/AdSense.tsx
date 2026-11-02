import Script from "next/script";
import { ADSENSE_CLIENT } from "@/lib/site";

// Only render on pages with substantial written content; AdSense rejects ads on map-only and tool screens.
export default function AdSense() {
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
