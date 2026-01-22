// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { getD1, getAllDoctorIds, type D1Database } from '../lib/d1';

const siteUrl = 'https://score-madmedcheck2.pages.dev';

export const GET: APIRoute = async ({ locals }) => {
  // Cloudflare D1 바인딩
  const runtime = (locals as { runtime?: { env?: { DB?: D1Database } } }).runtime;
  const db = getD1(runtime);
  const doctorIds = await getAllDoctorIds(db);

  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/about', priority: '0.8', changefreq: 'weekly' },
  ];

  const doctorPages = doctorIds.map((id) => ({
    url: `/doctor/${id}`,
    priority: '0.9',
    changefreq: 'weekly',
  }));

  const allPages = [...staticPages, ...doctorPages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages
  .map(
    (page) => `  <url>
    <loc>${siteUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
