import { CompetitionPage } from '@/components/portal/competition-page';
export const dynamic='force-dynamic';
export const metadata={title:'Daily rankings'};
export default async function Daily({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {return <CompetitionPage period="daily" params={await searchParams}/>}
