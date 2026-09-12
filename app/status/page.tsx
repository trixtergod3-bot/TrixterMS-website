import { PageHero } from '@/components/shared/page-hero';
import { WorldStatusPanel } from '@/components/portal/world-status';
import { readPortal } from '@/lib/portal/data';
import type { StatusData } from '@/lib/portal/contracts';
export const dynamic='force-dynamic';
export const metadata={title:'Server status'};
export default async function Status() {
  const result = await readPortal<StatusData>('/api/status');
  return (
    <main>
      <PageHero eyebrow="THE WORLD AT A GLANCE" title="World status."
        description="Follow the world, find a channel, and see the current rates." />
      <section className="shell portal-section"><WorldStatusPanel response={result} /></section>
    </main>
  );
}
