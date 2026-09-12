import { PageHero } from '@/components/shared/page-hero';
import { EmptyState } from '@/components/portal/shared';

export default function RankingsLoading() {
  return <main>
    <PageHero eyebrow="THE HALL OF ADVENTURERS" title="Leave your mark." description="Great journeys, one level at a time. Follow the adventurers making their way through TRIXTERMS." />
    <section className="shell portal-section" aria-busy="true" aria-label="Loading rankings">
      <div className="portal-panel"><EmptyState title="Finding the latest standings…">Loading the latest character records.</EmptyState></div>
    </section>
  </main>;
}
