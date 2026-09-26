import type { MetadataRoute } from 'next';
import { createSitemap } from '../lib/site-config.ts';

export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap();
}
