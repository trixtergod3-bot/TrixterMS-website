/** Public DTOs. Database identifiers, account fields, and credentials never belong here. */
export type PortalState = "live" | "stale" | "unavailable" | "disabled" | "fixture";
export interface PortalEnvelope<T> {
  status: PortalState;
  data: T | null;
  asOf: string | null;
  message: string;
  source: "backend" | "none" | "development";
}
export interface StatusData {
  online: boolean | null;
  playersOnline: number | null;
  version: string | null;
  rates: { exp: number | null; meso: number | null; drop: number | null };
}
export interface LeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  jobId: number;
  jobName: string | null;
  fame: number;
  score: string | null;
  /** Exact persisted EXP; mandatory for overall rankings, absent on legacy competitions. */
  exp?: string;
  guildName?: string | null;
}
export interface RankingsData { entries: LeaderboardEntry[]; total: number | null; page?: number; pageSize?: number }
/** RC1 standing collections always include complete, bounded pagination metadata. */
export interface PublicRankingsData {
  entries: (LeaderboardEntry & { exp: string; guildName: string | null; score: null })[];
  total: number;
  page: number;
  pageSize: number;
}
export interface PublicStatsData {
  totalCharacters: number;
  classDistribution: { jobName: string; count: number }[];
  rankingSnapshotAt: string;
}
export interface PublicTelemetryData extends PublicStatsData {
  online: boolean | null;
  playersOnline: number | null;
  channels: { channel: number; status: "online" | "offline" | "unknown"; playersOnline: number | null }[];
  uptimeSeconds: number | null;
  rates: { exp: number | null; meso: number | null; drop: number | null };
  runtimeAsOf: string | null;
  runtimeStatus: "live" | "unavailable";
  /** No reviewed aggregate activity source is activated in RC1. */
  recentActivity: null;
}
export interface TournamentData extends RankingsData {
  metric: string;
  date: string | null;
  weekStart: string | null;
  weekEnd: string | null;
  zone: string;
  finalized: boolean;
  winner: string | null;
}
export interface CharacterData {
  name: string;
  level: number;
  jobId: number;
  jobName: string | null;
  fame: number;
  world: number;
  rank: number | null;
}
export interface AchievementDefinition {
  key: string;
  category: string;
  name: string;
  description: string;
  eventKey: string;
  dimension: string;
  aggregation: "SNAPSHOT" | "DELTA" | "UNIQUE";
  threshold: string;
  points: number;
  displayOrder: number;
  enabled: boolean;
}
export interface AchievementsData {
  catalogVersion: number;
  catalogKey: string;
  totalPoints: number;
  definitions: AchievementDefinition[];
}
export interface CharacterAchievementsData {
  name: string;
  catalogVersion: number;
  points: number;
  totalPoints: number;
  achievements: { key: string; currentValue: string; threshold: string; unlockedAt: string | null; pointsAwarded: number }[];
  recentUnlocks: { key: string; unlockedAt: string; pointsAwarded: number }[];
  /** Added only after the reader matches the character response to the validated live catalog. */
  compatibleDefinitions?: AchievementDefinition[];
}
export const TELEMETRY_KEYS = [
  "combat.mobs_killed", "combat.bosses_killed", "combat.unique_bosses_killed", "combat.deaths",
  "progress.exp_earned", "economy.mesos_earned", "economy.mesos_spent", "economy.nx_earned",
  "economy.nx_spent", "items.cubes_found", "items.cubes_spent", "items.glasses_spent",
] as const;
export type TelemetryMetric = typeof TELEMETRY_KEYS[number];
export interface TelemetryData {
  name: string;
  zone: string;
  coverage: "partial" | "verified";
  counters: { metric: TelemetryMetric; dimension: string; lifetime: string | null; daily: string | null; date: string | null; rankingEligible: boolean }[];
}
export interface MarketItem {
  shopId: number;
  npcId: number;
  npcName: string | null;
  category: string;
  itemId: number;
  itemName: string;
  price: string;
  currency: "mesos" | "item" | "nx";
  currencyItemId: number | null;
  stock: number | null;
  rules: string[];
}
export interface FreeMarketData { items: MarketItem[]; total: number | null }
export interface DatabaseItem {
  id: number;
  name: string;
  category: string;
  description: string | null;
  requiredLevel: number | null;
}
export interface DatabaseMob {
  id: number;
  name: string;
  level: number;
  boss: boolean;
  hp: string;
  exp: string;
}
export interface DatabaseItemsData { items: DatabaseItem[]; total: number | null }
export interface DatabaseMobsData { mobs: DatabaseMob[]; total: number | null }
export type PortalQuery = Record<string, string | number | undefined>;
