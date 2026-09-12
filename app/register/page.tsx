import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { RegistrationForm } from '@/components/portal/registration-form';
import { getRegistrationAvailability } from '@/lib/portal/registration';
export const metadata: Metadata = { title: 'Register', description: 'Create a TrixterMS account and begin your MapleStory adventure.' };
export const dynamic = 'force-dynamic';
export default function RegisterPage() {
  const { enabled } = getRegistrationAvailability();
  return <main>
    <PageHero eyebrow="Your adventure starts here" title="Make it yours."
      description="One account. A new adventure. Create your ID here, then sign in inside MapleStory." />
    <section className="shell portal-grid portal-section">
      <RegistrationForm enabled={enabled} />
      <aside className="portal-panel"><span className="eyebrow">Ready for the journey</span>
        <h2>Sign in inside the game.</h2>
        <p>Your TrixterMS account uses MapleStory’s native ID and password screen. The launcher handles your game files.</p>
        <p>Already have an account? Download the client and use your existing login.</p>
        <Link className="button button-secondary" href="/download">Get TrixterMS</Link>
        <p>Password recovery is not available during this beta preparation. Keep your password somewhere safe.</p>
      </aside>
    </section>
  </main>;
}
