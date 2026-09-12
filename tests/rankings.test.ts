import assert from 'node:assert/strict';
import test from 'node:test';
import { fixturePublicReadProvider } from '../lib/data/fixtures.ts';
import {
  applyRankingQuery,
  formatDuration,
  getMetricColumns,
} from '../lib/data/rankings.ts';

void test('ranking categories expose metric-specific columns', () => {
  assert.deepEqual(
    getMetricColumns('exp').map((column) => column.label),
    ['EXP earned', 'EXP / hour'],
  );
  assert.deepEqual(
    getMetricColumns('bossing').map((column) => column.label),
    ['Boss damage', 'Boss kills', 'Fastest clear'],
  );
  assert.deepEqual(
    getMetricColumns('farming').map((column) => column.label),
    ['Mobs / hour', 'Mesos / hour', 'EXP / hour', 'Best map'],
  );
});

void test('ranking filters and sorting are deterministic', async () => {
  const { data } = await fixturePublicReadProvider.getRankings();
  const explorers = applyRankingQuery(data.entries, {
    category: 'nx',
    family: 'Explorer',
    season: 'Season Zero',
  });

  assert.ok(explorers.length > 3);
  assert.ok(explorers.every((entry) => entry.family === 'Explorer'));
  assert.ok(
    explorers.every(
      (entry, index) =>
        index === 0 ||
        (explorers[index - 1].metrics.nxEarned ?? 0) >=
          (entry.metrics.nxEarned ?? 0),
    ),
  );
});

void test('ranking filters support an intentional no-data state', async () => {
  const { data } = await fixturePublicReadProvider.getRankings();
  const cygnus = applyRankingQuery(data.entries, {
    category: 'overall',
    family: 'Cygnus',
  });
  assert.deepEqual(cygnus, []);
});

void test('clear times use minutes and zero-padded seconds', () => {
  assert.equal(formatDuration(174), '2:54');
  assert.equal(formatDuration(null), '—');
});

void test('ranking fixtures expose map-efficiency samples', async () => {
  const { data } = await fixturePublicReadProvider.getRankings();
  assert.ok(data.entries.every((entry) => entry.metrics.mapEfficiency));
  assert.ok(
    data.entries.every(
      (entry) => (entry.metrics.mapEfficiency?.sampleWindowMinutes ?? 0) > 0,
    ),
  );
});
