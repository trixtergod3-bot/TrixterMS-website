export const PUBLIC_API_SCHEMA_VERSION = '2026-09-08.v2' as const;

export const PUBLIC_API_ROUTES = {
  status: '/api/public/status',
  rankings: '/api/public/rankings',
  character: (name: string) =>
    `/api/public/characters/${encodeURIComponent(name)}`,
  classes: '/api/public/classes',
  patchNotes: '/api/public/patch-notes',
  dailyRankings: '/api/public/daily-rankings',
  worldEvents: '/api/public/world-events',
  achievements: '/api/public/achievements',
  bossRecords: '/api/public/boss-records',
  rareDrops: '/api/public/rare-drops',
  events: '/api/public/events',
} as const;

export type DataSource = 'fixture' | 'public-read-api' | 'unavailable';

export interface ApiMeta {
  schemaVersion: typeof PUBLIC_API_SCHEMA_VERSION;
  generatedAt: string;
  source: DataSource;
  stale: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export type ServerAvailability = 'online' | 'offline' | 'maintenance';
export type ChannelAvailability = 'online' | 'full' | 'offline';

export interface ChannelStatus {
  id: number;
  name: string;
  availability: ChannelAvailability;
  population: number | null;
  capacity: number;
  challenge: boolean;
  rateProfileId: string;
}

export interface RateDisplayValues {
  exp: string;
  meso: string;
  drop: string;
}

export interface ChannelRateProfile {
  id: string;
  label: string;
  channelIds: number[];
  display: RateDisplayValues;
  note: string;
}

export interface ServerStatus {
  availability: ServerAvailability;
  world: string;
  onlinePlayers: number;
  registeredAccounts: number;
  recordOnline: number | null;
  channels: ChannelStatus[];
  rates: {
    adaptive: boolean;
    profiles: ChannelRateProfile[];
    note: string;
  };
  uptimeSeconds: number | null;
  build: string;
  activeEvent: string | null;
  maintenance: {
    active: boolean;
    message: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  updatedAt: string;
}

export type FeatureStatus = 'live' | 'beta' | 'in-development' | 'roadmap';

export interface WorldEvent {
  id: string;
  type:
    | 'level'
    | 'achievement'
    | 'rare-drop'
    | 'boss-clear'
    | 'boss-record'
    | 'world-milestone';
  importance: 'featured' | 'notable' | 'standard';
  title: string;
  summary: string;
  characterName: string | null;
  occurredAt: string;
  iconLabel: string;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'progression' | 'combat' | 'exploration' | 'economy' | 'collection';
  points: number;
  status: FeatureStatus;
  progressSample: { current: number; target: number } | null;
}

export interface BossRecord {
  id: string;
  bossName: string;
  difficulty: string;
  characterName: string;
  job: string;
  clearTimeSeconds: number;
  partySize: number;
  achievedAt: string;
}

export interface RareDrop {
  id: string;
  itemName: string;
  sourceName: string;
  characterName: string;
  rarityLabel: string;
  occurredAt: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  status: FeatureStatus;
  tag: string;
}

export const RANKING_CATEGORIES = [
  'overall',
  'level',
  'exp',
  'mesos',
  'nx',
  'bossing',
  'farming',
  'achievements',
  'classes',
  'items',
  'seasons',
] as const;

export type RankingCategory = (typeof RANKING_CATEGORIES)[number];

export const JOB_FAMILIES = [
  'Explorer',
  'Cygnus',
  'Hero',
  'Resistance',
  'Special',
] as const;

export type JobFamily = (typeof JOB_FAMILIES)[number];

export interface RankingAvatar {
  kind: 'placeholder';
  accent: string;
  initials: string;
}

export interface MapEfficiencySnapshot {
  mapId: number | null;
  mapName: string;
  sampleWindowMinutes: number;
  expPerHour: number;
  mesosPerHour: number;
  mobsPerHour: number;
}

export interface RankingMetrics {
  totalExp: number;
  expEarned: number | null;
  expPerHour: number | null;
  mesosEarned: number | null;
  mesosPerHour: number | null;
  nxEarned: number | null;
  nxPerHour: number | null;
  bossDamage: number | null;
  bossKills: number | null;
  fastestClearSeconds: number | null;
  mobsKilled: number | null;
  mobsPerHour: number | null;
  mapEfficiency: MapEfficiencySnapshot | null;
  achievementsCompleted: number | null;
  itemScore: number | null;
  bestItem: string | null;
  seasonPoints: number | null;
  classRank: number;
}

export interface RankingEntry {
  id: string;
  name: string;
  job: string;
  family: JobFamily;
  level: number;
  levelProgress: number | null;
  fame: number;
  guild: string | null;
  achievementScore: number | null;
  season: string;
  avatar: RankingAvatar;
  metrics: RankingMetrics;
}

export interface RankingQuery {
  category: RankingCategory;
  job?: string;
  family?: JobFamily;
  season?: string;
}

export interface RankingCatalog {
  entries: RankingEntry[];
  availableCategories: RankingCategory[];
  jobs: string[];
  families: JobFamily[];
  seasons: string[];
  updatedAt: string;
}

export interface CharacterAchievement {
  id: string;
  title: string;
  description: string;
  completedAt: string | null;
  progress: number;
  target: number;
  points: number;
}

export interface CharacterProfile {
  name: string;
  job: string;
  family: JobFamily;
  level: number;
  guild: string | null;
  avatar: RankingAvatar;
  ranks: {
    global: number;
    class: number;
    nx: number | null;
    boss: number | null;
  };
  lifetime: {
    totalExpEarned: number | null;
    totalMesosEarned: number | null;
    totalNxEarned: number | null;
    hoursPlayed: number | null;
    mobsKilled: number | null;
    bossesKilled: number | null;
    deaths: number | null;
    favoriteMap: string | null;
    mostKilledMob: string | null;
    bestFarmingSessionMesos: number | null;
    highestDamage: number | null;
    bossDamage: number | null;
    potionsConsumed: number | null;
  };
  achievements: CharacterAchievement[];
  joinedAt: string | null;
  lastSeenAt: string | null;
}

export const CLASS_STATUSES = [
  'native',
  'remastered',
  'backported',
  'coming-later',
] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];
export type ClassReleaseState =
  | 'live'
  | 'local-accepted'
  | 'testing'
  | 'planned';
export type ClassEnvironment = 'beta' | 'local' | 'fixture';

export interface ClassDirectoryEntry {
  id: string;
  name: string;
  family: JobFamily;
  archetype: 'Warrior' | 'Magician' | 'Bowman' | 'Thief' | 'Pirate' | 'Hybrid';
  status: ClassStatus;
  releaseState: ClassReleaseState;
  environment: ClassEnvironment;
  summary: string;
  accent: string;
  availabilityNote: string;
  specialties: string[];
}

export type PatchNoteCategory =
  | 'gameplay'
  | 'classes'
  | 'systems'
  | 'economy'
  | 'bug-fixes'
  | 'infrastructure';

export interface PatchNoteSection {
  heading: string;
  items: string[];
}

export interface PatchNote {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  build: string;
  categories: PatchNoteCategory[];
  sections: PatchNoteSection[];
}

export interface PublicReadProvider {
  getStatus(): Promise<ApiResponse<ServerStatus>>;
  getRankings(): Promise<ApiResponse<RankingCatalog>>;
  getCharacter(name: string): Promise<ApiResponse<CharacterProfile | null>>;
  getClasses(): Promise<ApiResponse<ClassDirectoryEntry[]>>;
  getPatchNotes(): Promise<ApiResponse<PatchNote[]>>;
  getDailyRankings(): Promise<ApiResponse<RankingCatalog>>;
  getWorldEvents(): Promise<ApiResponse<WorldEvent[]>>;
  getAchievements(): Promise<ApiResponse<AchievementDefinition[]>>;
  getBossRecords(): Promise<ApiResponse<BossRecord[]>>;
  getRareDrops(): Promise<ApiResponse<RareDrop[]>>;
  getEvents(): Promise<ApiResponse<PublicEvent[]>>;
}
