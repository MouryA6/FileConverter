import Link from "next/link";
import { Lock, ShieldCheck, Trash2 } from "lucide-react";
import { AdUnit } from "@/components/AdUnit";
import { DropZone } from "@/components/DropZone";
import { PopularConversions } from "@/components/PopularConversions";
import { SponsorBanner } from "@/components/SponsorBanner";

export default function Home() {
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "All Files Convertor",
    url: "https://allfilesconvertor.com",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free online file converter with no sign-up, practical batch limits, and private temporary processing."
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-20 text-center">
        <div className="mx-auto mb-5 inline-flex rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent2">
          Zero files stored. Ever.
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-7xl">
          Convert anything. Keep everything private.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          All Files Convertor converts PDFs, images, Office documents, spreadsheets, and web files in the cloud without
          accounts, permanent storage, or daily conversion caps.
        </p>
      </section>

      <div className="px-4">
        <DropZone />
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-4">
        <AdUnit />
      </div>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-16 sm:grid-cols-3">
        {[
          { icon: Lock, title: "Encrypted", copy: "TLS in transit and encrypted temp processing." },
          { icon: ShieldCheck, title: "Clear limits", copy: "File, batch, and output limits keep conversions reliable." },
          { icon: Trash2, title: "Auto-deleted", copy: "Files are purged after download or automatic expiry." }
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-surface p-5">
            <item.icon className="mb-4 h-5 w-5 text-accent2" />
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{item.copy}</p>
          </div>
        ))}
      </section>

      <PopularConversions />

      <section className="px-4 pb-16">
        <SponsorBanner />
      </section>

      <footer className="border-t border-border px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Built with privacy in mind.</p>
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/about">About</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
