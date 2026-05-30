const { CONVERSIONS } = require("./lib/sitemap-conversions");

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://allfilesconvertor.com",
  generateRobotsTxt: true,
  changefreq: "weekly",
  priority: 0.8,
  exclude: ["/api/*"],
  additionalPaths: async () =>
    CONVERSIONS.map((conversion) => ({
      loc: `/${conversion.slug}`,
      changefreq: "weekly",
      priority: conversion.priority || 0.8,
      lastmod: new Date().toISOString()
    }))
};
