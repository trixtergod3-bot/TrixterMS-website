import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Heart, ReceiptText, ShieldCheck } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { getPublicIntegrations } from '@/lib/portal/integrations';

export const metadata: Metadata = {
  title: 'Support TrixterMS',
  description: 'Donation availability and future support information for TrixterMS.',
};

export default function DonatePage() {
  const { donation } = getPublicIntegrations();
  return (
    <main>
      <PageHero eyebrow="For the world we share" title="Support the next chapter."
        description="A future support program will have clear terms, published benefits and a secure checkout. For now, your beta feedback helps shape the world." />
      <section className="shell portal-section">
        <div className="portal-two-grid">
          <article className="portal-panel">
            <Heart size={32} aria-hidden="true" /><span className="pill">Not accepting payments</span>
            <h2>Donations are not open.</h2>
            <p>No payment provider or support package has been selected. There is no active checkout or donation reward offer.</p>
            <button className="button button-gold" type="button" disabled={!donation.enabled}>Support program coming later</button>
          </article>
          <article className="portal-panel">
            <ReceiptText size={28} aria-hidden="true" /><h2>What to expect before launch</h2>
            <ol>
              <li>Published package details, prices, eligibility and support terms.</li>
              <li>An official hosted checkout with the selected payment provider.</li>
              <li>A receipt and clear delivery information after payment confirmation.</li>
            </ol>
            <p>Benefits, delivery timing and refund terms will be available before any payment can be made.</p>
          </article>
        </div>
        <article className="portal-panel">
          <ShieldCheck size={28} aria-hidden="true" /><h2>Help improve the beta today.</h2>
          <p>Play, explore and tell us where your journey could be better. Follow the community page for the official place to share feedback.</p>
          <Link className="inline-link" href="/discord">Community and feedback <ArrowRight size={16} aria-hidden="true" /></Link>
        </article>
      </section>
    </main>
  );
}
