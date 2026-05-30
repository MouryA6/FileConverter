import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";
import { NavBar } from "@/components/NavBar";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://allfilesconvertor.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "All Files Convertor - Free Private File Convertor",
    template: "%s - All Files Convertor"
  },
  description: "Convert files online for free with no sign-up, private temporary processing, and automatic cleanup.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "All Files Convertor",
    description: "Free, privacy-first file conversion with temporary processing and automatic cleanup.",
    url: siteUrl,
    siteName: "All Files Convertor",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "All Files Convertor - Free Private File Convertor",
    description: "Convert files online for free with no sign-up, private temporary processing, and automatic cleanup."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en">
      <body className="font-sans">
        {adsenseClient ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        ) : null}
        {plausibleDomain ? (
          <Script defer data-domain={plausibleDomain} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
        ) : null}
        <NavBar />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
