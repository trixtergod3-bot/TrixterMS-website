import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const routes = [
  'app/page.tsx',
  'app/rankings/page.tsx',
  'app/character/[name]/page.tsx',
  'app/classes/page.tsx',
  'app/status/page.tsx',
  'app/features/page.tsx',
  'app/download/page.tsx',
  'app/patch-notes/page.tsx',
  'app/community/page.tsx',
  'app/players/page.tsx',
  'app/live-world/page.tsx',
  'app/achievements/page.tsx',
  'app/boss-records/page.tsx',
  'app/daily-rankings/page.tsx',
  'app/database/page.tsx',
  'app/database/rare-drops/page.tsx',
  'app/news/page.tsx',
  'app/events/page.tsx',
  'app/guide/page.tsx',
  'app/discord/page.tsx',
] as const;

void test('every V2 route has an implementation entry point', () => {
  for (const route of routes) {
    assert.equal(
      existsSync(join(process.cwd(), route)),
      true,
      `Missing route: ${route}`,
    );
  }
});

void test('route-level loading, error, and not-found states are present', () => {
  for (const file of [
    'app/loading.tsx',
    'app/error.tsx',
    'app/not-found.tsx',
  ]) {
    assert.equal(
      existsSync(join(process.cwd(), file)),
      true,
      `Missing state: ${file}`,
    );
  }
});
