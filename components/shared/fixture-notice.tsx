import { Info } from 'lucide-react';
import type { DataSource } from '@/lib/contracts/public';
export function FixtureNotice({updatedAt,source='unavailable'}:{updatedAt:string;compact?:boolean;source?:DataSource;stale?:boolean}) {
 return <div className="data-note" role="note"><Info size={14}/><span>{source==='fixture'?'Local development fixtures · not live':source==='public-read-api'?'Public world data':'This world feed is not available yet.'}</span>{source==='public-read-api'&&<time dateTime={updatedAt}>{new Date(updatedAt).toLocaleDateString('en-GB')}</time>}</div>;
}
