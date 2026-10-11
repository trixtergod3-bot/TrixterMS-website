import Link from 'next/link';
import { Gem, ArrowUpRight } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { FeatureGrid } from '@/components/portal/feature-grid';
export const metadata = { title: 'Server features', description: 'Explore TRIXTERMS class remasters, Boss Rush, Slayer, Astral worlds and progression, with clear beta release states.' };
export default function Features() {
  return <main>
    <PageHero eyebrow="CLASSIC ROOTS · A WORLD OF OUR OWN" title="More reasons to return." description="Familiar class journeys, celestial places and milestones that make the adventure yours." />
    <section className="shell portal-section">
      <div className="feature-introduction"><span className="pill">BETA FEATURE SPOTLIGHTS</span><p>Explore the direction of TRIXTERMS. These spotlights do not announce public availability: the matching client and server release notes confirm what you can play.</p><Link className="inline-link" href="/patch-notes">Check release notes <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      <FeatureGrid detailed />
      <article className="portal-panel" id="cubing"><div className="portal-feature-row"><Gem size={35} aria-hidden="true" /><div><span className="pill">BETA SYSTEM</span><h2 style={{ marginTop: 15 }}>Custom cubing, with a clear rule.</h2><p>For each displayed STR, DEX, INT or LUK percentage line, the maximum is <strong>floor(item level / 10)</strong>, capped at 20%. Lv100 is 10%, Lv150 is 15%, and Lv200 is 20%.</p><p>Miracle, Premium and Super cube policies provide different paths through two-to-five-line progression. Current release notes remain the guide to available systems.</p></div></div></article>
      <div className="portal-two-grid"><article className="portal-panel"><h2>Know your world.</h2><p>Explore item and monster information when the public database is available.</p><Link className="inline-link" href="/database">Game database →</Link></article><article className="portal-panel"><h2>Find your next trade.</h2><p>Browse Free Market listings when the public market service is available. Unavailable listings remain clearly marked.</p><Link className="inline-link" href="/free-market">Free Market →</Link></article></div>
    </section>
  </main>;
}
