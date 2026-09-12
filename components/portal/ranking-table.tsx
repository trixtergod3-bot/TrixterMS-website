import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/portal/contracts';
import { displayCount, EmptyState } from './shared';
export function RankingTable({entries,competition=false}:{entries:LeaderboardEntry[];competition?:boolean}) {
 if(!entries.length)return <EmptyState title="The hall is waiting for its heroes.">Standings will appear when the public world feed is available. Check back for the next chapter.</EmptyState>;
 return <div className="portal-table-wrap"><table className="portal-table"><caption>{competition?'Competition standings · top 100':'Character standings · eligible characters level 30 and above'}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Adventurer</th><th scope="col">Class</th><th scope="col">Level</th><th scope="col">{competition?'Score':'Fame'}</th></tr></thead><tbody>{entries.map(e=><tr key={e.name}><td>{e.rank===1?<Crown size={19} aria-label="Rank one"/>:e.rank}</td><td><Link href={'/character/'+encodeURIComponent(e.name)}>{e.name}</Link></td><td>{e.jobName??'Class '+e.jobId}</td><td>{e.level}</td><td>{displayCount(competition?e.score:e.fame)}</td></tr>)}</tbody></table></div>;
}
