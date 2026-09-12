import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/page-hero';
import { DatabaseBrowser, type DatabaseCategory } from '@/components/portal/database-browser';
import type { DatabaseItemsData, DatabaseMobsData } from '@/lib/portal/contracts';
import { readPortal } from '@/lib/portal/data';

export const metadata: Metadata = {
  title: 'Game database',
  description: 'Find items, equipment, monsters and bosses in the TRIXTERMS public game catalog.',
};

type SearchParams = Record<string, string | string[] | undefined>;
const categories: DatabaseCategory[] = ['items', 'equipment', 'monsters', 'bosses', 'maps', 'skills'];
function searchText(value: string | string[] | undefined) {
  if (typeof value !== 'string') return '';
  let cleaned = '';
  for (const char of value) if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127) cleaned += char;
  return cleaned.trim().slice(0, 80);
}

export default async function DatabasePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const selected = typeof params.type === 'string' ? params.type : 'items';
  const category = categories.includes(selected as DatabaseCategory) ? selected as DatabaseCategory : 'items';
  const query = searchText(params.q);
  const page = typeof params.page === 'string' && /^\d{1,5}$/.test(params.page)
    ? Math.min(10000, Math.max(1, Number(params.page))) : 1;
  const itemResponse = category === 'items' || category === 'equipment'
    ? await readPortal<DatabaseItemsData>('/api/database/items', { q: query || undefined, category: category === 'equipment' ? 'equipment' : undefined, page, limit: 24 })
    : undefined;
  const mobResponse = category === 'monsters' || category === 'bosses'
    ? await readPortal<DatabaseMobsData>('/api/database/mobs', { q: query || undefined, boss: category === 'bosses' ? 'true' : 'false', page, limit: 24 })
    : undefined;

  return (
    <main>
      <PageHero eyebrow="The adventurer’s archive" title="Know your next discovery."
        description="Explore the equipment, creatures and encounters that shape your journey through TRIXTERMS." />
      <section className="shell portal-section" aria-label="Search the game database">
        <DatabaseBrowser category={category} query={query} page={page} itemResponse={itemResponse} mobResponse={mobResponse} />
      </section>
    </main>
  );
}
