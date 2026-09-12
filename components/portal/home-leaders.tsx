'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Crown, ArrowUpRight, Trophy } from 'lucide-react';
import type { PortalEnvelope, RankingsData, TournamentData } from '@/lib/portal/contracts';
import { displayCount } from './shared';
export function HomeLeaders({overall,daily,weekly}:{overall:PortalEnvelope<RankingsData>;daily:PortalEnvelope<TournamentData>;weekly:PortalEnvelope<TournamentData>}) {
 const [tab,setTab]=useState<'overall'|'daily'|'weekly'>('overall');
 const data={overall,daily,weekly}[tab]; const entries=data.data?.entries.slice(0,3)??[];
 return <div className="home-leaderboard"><fieldset className="leaderboard-tabs"><legend className="sr-only">Leaderboard period</legend>{(['overall','daily','weekly'] as const).map(t=><button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='overall'?'Top adventurers':t==='daily'?'Daily leaders':'Weekly leaders'}</button>)}</fieldset>
 {data.status==='fixture'&&<p className="data-note">Local development fixtures · not live</p>}
 {entries.length?<div className="home-leader-rows">{entries.map((entry,i)=><Link href={'/character/'+encodeURIComponent(entry.name)} className="home-leader-row" key={entry.name}><span className="rank-medal">{i===0?<Crown size={22}/>:entry.rank}</span><div><strong>{entry.name}</strong><small>{entry.jobName??'Adventurer'} · Level {entry.level}</small></div><b>{tab==='overall'?displayCount(entry.fame)+' fame':displayCount(entry.score)}</b><ArrowUpRight size={17}/></Link>)}</div>:<div className="home-leader-empty"><Trophy size={40} strokeWidth={1}/><h3>{tab==='overall'?'Every legend starts somewhere.':tab==='daily'?'A new challenge. Every day.':'A whole week to make your mark.'}</h3><p>{tab==='overall'?'Public standings will appear here when the world feed is connected.':'Competition standings and winners will appear when this event opens.'}</p><span className="pill">{tab==='overall'?'Standings unavailable':'Coming soon'}</span></div>}
 <Link className="leaderboard-footer" href={tab==='overall'?'/rankings':'/rankings/'+tab}>View {tab==='overall'?'all rankings':tab+' rankings'} <ArrowUpRight size={16}/></Link></div>;
}
