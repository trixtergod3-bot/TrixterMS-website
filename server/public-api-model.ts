import type {
  CharacterProfile,
  JobFamily,
  RankingCatalog,
  RankingEntry,
  RankingMetrics,
} from '../lib/contracts/public.ts';

export interface PublicCharacterRow {
  name: string;
  level: string;
  currentExp: string;
  jobId: string;
  fame: string;
  createdAt: string;
  guild: string;
  expEarned: string;
  mesosEarned: string;
  nxEarned: string;
  mobsKilled: string;
  bossesKilled: string;
  deaths: string;
}

const exactJobNames = new Map<number, string>([
  [0, 'Beginner'],
  [100, 'Warrior'],
  [110, 'Fighter'],
  [111, 'Crusader'],
  [112, 'Hero'],
  [120, 'Page'],
  [121, 'White Knight'],
  [122, 'Paladin'],
  [130, 'Spearman'],
  [131, 'Dragon Knight'],
  [132, 'Dark Knight'],
  [200, 'Magician'],
  [210, 'Wizard (Fire/Poison)'],
  [211, 'Mage (Fire/Poison)'],
  [212, 'Arch Mage (Fire/Poison)'],
  [220, 'Wizard (Ice/Lightning)'],
  [221, 'Mage (Ice/Lightning)'],
  [222, 'Arch Mage (Ice/Lightning)'],
  [230, 'Cleric'],
  [231, 'Priest'],
  [232, 'Bishop'],
  [300, 'Bowman'],
  [310, 'Hunter'],
  [311, 'Ranger'],
  [312, 'Bowmaster'],
  [320, 'Crossbowman'],
  [321, 'Sniper'],
  [322, 'Marksman'],
  [400, 'Rogue'],
  [410, 'Assassin'],
  [411, 'Hermit'],
  [412, 'Night Lord'],
  [420, 'Bandit'],
  [421, 'Chief Bandit'],
  [422, 'Shadower'],
  [430, 'Blade Recruit'],
  [431, 'Blade Acolyte'],
  [432, 'Blade Specialist'],
  [433, 'Blade Lord'],
  [434, 'Blade Master'],
  [500, 'Pirate'],
  [510, 'Brawler'],
  [511, 'Marauder'],
  [512, 'Buccaneer'],
  [520, 'Gunslinger'],
  [521, 'Outlaw'],
  [522, 'Corsair'],
  [1000, 'Noblesse'],
  [1100, 'Dawn Warrior'],
  [1110, 'Dawn Warrior'],
  [1111, 'Dawn Warrior'],
  [1112, 'Dawn Warrior'],
  [1200, 'Blaze Wizard'],
  [1210, 'Blaze Wizard'],
  [1211, 'Blaze Wizard'],
  [1212, 'Blaze Wizard'],
  [1300, 'Wind Archer'],
  [1310, 'Wind Archer'],
  [1311, 'Wind Archer'],
  [1312, 'Wind Archer'],
  [1400, 'Night Walker'],
  [1410, 'Night Walker'],
  [1411, 'Night Walker'],
  [1412, 'Night Walker'],
  [1500, 'Thunder Breaker'],
  [1510, 'Thunder Breaker'],
  [1511, 'Thunder Breaker'],
  [1512, 'Thunder Breaker'],
  [2000, 'Legend'],
  [2100, 'Aran'],
  [2110, 'Aran'],
  [2111, 'Aran'],
  [2112, 'Aran'],
  [2001, 'Evan'],
  [2200, 'Evan'],
  [2210, 'Evan'],
  [2211, 'Evan'],
  [2212, 'Evan'],
  [2213, 'Evan'],
  [2214, 'Evan'],
  [2215, 'Evan'],
  [2216, 'Evan'],
  [2217, 'Evan'],
  [2218, 'Evan'],
  [3000, 'Citizen'],
  [3100, 'Demon Slayer'],
  [3110, 'Demon Slayer'],
  [3111, 'Demon Slayer'],
  [3112, 'Demon Slayer'],
  [3200, 'Battle Mage'],
  [3210, 'Battle Mage'],
  [3211, 'Battle Mage'],
  [3212, 'Battle Mage'],
  [3300, 'Wild Hunter'],
  [3310, 'Wild Hunter'],
  [3311, 'Wild Hunter'],
  [3312, 'Wild Hunter'],
  [3500, 'Mechanic'],
  [3510, 'Mechanic'],
  [3511, 'Mechanic'],
  [3512, 'Mechanic'],
]);

const accentPalette = ['#40e0d0', '#69c5ff', '#9b87ff', '#f4c15d', '#4fd79b'];

function safeInteger(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.trunc(parsed), Number.MAX_SAFE_INTEGER);
}

export function jobFamily(jobId: number): JobFamily {
  if (jobId >= 1000 && jobId < 2000) return 'Cygnus';
  if (jobId >= 2000 && jobId < 3000) return 'Hero';
  if (jobId >= 3000 && jobId < 4000) return 'Resistance';
  if (jobId >= 0 && jobId < 1000) return 'Explorer';
  return 'Special';
}

export function publicJobName(jobId: number): string {
  return exactJobNames.get(jobId) ?? `Job ${jobId}`;
}

function avatarFor(name: string) {
  const normalized = name.trim();
  const initials = normalized.slice(0, 2).toUpperCase() || 'MS';
  const hash = Array.from(normalized).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return {
    kind: 'placeholder' as const,
    accent: accentPalette[hash % accentPalette.length],
    initials,
  };
}

function telemetryMetrics(
  row: PublicCharacterRow,
  classRank: number,
): RankingMetrics {
  return {
    totalExp: safeInteger(row.currentExp),
    expEarned: safeInteger(row.expEarned),
    expPerHour: null,
    mesosEarned: safeInteger(row.mesosEarned),
    mesosPerHour: null,
    nxEarned: safeInteger(row.nxEarned),
    nxPerHour: null,
    bossDamage: null,
    bossKills: safeInteger(row.bossesKilled),
    fastestClearSeconds: null,
    mobsKilled: safeInteger(row.mobsKilled),
    mobsPerHour: null,
    mapEfficiency: null,
    achievementsCompleted: null,
    itemScore: null,
    bestItem: null,
    seasonPoints: null,
    classRank,
  };
}

export function buildRankingCatalog(
  rows: PublicCharacterRow[],
): RankingCatalog {
  const classCounts = new Map<number, number>();
  const entries = rows.map((row): RankingEntry => {
    const jobId = safeInteger(row.jobId);
    const classRank = (classCounts.get(jobId) ?? 0) + 1;
    classCounts.set(jobId, classRank);
    return {
      id: row.name.toLowerCase(),
      name: row.name,
      job: publicJobName(jobId),
      family: jobFamily(jobId),
      level: safeInteger(row.level),
      levelProgress: null,
      fame: safeInteger(row.fame),
      guild: row.guild || null,
      achievementScore: null,
      season: 'All Time',
      avatar: avatarFor(row.name),
      metrics: telemetryMetrics(row, classRank),
    };
  });

  return {
    entries,
    availableCategories: ['level'],
    jobs: [...new Set(entries.map((entry) => entry.job))].toSorted(),
    families: [...new Set(entries.map((entry) => entry.family))].toSorted(),
    seasons: ['All Time'],
    updatedAt: new Date().toISOString(),
  };
}

function databaseTimestamp(value: string): string | null {
  if (!value) return null;
  const normalized = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}Z`;
  return Number.isNaN(Date.parse(normalized))
    ? null
    : new Date(normalized).toISOString();
}

export function buildCharacterProfile(
  entry: RankingEntry,
  row: PublicCharacterRow,
  globalRank: number,
): CharacterProfile {
  return {
    name: entry.name,
    job: entry.job,
    family: entry.family,
    level: entry.level,
    guild: entry.guild,
    avatar: entry.avatar,
    ranks: {
      global: globalRank,
      class: entry.metrics.classRank,
      nx: null,
      boss: null,
    },
    lifetime: {
      totalExpEarned: entry.metrics.expEarned,
      totalMesosEarned: entry.metrics.mesosEarned,
      totalNxEarned: entry.metrics.nxEarned,
      hoursPlayed: null,
      mobsKilled: entry.metrics.mobsKilled,
      bossesKilled: entry.metrics.bossKills,
      deaths: safeInteger(row.deaths),
      favoriteMap: null,
      mostKilledMob: null,
      bestFarmingSessionMesos: null,
      highestDamage: null,
      bossDamage: null,
      potionsConsumed: null,
    },
    achievements: [],
    joinedAt: databaseTimestamp(row.createdAt),
    lastSeenAt: null,
  };
}
