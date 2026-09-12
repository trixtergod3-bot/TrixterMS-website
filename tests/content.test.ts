import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

void test('public cubing copy uses the canonical item-level / 10 cap', () => {
  const features = readFileSync(
    join(process.cwd(), 'app/features/page.tsx'),
    'utf8',
  );
  assert.match(features, /floor\(item level \/ 10\)/);
  assert.match(features, /Lv100 is 10%/);
  assert.match(features, /Lv150 is 15%/);
  assert.match(features, /Lv200 is 20%/);
  assert.doesNotMatch(features, /item level \/ 100/i);
});

void test('public homepage does not advertise private AI or credential systems', () => {
  const homepage = readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8');
  assert.doesNotMatch(
    homepage,
    /AI player|personality|anti-cheat|password hash|HWID/i,
  );
  assert.match(homepage, /native game login flow/i);
});
