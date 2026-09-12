import type {
  RankingCategory,
  RankingEntry,
  RankingQuery,
} from '../contracts/public.ts';

export interface MetricColumn {
  key: string;
  label: string;
}

const columns: Record<RankingCategory, MetricColumn[]> = {
  overall: [{ key: 'overall', label: 'Overall score' }],
  level: [
    { key: 'level', label: 'Level' },
    { key: 'levelProgress', label: 'EXP progress' },
  ],
  exp: [
    { key: 'expEarned', label: 'EXP earned' },
    { key: 'expPerHour', label: 'EXP / hour' },
  ],
  mesos: [
    { key: 'mesosEarned', label: 'Mesos earned' },
    { key: 'mesosPerHour', label: 'Mesos / hour' },
  ],
  nx: [
    { key: 'nxEarned', label: 'NX earned' },
    { key: 'nxPerHour', label: 'NX / hour' },
  ],
  bossing: [
    { key: 'bossDamage', label: 'Boss damage' },
    { key: 'bossKills', label: 'Boss kills' },
    { key: 'fastestClearSeconds', label: 'Fastest clear' },
  ],
  farming: [
    { key: 'mobsPerHour', label: 'Mobs / hour' },
    { key: 'mesosPerHour', label: 'Mesos / hour' },
    { key: 'expPerHour', label: 'EXP / hour' },
    { key: 'mapEfficiency', label: 'Best map' },
  ],
  achievements: [
    { key: 'achievementScore', label: 'Score' },
    { key: 'achievementsCompleted', label: 'Completed' },
  ],
  classes: [
    { key: 'classRank', label: 'Class rank' },
    { key: 'level', label: 'Level' },
  ],
  items: [
    { key: 'itemScore', label: 'Item score' },
    { key: 'bestItem', label: 'Best item' },
  ],
  seasons: [
    { key: 'seasonPoints', label: 'Season points' },
    { key: 'achievementScore', label: 'Achievement score' },
  ],
};

export function getMetricColumns(category: RankingCategory): MetricColumn[] {
  return columns[category];
}

export function getRankingScore(
  entry: RankingEntry,
  category: RankingCategory,
): number {
  switch (category) {
    case 'overall':
      return (
        (entry.metrics.seasonPoints ?? 0) +
        (entry.achievementScore ?? 0) +
        entry.level * 100
      );
    case 'level':
      return entry.level * 10_000_000_000 + entry.metrics.totalExp;
    case 'exp':
      return entry.metrics.expEarned ?? Number.NEGATIVE_INFINITY;
    case 'mesos':
      return entry.metrics.mesosEarned ?? Number.NEGATIVE_INFINITY;
    case 'nx':
      return entry.metrics.nxEarned ?? Number.NEGATIVE_INFINITY;
    case 'bossing':
      return entry.metrics.bossDamage ?? Number.NEGATIVE_INFINITY;
    case 'farming':
      return entry.metrics.mobsPerHour ?? Number.NEGATIVE_INFINITY;
    case 'achievements':
      return entry.achievementScore ?? Number.NEGATIVE_INFINITY;
    case 'classes':
      return -entry.metrics.classRank;
    case 'items':
      return entry.metrics.itemScore ?? Number.NEGATIVE_INFINITY;
    case 'seasons':
      return entry.metrics.seasonPoints ?? Number.NEGATIVE_INFINITY;
  }
}

export function applyRankingQuery(
  entries: RankingEntry[],
  query: RankingQuery,
): RankingEntry[] {
  return entries
    .filter((entry) => !query.job || entry.job === query.job)
    .filter((entry) => !query.family || entry.family === query.family)
    .filter(
      (entry) =>
        !query.season ||
        query.season === 'All Time' ||
        entry.season === query.season,
    )
    .toSorted(
      (a, b) =>
        getRankingScore(b, query.category) - getRankingScore(a, query.category),
    );
}

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-US');

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function formatMetric(entry: RankingEntry, key: string): string {
  switch (key) {
    case 'overall':
      return integerFormatter.format(
        Math.round(getRankingScore(entry, 'overall')),
      );
    case 'level':
      return entry.level.toString();
    case 'levelProgress':
      return entry.levelProgress === null ? '—' : `${entry.levelProgress}%`;
    case 'achievementScore':
      return entry.achievementScore === null
        ? '—'
        : integerFormatter.format(entry.achievementScore);
    case 'bestItem':
      return entry.metrics.bestItem ?? '—';
    case 'fastestClearSeconds':
      return formatDuration(entry.metrics.fastestClearSeconds);
    case 'mapEfficiency':
      return entry.metrics.mapEfficiency?.mapName ?? '—';
    case 'classRank':
      return `#${entry.metrics.classRank}`;
    case 'achievementsCompleted':
      return entry.metrics.achievementsCompleted === null
        ? '—'
        : integerFormatter.format(entry.metrics.achievementsCompleted);
    default: {
      const value = entry.metrics[key as keyof typeof entry.metrics];
      if (typeof value === 'number') return compactFormatter.format(value);
      if (typeof value === 'string') return value;
      return '—';
    }
  }
}
