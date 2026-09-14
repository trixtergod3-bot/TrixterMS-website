import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/shared/page-hero';
import { DataNote } from '@/components/portal/shared';
import { RankingTable } from '@/components/portal/ranking-table';
import { readPortal } from '@/lib/portal/data';
import type { RankingsData } from '@/lib/portal/contracts';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Rankings'};
export default async function Rankings({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams;
 const sort=params.sort==='fame'?'fame':'level'; const job=typeof params.job==='string'&&/^\d{1,5}$/.test(params.job)?params.job:undefined;
 const page=typeof params.page==='string'&&/^\d{1,4}$/.test(params.page)?Math.max(1,Number(params.page)):1;
 const result=await readPortal<RankingsData>('/api/rankings',{sort,job,page,limit:100});
 const href=(p:number)=>'/rankings?'+new URLSearchParams({sort,page:String(p),...(job?{job}:{})});
 return <main><PageHero eyebrow="THE HALL OF ADVENTURERS" title="Leave your mark." description="Great journeys, one level at a time. Follow the adventurers making their way through TRIXTERMS."/><section className="shell portal-section"><nav className="portal-tabs" aria-label="Ranking period"><Link href="/rankings" aria-current="page">Overall</Link><Link href="/rankings/daily">Daily competition</Link><Link href="/rankings/weekly">Weekly rankings</Link></nav><form className="search-form" action="/rankings"><label className="field">Rank by<select name="sort" defaultValue={sort}><option value="level">Level / EXP</option><option value="fame">Fame</option></select></label><label className="field">Class<select name="job" defaultValue={job??''}><option value="">All classes</option>{[[112,'Hero'],[122,'Paladin'],[132,'Dark Knight'],[212,'Fire / Poison Arch Mage'],[222,'Ice / Lightning Arch Mage'],[232,'Bishop'],[312,'Bowmaster'],[322,'Marksman'],[412,'Night Lord'],[422,'Shadower'],[434,'Dual Blade'],[512,'Buccaneer'],[522,'Corsair']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button className="button button-gold" type="submit">Apply filters</button></form><DataNote response={result}/><div className="portal-panel"><RankingTable entries={result.data?.entries??[]}/></div><div className="portal-tabs">{page>1&&<Link href={href(page-1)}>Previous 100</Link>}{result.data?.total!==null&&result.data?.total!==undefined&&page*100<result.data.total&&<Link href={href(page+1)}>Next 100</Link>}</div><p className="data-note">Level rankings use level, current EXP, fame, then the server rank tie-break. Fame rankings use fame first. Staff and banned accounts are excluded.</p></section></main>;
}
