import {
  PUBLIC_API_SCHEMA_VERSION,
  type AchievementDefinition,
  type ApiResponse,
  type BossRecord,
  type ChannelStatus,
  type CharacterProfile,
  type ClassDirectoryEntry,
  type PatchNote,
  type PublicEvent,
  type PublicReadProvider,
  type RareDrop,
  type RankingCatalog,
  type RankingEntry,
  type RankingMetrics,
  type ServerStatus,
  type WorldEvent,
} from '../contracts/public.ts';
import { getRankingScore } from './rankings.ts';

/**
 * DEVELOPMENT_FIXTURE_DATA_ONLY
 * These values exist to exercise the V1 public read models and UI states.
 * They are not sourced from the gameplay database and must not be presented
 * as authoritative player or server records.
 */
export const FIXTURE_DATA_NOTICE =
  'Development fixture data — not live telemetry';

const generatedAt = '2026-09-08T18:15:00.000Z';

function fixtureResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    meta: {
      schemaVersion: PUBLIC_API_SCHEMA_VERSION,
      generatedAt,
      source: 'fixture',
      stale: false,
    },
  };
}

function metrics(overrides: Partial<RankingMetrics>): RankingMetrics {
  const merged = {
    totalExp: 1_840_000_000,
    expEarned: 890_000_000,
    expPerHour: 18_400_000,
    mesosEarned: 4_850_000_000,
    mesosPerHour: 82_000_000,
    nxEarned: 114_000,
    nxPerHour: 1_240,
    bossDamage: 12_400_000_000,
    bossKills: 84,
    fastestClearSeconds: 492,
    mobsKilled: 842_000,
    mobsPerHour: 4_260,
    achievementsCompleted: 48,
    itemScore: 7_450,
    bestItem: 'Timeless weapon',
    seasonPoints: 8_400,
    classRank: 8,
    ...overrides,
  };

  return {
    ...merged,
    mapEfficiency: overrides.mapEfficiency ?? {
      mapId: null,
      mapName: 'Temple of Time — Road of Regrets',
      sampleWindowMinutes: 60,
      expPerHour: merged.expPerHour ?? 0,
      mesosPerHour: merged.mesosPerHour ?? 0,
      mobsPerHour: merged.mobsPerHour ?? 0,
    },
  };
}

const rankingEntries: RankingEntry[] = [
  {
    id: 'riven',
    name: 'Riven',
    job: 'Night Lord',
    family: 'Explorer',
    level: 197,
    levelProgress: 73,
    fame: 412,
    guild: 'Nocturne',
    achievementScore: 18_920,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#40e0d0', initials: 'RV' },
    metrics: metrics({
      totalExp: 3_980_000_000,
      expEarned: 2_740_000_000,
      expPerHour: 34_800_000,
      mesosEarned: 14_620_000_000,
      mesosPerHour: 154_000_000,
      nxEarned: 384_200,
      nxPerHour: 2_460,
      bossDamage: 49_800_000_000,
      bossKills: 217,
      fastestClearSeconds: 174,
      mobsKilled: 2_948_000,
      mobsPerHour: 6_810,
      achievementsCompleted: 126,
      itemScore: 13_880,
      bestItem: 'Perfected Dragon Kanzir',
      seasonPoints: 28_400,
      classRank: 1,
    }),
  },
  {
    id: 'kael',
    name: 'Kael',
    job: 'Hero',
    family: 'Explorer',
    level: 200,
    levelProgress: 100,
    fame: 367,
    guild: 'Vanguard',
    achievementScore: 17_840,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#f4c15d', initials: 'KL' },
    metrics: metrics({
      totalExp: 4_260_000_000,
      expEarned: 2_590_000_000,
      expPerHour: 31_200_000,
      mesosEarned: 12_840_000_000,
      mesosPerHour: 138_000_000,
      nxEarned: 342_800,
      nxPerHour: 2_080,
      bossDamage: 58_300_000_000,
      bossKills: 241,
      fastestClearSeconds: 159,
      mobsKilled: 2_624_000,
      mobsPerHour: 5_960,
      achievementsCompleted: 119,
      itemScore: 14_320,
      bestItem: 'Perfected Reverse Nibleheim',
      seasonPoints: 26_910,
      classRank: 1,
    }),
  },
  {
    id: 'mirelle',
    name: 'Mirelle',
    job: 'Bishop',
    family: 'Explorer',
    level: 194,
    levelProgress: 41,
    fame: 624,
    guild: 'Vanguard',
    achievementScore: 19_660,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#9b87ff', initials: 'MR' },
    metrics: metrics({
      totalExp: 3_710_000_000,
      expEarned: 2_320_000_000,
      expPerHour: 30_900_000,
      mesosEarned: 11_250_000_000,
      mesosPerHour: 121_000_000,
      nxEarned: 421_600,
      nxPerHour: 2_740,
      bossDamage: 37_200_000_000,
      bossKills: 264,
      fastestClearSeconds: 202,
      mobsKilled: 2_140_000,
      mobsPerHour: 5_540,
      achievementsCompleted: 138,
      itemScore: 13_420,
      bestItem: 'Elemental Wand 8',
      seasonPoints: 26_120,
      classRank: 1,
    }),
  },
  {
    id: 'solace',
    name: 'Solace',
    job: 'Mercedes',
    family: 'Hero',
    level: 192,
    levelProgress: 86,
    fame: 288,
    guild: 'Nocturne',
    achievementScore: 15_740,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#69c5ff', initials: 'SO' },
    metrics: metrics({
      totalExp: 3_440_000_000,
      expEarned: 2_280_000_000,
      expPerHour: 37_400_000,
      mesosEarned: 13_180_000_000,
      mesosPerHour: 174_000_000,
      nxEarned: 298_400,
      nxPerHour: 2_150,
      bossDamage: 45_900_000_000,
      bossKills: 188,
      fastestClearSeconds: 184,
      mobsKilled: 3_184_000,
      mobsPerHour: 7_420,
      achievementsCompleted: 104,
      itemScore: 12_960,
      bestItem: 'Legendary Dual Bowguns',
      seasonPoints: 24_780,
      classRank: 1,
    }),
  },
  {
    id: 'vesper',
    name: 'Vesper',
    job: 'Mechanic',
    family: 'Resistance',
    level: 190,
    levelProgress: 64,
    fame: 194,
    guild: 'Overclock',
    achievementScore: 14_980,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#ff7d6e', initials: 'VS' },
    metrics: metrics({
      totalExp: 3_180_000_000,
      expEarned: 2_060_000_000,
      expPerHour: 35_200_000,
      mesosEarned: 15_240_000_000,
      mesosPerHour: 182_000_000,
      nxEarned: 274_900,
      nxPerHour: 1_940,
      bossDamage: 41_400_000_000,
      bossKills: 174,
      fastestClearSeconds: 216,
      mobsKilled: 3_468_000,
      mobsPerHour: 7_880,
      achievementsCompleted: 97,
      itemScore: 12_680,
      bestItem: 'Perfected Reverse Blindness',
      seasonPoints: 23_610,
      classRank: 1,
    }),
  },
  {
    id: 'nami',
    name: 'Nami',
    job: 'Buccaneer',
    family: 'Explorer',
    level: 189,
    levelProgress: 37,
    fame: 322,
    guild: 'BlueHour',
    achievementScore: 16_120,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#4fd79b', initials: 'NM' },
    metrics: metrics({
      totalExp: 3_040_000_000,
      expEarned: 1_990_000_000,
      expPerHour: 28_400_000,
      mesosEarned: 10_880_000_000,
      mesosPerHour: 117_000_000,
      nxEarned: 315_500,
      nxPerHour: 2_010,
      bossDamage: 52_600_000_000,
      bossKills: 223,
      fastestClearSeconds: 166,
      mobsKilled: 2_480_000,
      mobsPerHour: 5_920,
      achievementsCompleted: 111,
      itemScore: 13_610,
      bestItem: 'Perfected Reverse Equinox',
      seasonPoints: 22_940,
      classRank: 1,
    }),
  },
  {
    id: 'elara',
    name: 'Elara',
    job: 'Bowmaster',
    family: 'Explorer',
    level: 187,
    levelProgress: 91,
    fame: 205,
    guild: 'BlueHour',
    achievementScore: 13_680,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#b4e15f', initials: 'EL' },
    metrics: metrics({
      expEarned: 1_870_000_000,
      expPerHour: 27_900_000,
      bossDamage: 43_100_000_000,
      bossKills: 192,
      mobsPerHour: 5_740,
      seasonPoints: 21_530,
      classRank: 1,
    }),
  },
  {
    id: 'hex',
    name: 'Hex',
    job: 'Battle Mage',
    family: 'Resistance',
    level: 186,
    levelProgress: 53,
    fame: 176,
    guild: 'Overclock',
    achievementScore: 14_240,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#da7cff', initials: 'HX' },
    metrics: metrics({
      expEarned: 1_760_000_000,
      mesosEarned: 9_980_000_000,
      nxEarned: 260_300,
      bossDamage: 39_800_000_000,
      achievementsCompleted: 101,
      seasonPoints: 20_840,
      classRank: 1,
    }),
  },
  {
    id: 'orion',
    name: 'Orion',
    job: 'Aran',
    family: 'Hero',
    level: 184,
    levelProgress: 68,
    fame: 251,
    guild: 'Vanguard',
    achievementScore: 12_860,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#72a3ff', initials: 'OR' },
    metrics: metrics({
      expEarned: 1_640_000_000,
      bossDamage: 46_500_000_000,
      bossKills: 204,
      fastestClearSeconds: 194,
      seasonPoints: 19_940,
      classRank: 1,
    }),
  },
  {
    id: 'cassia',
    name: 'Cassia',
    job: 'Shadower',
    family: 'Explorer',
    level: 182,
    levelProgress: 22,
    fame: 143,
    guild: null,
    achievementScore: 11_920,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#ff6d9e', initials: 'CA' },
    metrics: metrics({
      expEarned: 1_510_000_000,
      mesosEarned: 12_740_000_000,
      mesosPerHour: 165_000_000,
      nxEarned: 214_800,
      mobsPerHour: 6_720,
      seasonPoints: 18_360,
      classRank: 2,
    }),
  },
  {
    id: 'forge',
    name: 'Forge',
    job: 'Paladin',
    family: 'Explorer',
    level: 179,
    levelProgress: 78,
    fame: 198,
    guild: 'Vanguard',
    achievementScore: 13_140,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#f0b764', initials: 'FG' },
    metrics: metrics({
      expEarned: 1_390_000_000,
      bossDamage: 44_600_000_000,
      bossKills: 232,
      fastestClearSeconds: 208,
      achievementsCompleted: 96,
      seasonPoints: 17_820,
      classRank: 2,
    }),
  },
  {
    id: 'lyric',
    name: 'Lyric',
    job: 'Evan',
    family: 'Hero',
    level: 176,
    levelProgress: 45,
    fame: 166,
    guild: 'Nocturne',
    achievementScore: 10_780,
    season: 'Season Zero',
    avatar: { kind: 'placeholder', accent: '#80d4ff', initials: 'LY' },
    metrics: metrics({
      expEarned: 1_210_000_000,
      expPerHour: 25_800_000,
      nxEarned: 238_100,
      bossDamage: 34_800_000_000,
      itemScore: 10_920,
      seasonPoints: 16_440,
      classRank: 2,
    }),
  },
];

const rankingCatalog: RankingCatalog = {
  entries: rankingEntries,
  availableCategories: [
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
  ],
  jobs: [...new Set(rankingEntries.map((entry) => entry.job))].sort(),
  families: ['Explorer', 'Cygnus', 'Hero', 'Resistance', 'Special'],
  seasons: ['Season Zero', 'All Time'],
  updatedAt: generatedAt,
};

const channelPopulations = [
  8, 11, 100, 6, 12, 9, 10, 8, 7, 11, 10, 8, 9, 12, 7, 8, 11, 12, 13, 14,
];

const channels: ChannelStatus[] = channelPopulations.map(
  (population, index) => ({
    id: index + 1,
    name: index >= 16 ? `Challenge ${index - 16 + 1}` : `Channel ${index + 1}`,
    availability: index === 2 ? 'full' : 'online',
    population,
    capacity: 100,
    challenge: index >= 16,
    rateProfileId: index >= 16 ? 'challenge' : 'regular',
  }),
);

const serverStatus: ServerStatus = {
  availability: 'online',
  world: 'Trixter',
  onlinePlayers: channels.reduce(
    (total, channel) => total + (channel.population ?? 0),
    0,
  ),
  registeredAccounts: 4_832,
  recordOnline: 412,
  channels,
  rates: {
    adaptive: true,
    profiles: [
      {
        id: 'regular',
        label: 'Regular channels',
        channelIds: channels
          .filter((channel) => !channel.challenge)
          .map((channel) => channel.id),
        display: { exp: '4×', meso: '2×', drop: '2×' },
        note: 'Fixture display values for regular progression channels.',
      },
      {
        id: 'challenge',
        label: 'Challenge channels',
        channelIds: channels
          .filter((channel) => channel.challenge)
          .map((channel) => channel.id),
        display: { exp: 'Adaptive', meso: 'Adaptive', drop: 'Adaptive' },
        note: 'Challenge-channel rules vary; the game server remains authoritative.',
      },
    ],
    note: 'Rates are channel-scoped display labels, not client-authoritative gameplay values.',
  },
  uptimeSeconds: 1_236_600,
  build: '111.1-R1-preview',
  activeEvent: 'World Portal Preview',
  maintenance: { active: false, message: null, startsAt: null, endsAt: null },
  updatedAt: generatedAt,
};

const classDirectory: ClassDirectoryEntry[] = [
  {
    id: 'explorer-warriors',
    name: 'Explorer Warriors',
    family: 'Explorer',
    archetype: 'Warrior',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary: 'Hero, Paladin, and Dark Knight foundations from the v111.1 era.',
    accent: '#f0b764',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Frontline', 'Bossing', 'Party utility'],
  },
  {
    id: 'explorer-magicians',
    name: 'Explorer Magicians',
    family: 'Explorer',
    archetype: 'Magician',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'Arch Mages and Bishop with classic elemental and support identities.',
    accent: '#9b87ff',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Area control', 'Support', 'Elemental damage'],
  },
  {
    id: 'explorer-bowmen',
    name: 'Explorer Bowmen',
    family: 'Explorer',
    archetype: 'Bowman',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'Bowmaster and Marksman precision built on the stable v111.1 baseline.',
    accent: '#b4e15f',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Range', 'Critical damage', 'Boss pressure'],
  },
  {
    id: 'explorer-thieves',
    name: 'Explorer Thieves',
    family: 'Explorer',
    archetype: 'Thief',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'Night Lord, Shadower, and Dual Blade with speed and execution depth.',
    accent: '#ff6d9e',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Mobility', 'Burst', 'Stealth'],
  },
  {
    id: 'explorer-pirates',
    name: 'Explorer Pirates',
    family: 'Explorer',
    archetype: 'Pirate',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'Buccaneer, Corsair, and Cannoneer across close and long-range styles.',
    accent: '#4fd79b',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Combos', 'Summons', 'Mobility'],
  },
  {
    id: 'cygnus-knights',
    name: 'Cygnus Knights',
    family: 'Cygnus',
    archetype: 'Hybrid',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'The five classic knight paths remain available on the native foundation.',
    accent: '#69c5ff',
    availabilityNote: 'Native foundation; Awakening is not yet live',
    specialties: ['Fast progression', 'Elemental identity', 'World blessing'],
  },
  {
    id: 'heroes-of-maple',
    name: 'Heroes',
    family: 'Hero',
    archetype: 'Hybrid',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary:
      'Aran, Evan, and Mercedes carry distinct combo, dragon, and mobility play.',
    accent: '#72a3ff',
    availabilityNote: 'Native v111.1-era roster',
    specialties: ['Combo play', 'Unique resources', 'Mobility'],
  },
  {
    id: 'resistance',
    name: 'Resistance',
    family: 'Resistance',
    archetype: 'Hybrid',
    status: 'native',
    releaseState: 'live',
    environment: 'fixture',
    summary: 'Battle Mage, Wild Hunter, and Mechanic defend Edelstein.',
    accent: '#ff7d6e',
    availabilityNote: 'Native v111.1 class family',
    specialties: ['Technology', 'Auras', 'Mounted combat'],
  },
  {
    id: 'marksman-local',
    name: 'Marksman · Selected Contracts',
    family: 'Explorer',
    archetype: 'Bowman',
    status: 'remastered',
    releaseState: 'local-accepted',
    environment: 'local',
    summary:
      'Selected combat contracts have passed isolated local runtime acceptance.',
    accent: '#8edc72',
    availabilityNote: 'Local validation only — not beta-live',
    specialties: ['Precision', 'Multihit contracts', 'Server validation'],
  },
  {
    id: 'buccaneer-local',
    name: 'Buccaneer · Selected Skills',
    family: 'Explorer',
    archetype: 'Pirate',
    status: 'remastered',
    releaseState: 'local-accepted',
    environment: 'local',
    summary:
      'A limited set of remaster skills has local runtime proof without a beta deployment claim.',
    accent: '#4fd79b',
    availabilityNote: 'Local validation only — not beta-live',
    specialties: ['Combo flow', 'Dragon Strike proof', 'Compatibility-first'],
  },
  {
    id: 'explorers-red',
    name: 'Explorers RED',
    family: 'Explorer',
    archetype: 'Hybrid',
    status: 'coming-later',
    releaseState: 'planned',
    environment: 'local',
    summary:
      'A staged modernization programme designed around verified v111-safe mechanics.',
    accent: '#40e0d0',
    availabilityNote: 'Development programme — not a live class claim',
    specialties: ['Modernized kits', 'Server authority', 'Compatibility-first'],
  },
  {
    id: 'cygnus-awakening',
    name: 'Cygnus Awakening',
    family: 'Cygnus',
    archetype: 'Hybrid',
    status: 'coming-later',
    releaseState: 'planned',
    environment: 'local',
    summary:
      'A future identity pass for the Cygnus roster after isolated validation.',
    accent: '#7dcfff',
    availabilityNote: 'Roadmap only — not live',
    specialties: ['Class identity', 'Modern feedback', 'Safe backports'],
  },
  {
    id: 'demon-avenger',
    name: 'Demon Avenger',
    family: 'Resistance',
    archetype: 'Warrior',
    status: 'backported',
    releaseState: 'testing',
    environment: 'local',
    summary:
      'HP-driven combat prepared behind strict logical-skill and client-boundary validation.',
    accent: '#ff5d6c',
    availabilityNote: 'Testing only — owner activation proof still required',
    specialties: ['HP resource', 'Exceed', 'Sustained offense'],
  },
  {
    id: 'xenon',
    name: 'Xenon',
    family: 'Resistance',
    archetype: 'Hybrid',
    status: 'coming-later',
    releaseState: 'planned',
    environment: 'local',
    summary:
      'A future hybrid class requiring dedicated client and server compatibility work.',
    accent: '#8c6cff',
    availabilityNote: 'Read-only reconnaissance — not implemented',
    specialties: ['Hybrid stats', 'Multimode skills', 'Technology'],
  },
];

const patchNotes: PatchNote[] = [
  {
    slug: 'website-foundation-preview',
    title: 'The public world window takes shape',
    summary:
      'A first preview of the TrixterMS website, public read contracts, and telemetry-ready rankings experience.',
    publishedAt: '2026-08-30T08:00:00.000Z',
    build: 'WEB-V1-PREVIEW',
    categories: ['infrastructure', 'systems'],
    sections: [
      {
        heading: 'Website',
        items: [
          'Introduced the new TrixterMS visual identity and responsive route foundation.',
          'Added fixture-backed status, rankings, class directory, character profile, and patch-note read models.',
        ],
      },
      {
        heading: 'Data boundary',
        items: [
          'Kept public website data isolated from the gameplay database.',
          'Defined a future HTTP read-provider contract for approved telemetry snapshots.',
        ],
      },
    ],
  },
  {
    slug: 'persistent-world-roadmap',
    title: 'Persistent-world systems roadmap',
    summary:
      'The website now has presentation contracts for achievements, seasons, world records, and efficiency metrics.',
    publishedAt: '2026-08-24T12:00:00.000Z',
    build: 'ROADMAP-2026.08',
    categories: ['systems', 'gameplay'],
    sections: [
      {
        heading: 'Prepared interfaces',
        items: [
          'EXP/hour, mesos/hour, NX/hour, mobs/hour, and playtime can be delivered by a future read API.',
          'Boss kills, damage, clear times, and class/season positions have first-class ranking fields.',
        ],
      },
    ],
  },
  {
    slug: 'class-availability-language',
    title: 'Clearer class availability language',
    summary:
      'The class directory distinguishes stable native classes from future modernization programmes.',
    publishedAt: '2026-08-17T17:30:00.000Z',
    build: 'CATALOG-V1',
    categories: ['classes'],
    sections: [
      {
        heading: 'Class directory',
        items: [
          'Native, remastered, backported, and coming-later states are represented in the public contract.',
          'Experimental Demon Avenger, Xenon, Explorer RED, and Cygnus work is never labelled live by fixture data.',
        ],
      },
    ],
  },
];

const worldEvents: WorldEvent[] = [
  {
    id: 'world-1',
    type: 'boss-record',
    importance: 'featured',
    title: 'A new Zakum benchmark',
    summary:
      'Kael recorded the fastest fixture clear in the current public-read preview.',
    characterName: 'Kael',
    occurredAt: '2026-09-08T17:42:00.000Z',
    iconLabel: 'ZR',
  },
  {
    id: 'world-2',
    type: 'achievement',
    importance: 'notable',
    title: 'World Memory completed',
    summary:
      'Mirelle reached a fixture exploration milestone across the Maple World.',
    characterName: 'Mirelle',
    occurredAt: '2026-09-08T16:18:00.000Z',
    iconLabel: 'WM',
  },
  {
    id: 'world-3',
    type: 'rare-drop',
    importance: 'standard',
    title: 'Timeless weapon found',
    summary:
      'Riven found a fixture rare drop during an eligible boss encounter.',
    characterName: 'Riven',
    occurredAt: '2026-09-08T15:04:00.000Z',
    iconLabel: 'RD',
  },
  {
    id: 'world-4',
    type: 'level',
    importance: 'standard',
    title: 'Level 200 reached',
    summary: 'Kael reached the fixture level cap and entered the world record.',
    characterName: 'Kael',
    occurredAt: '2026-09-08T13:37:00.000Z',
    iconLabel: '200',
  },
];

const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'first-light',
    title: 'First Light',
    description: 'Reach level 120 on an eligible character.',
    category: 'progression',
    points: 250,
    status: 'in-development',
    progressSample: { current: 120, target: 120 },
  },
  {
    id: 'world-memory',
    title: 'World Memory',
    description: 'Complete 150 unique eligible quests.',
    category: 'exploration',
    points: 650,
    status: 'in-development',
    progressSample: { current: 126, target: 150 },
  },
  {
    id: 'boss-hunter',
    title: 'Boss Hunter',
    description: 'Defeat 25 unique eligible bosses.',
    category: 'combat',
    points: 500,
    status: 'in-development',
    progressSample: { current: 18, target: 25 },
  },
  {
    id: 'crystal-crafter',
    title: 'Crystal Crafter',
    description: 'Advance the Infinite Crystal Ring through verified upgrades.',
    category: 'collection',
    points: 400,
    status: 'roadmap',
    progressSample: null,
  },
];

const bossRecords: BossRecord[] = [
  {
    id: 'zakum-kael',
    bossName: 'Zakum',
    difficulty: 'Expedition',
    characterName: 'Kael',
    job: 'Hero',
    clearTimeSeconds: 159,
    partySize: 6,
    achievedAt: '2026-09-08T17:42:00.000Z',
  },
  {
    id: 'pap-riven',
    bossName: 'Papulatus',
    difficulty: 'Clocktower',
    characterName: 'Riven',
    job: 'Night Lord',
    clearTimeSeconds: 174,
    partySize: 4,
    achievedAt: '2026-09-07T19:28:00.000Z',
  },
  {
    id: 'pianus-nami',
    bossName: 'Pianus',
    difficulty: 'Aqua Road',
    characterName: 'Nami',
    job: 'Buccaneer',
    clearTimeSeconds: 166,
    partySize: 3,
    achievedAt: '2026-09-06T20:14:00.000Z',
  },
];

const rareDrops: RareDrop[] = [
  {
    id: 'drop-1',
    itemName: 'Timeless Weapon',
    sourceName: 'Boss encounter',
    characterName: 'Riven',
    rarityLabel: 'Rare fixture',
    occurredAt: '2026-09-08T15:04:00.000Z',
  },
  {
    id: 'drop-2',
    itemName: 'Reverse Equipment',
    sourceName: 'Temple of Time',
    characterName: 'Kael',
    rarityLabel: 'Rare fixture',
    occurredAt: '2026-09-07T21:31:00.000Z',
  },
  {
    id: 'drop-3',
    itemName: 'Mastery Book',
    sourceName: 'Eligible monster',
    characterName: 'Mirelle',
    rarityLabel: 'Notable fixture',
    occurredAt: '2026-09-07T18:12:00.000Z',
  },
];

const publicEvents: PublicEvent[] = [
  {
    id: 'event-portal',
    title: 'World Portal Preview',
    summary:
      'A development-only presentation fixture for the new live-world portal.',
    startsAt: '2026-09-08T00:00:00.000Z',
    endsAt: '2026-09-12T23:59:59.000Z',
    status: 'in-development',
    tag: 'Website preview',
  },
  {
    id: 'event-dojo',
    title: 'Dojo Legends',
    summary:
      'Future weekly competition presentation. No rewards or live schedule are claimed.',
    startsAt: '2026-09-15T00:00:00.000Z',
    endsAt: '2026-09-21T23:59:59.000Z',
    status: 'roadmap',
    tag: 'Competition concept',
  },
];

function createProfile(entry: RankingEntry): CharacterProfile {
  const overallEntries = [...rankingEntries].sort(
    (a, b) => getRankingScore(b, 'overall') - getRankingScore(a, 'overall'),
  );

  return {
    name: entry.name,
    job: entry.job,
    family: entry.family,
    level: entry.level,
    guild: entry.guild,
    avatar: entry.avatar,
    ranks: {
      global:
        overallEntries.findIndex((candidate) => candidate.id === entry.id) + 1,
      class: entry.metrics.classRank,
      nx:
        [...rankingEntries]
          .sort((a, b) => (b.metrics.nxEarned ?? 0) - (a.metrics.nxEarned ?? 0))
          .findIndex((candidate) => candidate.id === entry.id) + 1,
      boss:
        [...rankingEntries]
          .sort(
            (a, b) => (b.metrics.bossDamage ?? 0) - (a.metrics.bossDamage ?? 0),
          )
          .findIndex((candidate) => candidate.id === entry.id) + 1,
    },
    lifetime: {
      totalExpEarned: entry.metrics.totalExp,
      totalMesosEarned: entry.metrics.mesosEarned,
      totalNxEarned: entry.metrics.nxEarned,
      hoursPlayed: Math.round(
        (entry.metrics.mobsKilled ?? 0) /
          Math.max(entry.metrics.mobsPerHour ?? 0, 1),
      ),
      mobsKilled: entry.metrics.mobsKilled,
      bossesKilled: entry.metrics.bossKills,
      deaths: 24 + entry.metrics.classRank * 7,
      favoriteMap:
        entry.family === 'Explorer'
          ? 'Temple of Time — Road of Regrets'
          : 'Leafre — Dragon Forest',
      mostKilledMob:
        entry.job === 'Bishop' ? 'Skelegon' : 'Memory Monk Trainee',
      bestFarmingSessionMesos: (entry.metrics.mesosPerHour ?? 0) * 3,
      highestDamage: Math.round((entry.metrics.bossDamage ?? 0) / 58),
      bossDamage: entry.metrics.bossDamage,
      potionsConsumed: 3_820 + entry.level * 41,
    },
    achievements: [
      {
        id: 'first-light',
        title: 'First Light',
        description: 'Reach level 120.',
        completedAt: '2026-07-09T20:10:00.000Z',
        progress: 120,
        target: 120,
        points: 250,
      },
      {
        id: 'unbroken-hour',
        title: 'The Unbroken Hour',
        description: 'Maintain a one-hour farming session.',
        completedAt: '2026-07-21T18:25:00.000Z',
        progress: 60,
        target: 60,
        points: 400,
      },
      {
        id: 'world-memory',
        title: 'World Memory',
        description: 'Complete 150 unique quests.',
        completedAt: null,
        progress: 126,
        target: 150,
        points: 650,
      },
    ],
    joinedAt: '2026-06-14T13:24:00.000Z',
    lastSeenAt: '2026-08-30T08:57:00.000Z',
  };
}

const profiles = new Map(
  rankingEntries.map((entry) => [
    entry.name.toLowerCase(),
    createProfile(entry),
  ]),
);

export const fixturePublicReadProvider: PublicReadProvider = {
  async getStatus() {
    return fixtureResponse(serverStatus);
  },
  async getRankings() {
    return fixtureResponse(rankingCatalog);
  },
  async getCharacter(name) {
    return fixtureResponse(profiles.get(name.toLowerCase()) ?? null);
  },
  async getClasses() {
    return fixtureResponse(classDirectory);
  },
  async getPatchNotes() {
    return fixtureResponse(patchNotes);
  },
  async getDailyRankings() {
    return fixtureResponse(rankingCatalog);
  },
  async getWorldEvents() {
    return fixtureResponse(worldEvents);
  },
  async getAchievements() {
    return fixtureResponse(achievementDefinitions);
  },
  async getBossRecords() {
    return fixtureResponse(bossRecords);
  },
  async getRareDrops() {
    return fixtureResponse(rareDrops);
  },
  async getEvents() {
    return fixtureResponse(publicEvents);
  },
};
