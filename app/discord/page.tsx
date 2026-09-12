import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, MessagesSquare, Radio, Users } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { getPublicIntegrations } from '@/lib/portal/integrations';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Discord community',
  description: 'Find the official TrixterMS Discord invite, community updates and beta information.',
};

export default function DiscordPage() {
  const { discordInviteUrl } = getPublicIntegrations();
  return (
    <main>
      <PageHero eyebrow="Your party starts here" title="Find your people."
        description="Meet fellow adventurers, follow the beta and share the moments that make a world worth returning to." />
      <section className="shell portal-section">
        <article className="portal-panel community-banner">
          <div>
            <MessagesSquare size={32} aria-hidden="true" />
            <span className="eyebrow">TRIXTERMS COMMUNITY</span>
            <h2>{discordInviteUrl ? 'The conversation continues on Discord.' : 'The official invite is on its way.'}</h2>
            <p>{discordInviteUrl ? 'Use the official community link to join TrixterMS on Discord.' : 'The community invite has not been published yet. Return here for the official link and follow the latest beta updates below.'}</p>
          </div>
          {discordInviteUrl
            ? <a className="button button-gold" href={discordInviteUrl} target="_blank" rel="noopener noreferrer">Join Discord <ArrowRight size={17} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            : <button className="button button-gold" type="button" disabled>Invite coming soon</button>}
        </article>
        <div className="portal-three-grid">
          <article className="portal-panel"><Radio size={27} aria-hidden="true" /><h2>Follow the beta.</h2><p>Read the latest published updates and see what is being prepared for the next release.</p><Link className="inline-link" href="/news">Read the news <ArrowRight size={16} aria-hidden="true" /></Link></article>
          <article className="portal-panel"><BookOpen size={27} aria-hidden="true" /><h2>Start your journey.</h2><p>Find installation guidance, release availability and the steps to your first in-game login.</p><Link className="inline-link" href="/download">Get started <ArrowRight size={16} aria-hidden="true" /></Link></article>
          <article className="portal-panel"><Users size={27} aria-hidden="true" /><h2>Check the world.</h2><p>See the current availability of public server information before planning your next session.</p><Link className="inline-link" href="/status">World status <ArrowRight size={16} aria-hidden="true" /></Link></article>
        </div>
      </section>
    </main>
  );
}
