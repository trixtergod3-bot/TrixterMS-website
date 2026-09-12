import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_API_SCHEMA_VERSION } from '../lib/contracts/public.ts';
import { fixturePublicReadProvider } from '../lib/data/fixtures.ts';
import { HttpPublicReadProvider } from '../lib/data/http-public-provider.ts';
import { applyRankingQuery } from '../lib/data/rankings.ts';

void test('fixture provider satisfies the public status contract', async () => {
  const response = await fixturePublicReadProvider.getStatus();
  assert.equal(response.meta.source, 'fixture');
  assert.equal(response.data.channels.length, 20);
  assert.ok(response.data.channels.some((channel) => channel.challenge));
  assert.equal(
    response.data.onlinePlayers,
    response.data.channels.reduce(
      (total, channel) => total + (channel.population ?? 0),
      0,
    ),
  );
  assert.ok(response.data.rates.adaptive);
  assert.ok(
    response.data.channels.every((channel) => {
      const profile = response.data.rates.profiles.find(
        (candidate) => candidate.id === channel.rateProfileId,
      );
      return profile?.channelIds.includes(channel.id);
    }),
  );
});

void test('character global ranks match the overall leaderboard', async () => {
  const rankingResponse = await fixturePublicReadProvider.getRankings();
  const overall = applyRankingQuery(rankingResponse.data.entries, {
    category: 'overall',
  });

  for (const [index, entry] of overall.entries()) {
    const profile = await fixturePublicReadProvider.getCharacter(entry.name);
    assert.equal(profile.data?.ranks.global, index + 1);
  }
});

void test('character lookup is case-insensitive and handles missing records', async () => {
  const existing = await fixturePublicReadProvider.getCharacter('rIvEn');
  const missing = await fixturePublicReadProvider.getCharacter('NotAPlayer');
  assert.equal(existing.data?.name, 'Riven');
  assert.equal(missing.data, null);
});

void test('class release states do not promote experimental work to live', async () => {
  const response = await fixturePublicReadProvider.getClasses();
  const demonAvenger = response.data.find(
    (entry) => entry.id === 'demon-avenger',
  );
  const xenon = response.data.find((entry) => entry.id === 'xenon');

  assert.equal(demonAvenger?.status, 'backported');
  assert.equal(demonAvenger?.releaseState, 'testing');
  assert.equal(demonAvenger?.environment, 'local');
  assert.equal(xenon?.status, 'coming-later');
  assert.equal(xenon?.releaseState, 'planned');
});

void test('all patch note fixtures carry publication dates and sections', async () => {
  const response = await fixturePublicReadProvider.getPatchNotes();
  assert.ok(
    response.data.every((note) => !Number.isNaN(Date.parse(note.publishedAt))),
  );
  assert.ok(response.data.every((note) => note.sections.length > 0));
});

void test('V2 fixture surfaces remain explicitly fixture-sourced', async () => {
  const responses = await Promise.all([
    fixturePublicReadProvider.getDailyRankings(),
    fixturePublicReadProvider.getWorldEvents(),
    fixturePublicReadProvider.getAchievements(),
    fixturePublicReadProvider.getBossRecords(),
    fixturePublicReadProvider.getRareDrops(),
    fixturePublicReadProvider.getEvents(),
  ]);
  assert.ok(responses.every((response) => response.meta.source === 'fixture'));
  assert.ok(
    responses.every((response) =>
      Array.isArray(response.data)
        ? response.data.length > 0
        : response.data.entries.length > 0,
    ),
  );
});

void test('HTTP provider validates its response envelope and preserves route encoding', async () => {
  let requestedUrl = '';
  const request = (async (input: RequestInfo | URL) => {
    requestedUrl =
      input instanceof URL
        ? input.href
        : typeof input === 'string'
          ? input
          : input.url;
    return new Response(
      JSON.stringify({
        data: null,
        meta: {
          schemaVersion: PUBLIC_API_SCHEMA_VERSION,
          generatedAt: '2026-08-30T09:15:00.000Z',
          source: 'public-read-api',
          stale: false,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  const provider = new HttpPublicReadProvider(
    'https://public.example/',
    request,
  );

  await provider.getCharacter('Name With Space');
  assert.equal(
    requestedUrl,
    'https://public.example/api/public/characters/Name%20With%20Space',
  );

  const invalidRequest = (async () =>
    new Response(
      JSON.stringify({ data: null, meta: { schemaVersion: 'old' } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;
  await assert.rejects(
    () =>
      new HttpPublicReadProvider(
        'https://public.example/',
        invalidRequest,
      ).getStatus(),
    /incompatible response metadata/,
  );
});
