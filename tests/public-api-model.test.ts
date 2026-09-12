import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCharacterProfile,
  buildRankingCatalog,
  jobFamily,
  publicJobName,
  type PublicCharacterRow,
} from '../server/public-api-model.ts';

const row: PublicCharacterRow = {
  name: 'PortalTest',
  level: '113',
  currentExp: '12345',
  jobId: '421',
  fame: '7',
  createdAt: '2026-08-19 00:00:00',
  guild: '',
  expEarned: '190000000',
  mesosEarned: '120000',
  nxEarned: '4000',
  mobsKilled: '323',
  bossesKilled: '0',
  deaths: '2',
};

void test('maps current v111 jobs without exposing database identifiers', () => {
  assert.equal(publicJobName(421), 'Chief Bandit');
  assert.equal(jobFamily(421), 'Explorer');
  assert.equal(jobFamily(3100), 'Resistance');

  const catalog = buildRankingCatalog([row]);
  assert.deepEqual(catalog.availableCategories, ['level']);
  assert.equal(catalog.entries[0].name, 'PortalTest');
  assert.equal(catalog.entries[0].metrics.mobsKilled, 323);
  assert.equal(catalog.entries[0].metrics.bossDamage, null);
  assert.ok(
    !JSON.stringify(catalog).match(/account|password|email|session|hwid|mac/i),
  );
});

void test('builds a null-safe public profile from approved fields only', () => {
  const catalog = buildRankingCatalog([row]);
  const profile = buildCharacterProfile(catalog.entries[0], row, 1);
  assert.equal(profile.ranks.global, 1);
  assert.equal(profile.ranks.boss, null);
  assert.equal(profile.lifetime.totalExpEarned, 190000000);
  assert.equal(profile.lifetime.hoursPlayed, null);
  assert.equal(profile.achievements.length, 0);
  assert.ok(
    !JSON.stringify(profile).match(/accountid|password|email|sessionip|macs/i),
  );
});
