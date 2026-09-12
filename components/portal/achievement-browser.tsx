'use client';
import { useState } from 'react';
import { Award, Search } from 'lucide-react';
import type { AchievementDefinition } from '@/lib/portal/contracts';
import { EmptyState } from './shared';
export function AchievementBrowser({definitions,staged}:{definitions:AchievementDefinition[];staged:boolean}){
 const [query,setQuery]=useState('');const [category,setCategory]=useState('all');
 const categories=Array.from(new Set(definitions.map(d=>d.category)));
 const matches=definitions.filter(d=>(category==='all'||d.category===category)&&(d.name+' '+d.description).toLowerCase().includes(query.toLowerCase()));
 return <><div className="search-form"><label className="field">Find an achievement<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the catalog…" type="search" maxLength={80}/></label><label className="field">Your path<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{c.charAt(0)+c.slice(1).toLowerCase()}</option>)}</select></label><Search size={20} aria-hidden="true"/></div><output className="catalog-result-count">{matches.length} achievements · {staged?'Staged beta catalog · unlocks are not live':'Public catalog'}</output><div className="achievement-grid">{matches.map(d=><article key={d.key} className="achievement-card"><span className="pill">{d.category}</span><br/><Award size={28} strokeWidth={1.3}/><h3>{d.name}</h3><p>{d.description}</p><div className="achievement-foot"><strong>{d.points} AP</strong><span>{staged?'Catalog preview':'View character for progress'}</span></div></article>)}</div>{matches.length===0&&<EmptyState title="A different path, perhaps?">Try another search or category to find your next milestone.</EmptyState>}</>;
}
