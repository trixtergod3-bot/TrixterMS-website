import Link from 'next/link';
import { ArrowRight, Compass, Radio } from 'lucide-react';
import type { PortalEnvelope } from '@/lib/portal/contracts';
export function DataNote({response}: {response:PortalEnvelope<unknown>}) {
 return <output className={'data-note data-note-'+response.status}><Radio size={14} aria-hidden="true"/><span>{response.status==='live'?'Live public data':response.status==='fixture'?'Local development fixture · not live':response.status==='disabled'?'Coming in a future update':'Data unavailable'}{response.asOf&&<> · <time dateTime={response.asOf}>{new Date(response.asOf).toLocaleString('en-GB',{timeZone:'UTC'})} UTC</time></>}</span></output>;
}
export function EmptyState({title='The next chapter is on its way.',children}:{title?:string;children:React.ReactNode}) {
 return <div className="portal-empty"><div className="empty-emblem"><Compass size={32} strokeWidth={1}/></div><h3>{title}</h3><p>{children}</p></div>;
}
export function SectionHeading({eyebrow,title,href,label}:{eyebrow:string;title:string;href?:string;label?:string}) {
 return <div className="portal-section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{href&&<Link className="inline-link" href={href}>{label??'Explore'} <ArrowRight size={16}/></Link>}</div>;
}
export const metricLabels: Record<string,string> = {
 'combat.mobs_killed':'Mobs defeated','combat.bosses_killed':'Bosses defeated','combat.unique_bosses_killed':'Unique bosses','combat.deaths':'Deaths',
 'progress.exp_earned':'EXP earned','economy.mesos_earned':'Mesos earned','economy.mesos_spent':'Mesos spent','economy.nx_earned':'NX earned','economy.nx_spent':'NX spent','items.cubes_found':'Cubes found','items.cubes_spent':'Cubes used','items.glasses_spent':'Glasses used'
};
export function displayCount(value:string|number|null|undefined) { if(value===null||value===undefined)return '—'; try{return BigInt(value).toLocaleString('en-US')}catch{return '—'} }
