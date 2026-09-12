import { PageHero } from '@/components/shared/page-hero';
import { AchievementBrowser } from '@/components/portal/achievement-browser';
import { DataNote } from '@/components/portal/shared';
import { readPortal } from '@/lib/portal/data';
import type { AchievementsData, AchievementDefinition } from '@/lib/portal/contracts';
import stagedDefinitions from '@/lib/portal/staged-achievements.json';
export const dynamic='force-dynamic';
export const metadata={title:'Achievements'};
export default async function Achievements(){
 const result=await readPortal<AchievementsData>('/api/achievements');
 const definitions=result.data?.definitions??stagedDefinitions as AchievementDefinition[];
 const staged=!result.data;
 return <main><PageHero eyebrow="SMALL STEPS. GREAT STORIES." title="Make every milestone matter." description="From your first steps to your greatest victories, discover the milestones that make a TrixterMS journey your own."/><section className="shell portal-section"><div className="stat-grid"><div className="stat-tile"><span>Beta catalog</span><strong>{definitions.length} achievements</strong></div><div className="stat-tile"><span>Achievement points</span><strong>{(result.data?.totalPoints??definitions.reduce((sum,d)=>sum+d.points,0)).toLocaleString()} AP</strong></div><div className="stat-tile"><span>Paths to explore</span><strong>{new Set(definitions.map(d=>d.category)).size} categories</strong></div><div className="stat-tile"><span>Catalog version</span><strong>{result.data?.catalogVersion??2}</strong></div></div>{staged?<div className="portal-panel"><span className="pill">CATALOG PREVIEW</span><h2 style={{marginTop:16}}>Your future milestones.</h2><p>This is the staged, 40-achievement beta catalog. Live activation, character progress and rewards are awaiting verification. The broader 500-achievement collection remains a future design.</p></div>:<DataNote response={result}/>}<AchievementBrowser definitions={definitions} staged={staged}/></section></main>;
}
