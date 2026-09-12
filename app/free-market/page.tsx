import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/page-hero';
import { MarketBrowser } from '@/components/portal/market-browser';
import type { FreeMarketData } from '@/lib/portal/contracts';
import { readPortal } from '@/lib/portal/data';

export const metadata: Metadata = {
  title: 'Free Market',
  description: 'Browse TrixterMS shop NPCs, item prices, currencies and published shop rules.',
};

type SearchParams = Record<string, string | string[] | undefined>;
function searchText(value: string | string[] | undefined, max: number) {
  if (typeof value !== 'string') return '';
  let cleaned = '';
  for (const char of value) if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127) cleaned += char;
  return cleaned.trim().slice(0, max);
}

export default async function FreeMarketPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = searchText(params.q, 80);
  const category = searchText(params.category, 96);
  const page = typeof params.page === 'string' && /^\d{1,5}$/.test(params.page)
    ? Math.min(10000, Math.max(1, Number(params.page))) : 1;
  const response = await readPortal<FreeMarketData>('/api/free-market', { q: query || undefined, category: category || undefined, page, limit: 24 });

  return (
    <main>
      <PageHero eyebrow="Meet at the market" title="Find your next upgrade."
        description="Explore shopkeepers, compare published prices and plan your visit to the Free Market." />
      <section className="shell portal-section" aria-label="Browse Free Market shops">
        <MarketBrowser response={response} query={query} category={category} page={page} />
      </section>
    </main>
  );
}
