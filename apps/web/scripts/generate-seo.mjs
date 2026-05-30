import { mkdir, writeFile } from "node:fs/promises";
import { CONVERSIONS } from "../lib/sitemap-conversions.js";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://allfilesconvertor.com";
const today = new Date().toISOString();

const staticRoutes = [
  { loc: "/", changefreq: "weekly", priority: 1 },
  { loc: "/about", changefreq: "monthly", priority: 0.6 },
  { loc: "/privacy", changefreq: "monthly", priority: 0.5 },
  { loc: "/terms", changefreq: "monthly", priority: 0.5 },
  { loc: "/api-docs", changefreq: "monthly", priority: 0.4 }
];

const routes = [
  ...staticRoutes,
  ...CONVERSIONS.map((conversion) => ({
    loc: `/${conversion.slug}`,
    changefreq: "weekly",
    priority: conversion.priority || 0.8
  }))
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${siteUrl}${route.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;

await mkdir("public", { recursive: true });
await writeFile("public/sitemap.xml", sitemap);
await writeFile("public/robots.txt", robots);
