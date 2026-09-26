import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/portal/contracts';
import { rankingSortOption } from '@/lib/portal/ranking-options';
import type { RankingSort } from '@/lib/portal/ranking-options';
import { displayCount, EmptyState } from './shared';
import styles from './live-rankings.module.css';

export function RankingTable({ entries, competition = false, sort = 'level' }: {
  entries: LeaderboardEntry[];
  competition?: boolean;
  sort?: RankingSort;
}) {
  if (!entries.length) return <EmptyState title="The hall is waiting for its heroes.">Standings will appear when the public world feed is available. Check back for the next chapter.</EmptyState>;

  return (
    <div className={`portal-table-wrap ${competition ? '' : styles.tableWrap}`}>
      <table className={`portal-table ${competition ? '' : styles.table}`}>
        <caption>{competition ? 'Competition standings · top 100' : 'Character standings · every level belongs here'}</caption>
        <thead><tr>
          <th scope="col">Rank</th><th scope="col">Character</th><th scope="col">Class</th><th scope="col">Level</th>
          {!competition && <th scope="col">Guild</th>}
          <th scope="col">{competition ? 'Score' : rankingSortOption(sort).scoreLabel}</th>
        </tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry.name}>
          <td data-label="Rank">{entry.rank === 1 ? <Crown size={19} aria-label="Rank one" /> : entry.rank}</td>
          <td data-label="Character">{/^[A-Za-z0-9]{1,13}$/.test(entry.name)
            ? <Link href={'/character/' + encodeURIComponent(entry.name)}>{entry.name}</Link>
            : entry.name}</td>
          <td data-label="Class">{entry.jobName ?? 'Class ' + entry.jobId}</td>
          <td data-label="Level">{entry.level}</td>
          {!competition && <td data-label="Guild">{entry.guildName || '—'}</td>}
          <td data-label={competition ? 'Score' : rankingSortOption(sort).scoreLabel}>{displayCount(competition || sort !== 'level' && sort !== 'fame' ? entry.score : sort === 'fame' ? entry.fame : entry.exp)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
