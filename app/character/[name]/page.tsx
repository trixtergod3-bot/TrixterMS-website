import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { DataNote, EmptyState, metricLabels, displayCount } from '@/components/portal/shared';
import { readCharacterAchievementsVerified, readPortal } from '@/lib/portal/data';
import type { PublicRankingsData, TelemetryData } from '@/lib/portal/contracts';
import { readPublic } from '@/lib/portal/public-data';
import { TELEMETRY_KEYS } from '@/lib/portal/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Character profile' };

export default async function Character({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[A-Za-z0-9]{1,13}$/.test(name)) notFound();
  const [profile, achievements, telemetry] = await Promise.all([
    readPublic<PublicRankingsData>('/api/public/characters', { name, sort: 'level', page: 1, limit: 1 }),
    readCharacterAchievementsVerified(name),
    readPortal<TelemetryData>('/api/telemetry/' + name),
  ]);
  const p = profile.data?.entries[0] ?? null;
  const title = (key: string) => achievements.data?.compatibleDefinitions?.find((definition) => definition.key === key)?.name ?? key;

  return <main>
    <PageHero eyebrow="AN ADVENTURER’S STORY" title={p?.name ?? 'Character profile'} description={p ? 'Every level, every milestone, every step of the journey.' : 'Search for a public character to explore their journey.'} />
    <section className="shell portal-section">
      <Link className="inline-link" href="/rankings">← Back to rankings</Link>
      <DataNote response={profile} />
      {!p ? <div className="portal-panel"><EmptyState title="This character is not available.">The public profile feed is unavailable, or this character is not publicly listed.</EmptyState></div> : <>
        <div className="portal-character-banner">
          <div className="character-emblem profile-appearance-unavailable" aria-label="Character appearance unavailable"><span>Appearance</span><strong>Not connected</strong></div>
          <div><h2>{p.name}</h2><p>{p.jobName ?? 'Adventurer'} · Level {p.level} · Rank #{p.rank}</p><span className="pill">Fame {p.fame} · Guild {p.guildName || 'None'}</span><p>Current EXP {displayCount(p.exp)}</p></div>
        </div>
        <div className="portal-panel" style={{ marginTop: 20 }}>
          <h2>Character appearance</h2>
          <p>Saved hair, face, skin and equipped item IDs are not available from the active public bridge. No character image is shown until a compatible v111.1 renderer is connected to those public fields.</p>
        </div>
        <div className="portal-section-heading"><div><span className="eyebrow">THE JOURNEY SO FAR</span><h2>Adventure records.</h2></div></div>
        <DataNote response={telemetry} />
        <p className="data-note">Lifetime and daily totals are shown separately. Rankings use only their explicitly named lifetime totals; other economy coverage may remain partial.{telemetry.data && ' Daily timezone: ' + telemetry.data.zone + '.'}</p>
        <div className="portal-table-wrap"><table className="portal-table"><caption>Public telemetry · total dimension only</caption><thead><tr><th scope="col">Metric</th><th scope="col">Lifetime</th><th scope="col">Daily</th><th scope="col">Recorded date</th></tr></thead><tbody>{TELEMETRY_KEYS.map((key) => { const counter = telemetry.data?.counters.find((item) => item.metric === key && item.dimension === 'all'); return <tr key={key}><td>{metricLabels[key]}</td><td>{displayCount(counter?.lifetime)}</td><td>{displayCount(counter?.daily)}</td><td>{counter?.date ?? '—'}</td></tr>; })}</tbody></table></div>
        <div className="portal-section"><h2>Milestones &amp; achievements.</h2><DataNote response={achievements} />{achievements.data ? <>
          <div className="stat-tile"><span>Earned achievement points</span><strong>{achievements.data.points} / {achievements.data.totalPoints} AP</strong></div>
          <div className="achievement-grid" style={{ marginTop: 20 }}>{achievements.data.achievements.map((achievement) => { const current = BigInt(achievement.currentValue); const target = BigInt(achievement.threshold); const percentage = target > 0n ? Number((current > target ? target : current) * 100n / target) : 0; return <article className="achievement-card" key={achievement.key}><Award size={25} /><h3>{title(achievement.key)}</h3><p>{displayCount(achievement.currentValue)} / {displayCount(achievement.threshold)}</p><progress className="achievement-progress" aria-label={title(achievement.key)} value={percentage} max={100} /><div className="achievement-foot"><strong>{achievement.pointsAwarded} AP</strong><span>{achievement.unlockedAt ? 'Unlocked ' + new Date(achievement.unlockedAt).toLocaleDateString('en-GB') : 'In progress'}</span></div></article>; })}</div>
          <h3 style={{ marginTop: 30 }}>Recent unlocks</h3>{achievements.data.recentUnlocks.length ? <ul className="checklist">{achievements.data.recentUnlocks.map((achievement) => <li key={achievement.key}>{title(achievement.key)} · {achievement.pointsAwarded} AP · <time dateTime={achievement.unlockedAt}>{new Date(achievement.unlockedAt).toLocaleDateString('en-GB')}</time></li>)}</ul> : <p>No recent unlocks in the public feed.</p>}
        </> : <EmptyState title="More of your story is on its way.">Character progress and recent unlocks will appear when the achievement feed is connected.</EmptyState>}</div>
      </>}
    </section>
  </main>;
}
