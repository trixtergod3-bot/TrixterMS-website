import type { PublicReadProvider, ApiResponse } from '../contracts/public.ts';
import { PUBLIC_API_SCHEMA_VERSION } from '../contracts/public.ts';
/**
 * Compatibility adapter for retained V2 editorial/optional components.
 * Primary beta routes use lib/portal/data.ts. Never silently replace failed live reads with fixtures.
 */
const empty=<T>(data:T):Promise<ApiResponse<T>>=>Promise.resolve({data,meta:{schemaVersion:PUBLIC_API_SCHEMA_VERSION,generatedAt:new Date().toISOString(),source:'unavailable',stale:true}});
const catalog={entries:[],availableCategories:['level'] as const,jobs:[],families:[],seasons:[],updatedAt:''};
const unavailableProvider:PublicReadProvider={
 getStatus:()=>Promise.reject(new Error('Use the beta status contract for nullable world state.')),
 getRankings:()=>empty({...catalog,availableCategories:['level']}),
 getCharacter:()=>empty(null),
 getClasses:()=>empty([]),getPatchNotes:()=>empty([]),getDailyRankings:()=>empty({...catalog,availableCategories:[]}),
 getWorldEvents:()=>empty([]),getAchievements:()=>empty([]),getBossRecords:()=>empty([]),getRareDrops:()=>empty([]),getEvents:()=>empty([])
};
// The legacy fixture module is never imported by production code.
export const publicReadProvider=unavailableProvider;
