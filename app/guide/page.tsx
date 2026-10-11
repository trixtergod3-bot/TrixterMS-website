import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { BetaFaq } from '@/components/portal/beta-faq';
export const metadata = { title: 'Getting started & FAQ', description: 'TRIXTERMS beta installation, account availability, file verification and native login help.' };
export default function Guide() {
  return <main>
    <PageHero eyebrow="YOUR FIRST STEPS" title="Start your next adventure." description="Check beta access, install the official client and sign in through the native game screen." />
    <section className="shell portal-section">
      <div className="portal-three-grid">{[
        ['01', 'Check beta access', 'Review download and registration availability. Existing players can use their account when the matching game release is available.', '/register', 'Account availability'],
        ['02', 'Get the official client', 'Choose an available package on the download page. Extract archives into a writable folder, keep files together and let the supplied launcher verify the installation.', '/download', 'Downloads & installation'],
        ['03', 'Sign in and explore', 'Wait for Ready to play, press PLAY, then enter your ID and password on MapleStory’s native login screen.', '/status', 'Server information'],
      ].map(([step, title, copy, href, label]) => <article className="portal-panel" key={step}><span className="eyebrow">STEP {step}</span><h2>{title}</h2><p>{copy}</p><Link className="inline-link" href={href}>{label} →</Link></article>)}</div>
      <article className="portal-panel"><h2>A beta, built together.</h2><p>Follow the matching release notes for supported classes and content. Feature spotlights and the staged achievement catalog show the direction of the beta; in-development content is not a public release.</p><Link className="inline-link" href="/patch-notes">Read release notes →</Link></article>
    </section>
    <BetaFaq />
  </main>;
}
