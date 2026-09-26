import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { LiveRankings, type RankingFilters } from '@/components/portal/live-rankings';
import { readPortal } from '@/lib/portal/data';
import type { PublicRankingsData } from '@/lib/portal/contracts';
import { RANKING_CLASS_KEYS, RANKING_SORT_KEYS } from '@/lib/portal/ranking-options';
import type { RankingClass, RankingSort } from '@/lib/portal/ranking-options';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rankings' };

export default async function Rankings({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Keep the legacy numeric job query compatible while the UI uses class-line keys.
  const identity = typeof params.class === 'string' ? params.class : undefined;
  const classFilter = identity && RANKING_CLASS_KEYS.has(identity) ? identity as RankingClass : undefined;
  const job = !classFilter && typeof params.job === 'string' && /^\d{1,5}$/.test(params.job) ? params.job : undefined;
  const page = typeof params.page === 'string' && /^\d{1,5}$/.test(params.page) ? Math.max(1, Math.min(10000, Number(params.page))) : 1;
  const sort = typeof params.sort === 'string' && RANKING_SORT_KEYS.has(params.sort) ? params.sort as RankingSort : 'level';
  const filters: RankingFilters = { sort, job, class: classFilter, page };
  const result = await readPortal<PublicRankingsData>('/api/rankings', { ...filters, limit: 50 });

  return (
    <main>
      <PageHero eyebrow="THE HALL OF ADVENTURERS" title="Leave your mark." description="Great journeys, one level at a time. Follow the adventurers making their way through TRIXTERMS." />
      <section className="shell portal-section">
        <nav className="portal-tabs" aria-label="Ranking period">
          <Link href="/rankings" aria-current="page">Overall</Link>
          <Link href="/rankings/daily">Daily competition</Link>
          <Link href="/rankings/weekly">Weekly rankings</Link>
        </nav>
        <LiveRankings key={`${filters.sort}:${job ?? ''}:${classFilter ?? ''}:${page}`} initialResponse={result} filters={filters} />
      </section>
    </main>
  );
}
