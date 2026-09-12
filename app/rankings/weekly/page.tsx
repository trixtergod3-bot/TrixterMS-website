import { CompetitionPage } from '@/components/portal/competition-page';
export const dynamic='force-dynamic';
export const metadata={title:'Weekly rankings'};
export default async function Weekly({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <CompetitionPage period="weekly" params={await searchParams}/>}
