import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdUnit } from "@/components/AdUnit";
import { DropZone } from "@/components/DropZone";
import { CONVERSIONS, getConversion, labelFor, relatedConversions } from "@/lib/formats";

type PageProps = {
  params: Promise<{ conversion: string }>;
};

export function generateStaticParams() {
  return CONVERSIONS.map((conversion) => ({ conversion: conversion.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { conversion: slug } = await params;
  const conversion = getConversion(slug);
  if (!conversion) {
    return {};
  }

  const from = labelFor(conversion.from);
  const to = labelFor(conversion.to);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://allfilesconvertor.com";
  const isMerge = conversion.intent === "merge";
  const toolTitle = isMerge ? "Merge PDFs" : `Convert ${from} to ${to}`;
  const description = isMerge
    ? "Merge multiple PDF files online for free with no sign-up, private temporary processing, and automatic cleanup after download."
    : `Convert ${from} to ${to} online for free with no sign-up, private temporary processing, and automatic cleanup after conversion.`;

  return {
    title: `${toolTitle} Free Online`,
    description,
    alternates: {
      canonical: `/${conversion.slug}`
    },
    openGraph: {
      title: `${toolTitle} Free Online - All Files Convertor`,
      description,
      url: `${siteUrl}/${conversion.slug}`
    },
    twitter: {
      card: "summary",
      title: `${toolTitle} Free Online`,
      description
    }
  };
}

export default async function ConversionPage({ params }: PageProps) {
  const { conversion: slug } = await params;
  const conversion = getConversion(slug);
  if (!conversion) {
    notFound();
  }

  const from = labelFor(conversion.from);
  const to = labelFor(conversion.to);
  const isMerge = conversion.intent === "merge";
  const toolTitle = isMerge ? "Merge PDFs" : `Convert ${from} to ${to}`;
  const related = relatedConversions(conversion);
  const faq = isMerge
    ? [
        {
          question: "Is it free to merge PDFs?",
          answer: "Yes, All Files Convertor is free to use. Uploads have practical size and batch limits to keep merges reliable."
        },
        {
          question: "Is my PDF safe when I upload it?",
          answer:
            "Your files are encrypted during upload, processed in an isolated container, and permanently deleted from our servers after download. We never store file contents."
        },
        {
          question: "How many PDFs can I merge?",
          answer: "Local defaults allow up to 20 files and 250MB total per batch."
        },
        {
          question: "Do I need to create an account?",
          answer: "No. All Files Convertor works without sign-up, logins, or account-based merge caps."
        }
      ]
    : [
        {
          question: `Is it free to convert ${from} to ${to}?`,
          answer: "Yes, All Files Convertor is free to use. Uploads have practical size and batch limits to keep conversions reliable."
        },
        {
          question: "Is my file safe when I upload it?",
          answer:
            "Your file is encrypted during upload, processed in an isolated container, and permanently deleted from our servers after download. We never store file contents."
        },
        {
          question: "How long does conversion take?",
          answer: "Most conversions complete in 5 to 30 seconds depending on file size and document complexity."
        },
        {
          question: "Do I need to create an account?",
          answer: "No. All Files Convertor works without sign-up, logins, or account-based conversion caps."
        }
      ];

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: isMerge ? "All Files Convertor PDF Merger" : `All Files Convertor ${from} to ${to} Converter`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://allfilesconvertor.com"}/${conversion.slug}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: isMerge ? "Free online PDF merger with private temporary processing." : `Free online ${from} to ${to} converter with private temporary processing.`
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <main className="px-4 pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="mx-auto max-w-5xl pb-10 pt-16 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.24em] text-accent2">Private conversion tool</p>
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {isMerge ? "Merge PDFs - free, private, fast" : `Convert ${from} to ${to} - free, private, fast`}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          {isMerge
            ? "Upload two or more PDF files and merge them into one PDF in a secure cloud container. All Files Convertor is built for quick merges without sign-ups, paywalls, or permanent file storage, so your documents move through the system only long enough to create the download."
            : `Upload a ${from} file and convert it to ${to} in a secure cloud container. All Files Convertor is built for quick conversions without sign-ups, paywalls, or permanent file storage, so your document moves through the system only long enough to create the download.`}
        </p>
      </section>

      <DropZone conversion={conversion} />

      <div className="mx-auto mt-12 max-w-6xl">
        <AdUnit slot="1111111111" />
      </div>

      <section className="mx-auto mt-14 max-w-4xl">
        <h2 className="text-2xl font-semibold">Questions about {isMerge ? "merging PDFs" : `${from} to ${to}`}</h2>
        <div className="mt-5 divide-y divide-border rounded-lg border border-border bg-surface">
          {faq.map((item) => (
            <div key={item.question} className="p-5">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-5xl">
        <h2 className="text-2xl font-semibold">Related tools</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => (
            <Link key={item.slug} href={`/${item.slug}`} className="rounded-lg border border-border bg-surface p-4 hover:border-accent">
              <span className="text-sm font-semibold">
                {labelFor(item.from)} to {labelFor(item.to)}
              </span>
              <p className="mt-2 text-xs text-muted">Private temporary conversion.</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
