import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, ListChecks, Vote } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { getPublicIntegrations } from '@/lib/portal/integrations';

export const metadata: Metadata = {
  title: 'Vote',
  description: 'Voting availability and the future TrixterMS community voting program.',
};

export default function VotePage() {
  const { vote } = getPublicIntegrations();
  return (
    <main>
      <PageHero eyebrow="Help the world grow" title="A little support. A larger community."
        description="Help more adventurers discover TrixterMS. The voting program will open here when its provider and rules are ready." />
      <section className="shell portal-section">
        <div className="portal-two-grid">
          <article className="portal-panel">
            <Vote size={32} aria-hidden="true" /><span className="pill">Coming soon</span>
            <h2>Voting is not open yet.</h2>
            <p>A voting partner has not been selected. There is no active vote link, voting cooldown or reward offer to claim today.</p>
            <button className="button button-gold" type="button" disabled={!vote.enabled}>Voting opens later</button>
          </article>
          <article className="portal-panel">
            <ListChecks size={28} aria-hidden="true" /><h2>When voting opens</h2>
            <ol>
              <li>Read the published provider, eligibility rules and any reward details.</li>
              <li>Use the official link on this page to complete a vote with the selected provider.</li>
              <li>Follow the published confirmation and claim instructions after your vote is verified.</li>
            </ol>
            <p>Any rewards and voting schedule will be announced before the program starts.</p>
          </article>
        </div>
        <article className="portal-panel">
          <HeartHandshake size={28} aria-hidden="true" /><h2>Be part of the beta.</h2>
          <p>Explore the current release, share feedback and follow the next community announcement.</p>
          <Link className="inline-link" href="/discord">Find the community <ArrowRight size={16} aria-hidden="true" /></Link>
        </article>
      </section>
    </main>
  );
}
