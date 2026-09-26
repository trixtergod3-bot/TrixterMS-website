import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectText } from '../tools/check-security.mjs';

void test('browser security scanner rejects internal ranking identifiers and DA classification material', () => {
  for (const value of ['internalId', 'character_id', 'accountId', 'isDemonAvenger',
    'hardwareId', 'passwordHash', 'TRIXTER_DA_WARRIOR_CARRIER_V1', '999132900']) {
    const findings = inspectText('.next/static/chunk.js', `const field = '${value}';`, { browser: true });
    assert.ok(findings.some((finding) => finding.rule === 'private-ranking-fields-in-browser'), value);
    assert.equal(JSON.stringify(findings).includes(value), false);
  }
  assert.deepEqual(inspectText('.next/static/chunk.js', 'Demon Avenger Paladin Demon Slayer', { browser: true }), []);
});

void test('client components cannot import the RC1 server proxy', () => {
  for (const moduleName of ['public', 'public-data', 'public-api']) {
    const findings = inspectText('components/unsafe.tsx', `"use client";\nimport { reader } from '@/lib/portal/${moduleName}';`);
    assert.ok(findings.some((finding) => finding.rule === 'server-module-imported-by-client'));
  }
});
