import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/portal/contracts';
import { rankingSortOption } from '@/lib/portal/ranking-options';
import type { RankingSort } from '@/lib/portal/ranking-options';
import { displayCount } from './shared';
import styles from './live-rankings.module.css';

function displayScore(entry: LeaderboardEntry, sort: RankingSort): string | number {
  if (sort === 'level') return entry.exp ?? '—';
  if (sort === 'fame') return entry.fame;
  return entry.score ?? '—';
}

/** No synthetic player art: the portrait slot stays explicitly unavailable until a renderer is connected. */
export function RankingCards({ entries, sort }: { entries: LeaderboardEntry[]; sort: RankingSort }) {
  const scoreLabel = sort === 'level' ? 'Current EXP' : sort === 'fame' ? 'Fame' : rankingSortOption(sort).scoreLabel;
  return <ol className={styles.cards} aria-label="Live character rankings">
    {entries.map((entry) => {
      const medalClass = entry.rank === 1 ? styles.rank1 : entry.rank === 2 ? styles.rank2 : entry.rank === 3 ? styles.rank3 : '';
      return <li className={`${styles.card} ${medalClass}`} key={entry.name}>
        <div className={styles.cardBackdrop} aria-hidden="true" />
        <div className={styles.medal} aria-label={`Rank ${entry.rank}`}>
          {entry.rank <= 3 ? <Crown size={19} aria-hidden="true" /> : null}
          <span>{entry.rank <= 3 ? String(entry.rank).padStart(2, '0') : `#${entry.rank}`}</span>
        </div>
        <div className={styles.appearance} aria-label="Character appearance unavailable">
          <span>Character appearance</span>
          <strong>Not connected</strong>
        </div>
        <div className={styles.identity}>
          <span className={styles.classLine}>{entry.jobName ?? `Class ${entry.jobId}`} · Level {entry.level}</span>
          <h2><Link href={`/character/${encodeURIComponent(entry.name)}`}>{entry.name}</Link></h2>
          <div className={styles.details}>
            <span><small>Guild</small>{entry.guildName || 'No guild'}</span>
            <span><small>{scoreLabel}</small>{displayCount(displayScore(entry, sort))}</span>
            <span><small>Fame</small>{entry.fame.toLocaleString('en-US')}</span>
          </div>
        </div>
      </li>;
    })}
  </ol>;
}
