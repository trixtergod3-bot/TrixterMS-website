import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarDays,
  MessagesSquare,
  Radio,
  Trophy,
} from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';

export const metadata: Metadata = {
  title: 'Community',
  description:
    'The TrixterMS community hub for a future verified Discord invite, server announcements, world records, and patch notes.',
};

export default function CommunityPage() {
  return (
    <main>
      <PageHero
        aside={
          <div className="hero-stat">
            <MessagesSquare aria-hidden="true" />
            <strong>Hub</strong>
            <span>community signals</span>
          </div>
        }
        description="One clear home for verified announcements, world records, patch notes, and Discord."
        eyebrow="Beyond the client"
        title="Community"
      />

      <section
        className="shell discord-panel"
        id="discord"
        aria-labelledby="discord-title"
      >
        <div className="discord-glyph" aria-hidden="true">
          <MessagesSquare />
        </div>
        <div>
          <span className="section-index">Official Discord</span>
          <h2 id="discord-title">Invite coming soon.</h2>
          <p>
            No Discord invite is present in the repository, so V1 keeps this
            call to action honest and safely disabled until the owner supplies
            the official destination.
          </p>
        </div>
        <span className="button button-disabled" aria-disabled="true">
          Discord link not published
        </span>
      </section>

      <section
        className="shell community-grid"
        aria-label="Community destinations"
      >
        <article>
          <BellRing aria-hidden="true" />
          <span>Announcements</span>
          <h2>World notices</h2>
          <p>
            Maintenance, events, and owner-approved updates can share the same
            dated public read models.
          </p>
          <Link href="/status">
            View current status <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </article>
        <article>
          <Trophy aria-hidden="true" />
          <span>World records</span>
          <h2>Verified leaders</h2>
          <p>
            Boss clears, farming efficiency, achievements, and seasons have
            contract-ready leaderboard views.
          </p>
          <Link href="/rankings">
            Explore rankings <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </article>
        <article>
          <CalendarDays aria-hidden="true" />
          <span>Development log</span>
          <h2>Dated changes</h2>
          <p>
            Patch-note structures preserve publication date, build identity,
            categories, and grouped changes.
          </p>
          <Link href="/patch-notes">
            Read patch notes <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </article>
      </section>

      <section className="community-boundary">
        <div className="shell community-boundary-grid">
          <div>
            <Radio aria-hidden="true" />
            <span>Public-safe signal</span>
            <h2>Website and Discord, one approved read boundary.</h2>
          </div>
          <p>
            Announcements and public world records can share the same sanitized
            models without exposing gameplay database access or private player
            data.
          </p>
          <BarChart3 aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
