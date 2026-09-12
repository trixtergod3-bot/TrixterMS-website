import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { LiveRankings, type RankingFilters } from '@/components/portal/live-rankings';
import { readPortal } from '@/lib/portal/data';
import type { RankingsData } from '@/lib/portal/contracts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Rankings' };

export default async function Rankings({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Job aliases also preserve a native form submission before hydration.
  const identity = params.class ?? params.job;
  const classFilter = identity === 'demon-avenger' || identity === 'paladin' ? identity : undefined;
  const job = !classFilter && typeof params.job === 'string' && /^\d{1,5}$/.test(params.job) ? params.job : undefined;
  const page = typeof params.page === 'string' && /^\d{1,5}$/.test(params.page) ? Math.max(1, Math.min(10000, Number(params.page))) : 1;
  const filters: RankingFilters = { sort: params.sort === 'fame' ? 'fame' : 'level', job, class: classFilter, page };
  const result = await readPortal<RankingsData>('/api/rankings', { ...filters, limit: 50 });

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
