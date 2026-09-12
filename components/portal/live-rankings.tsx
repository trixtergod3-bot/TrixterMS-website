'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Radio, RefreshCw } from 'lucide-react';
import type { PortalEnvelope, RankingsData } from '@/lib/portal/contracts';
import { EmptyState } from './shared';
import { RankingTable } from './ranking-table';
import styles from './live-rankings.module.css';

const REFRESH_MS = 20_000;
const MAX_STALE_MS = 120_000;
const PAGE_SIZE = 50;
const classOptions: [string, string][] = [
  ['0', 'Beginner'], ['112', 'Hero'], ['paladin', 'Paladin'],
  ['132', 'Dark Knight'], ['212', 'Fire / Poison Arch Mage'],
  ['222', 'Ice / Lightning Arch Mage'], ['232', 'Bishop'],
  ['312', 'Bowmaster'], ['322', 'Marksman'], ['412', 'Night Lord'],
  ['422', 'Shadower'], ['434', 'Dual Blade'], ['512', 'Buccaneer'],
  ['522', 'Corsair'], ['532', 'Cannoneer'], ['1112', 'Dawn Warrior'],
  ['1212', 'Blaze Wizard'], ['1312', 'Wind Archer'], ['1412', 'Night Walker'],
  ['1512', 'Thunder Breaker'], ['2112', 'Aran'], ['2218', 'Evan'],
  ['2312', 'Mercedes'], ['3112', 'Demon Slayer'], ['demon-avenger', 'Demon Avenger'],
  ['3212', 'Battle Mage'], ['3312', 'Wild Hunter'], ['3512', 'Mechanic'],
];

export interface RankingFilters {
  sort: 'level' | 'fame';
  job?: string;
  class?: 'demon-avenger' | 'paladin';
  page: number;
}

function queryString(filters: RankingFilters) {
  return new URLSearchParams({
    sort: filters.sort,
    page: String(filters.page),
    limit: String(PAGE_SIZE),
    ...(filters.class ? { class: filters.class } : filters.job ? { job: filters.job } : {}),
  }).toString();
}

function ageLabel(asOf: string, now: number | null) {
  if (now === null) return 'Updated recently';
  const seconds = Math.max(0, Math.floor((now - Date.parse(asOf)) / 1000));
  if (seconds < 60) return `Updated ${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

export function LiveRankings({ initialResponse, filters }: {
  initialResponse: PortalEnvelope<RankingsData>;
  filters: RankingFilters;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const initialSnapshot = ['live', 'stale'].includes(initialResponse.status) && initialResponse.data ? initialResponse : null;
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(!initialSnapshot);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const query = queryString(filters);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;
    let failures = 0;

    const refresh = async () => {
      if (cancelled || inFlight) return;
      if (document.hidden) {
        timer = setTimeout(() => void refresh(), REFRESH_MS);
        return;
      }
      inFlight = true;
      setBusy(true);
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch(`/api/public/rankings?${query}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Rankings unavailable');
        const result: PortalEnvelope<RankingsData> = await response.json();
        if (!['live', 'stale'].includes(result.status) || !result.data || !Array.isArray(result.data.entries)
          || result.data.page !== filters.page || result.data.pageSize !== PAGE_SIZE
          || !Number.isSafeInteger(result.data.total) || (result.data.total ?? -1) < 0
          || !result.asOf || !Number.isFinite(Date.parse(result.asOf))
          || Date.parse(result.asOf) > Date.now() + 5000
          || Date.now() - Date.parse(result.asOf) > MAX_STALE_MS) {
          throw new Error('Invalid ranking response');
        }
        if (!cancelled) {
          setSnapshot(result);
          setFailed(false);
          setNow(Date.now());
        }
        failures = result.status === 'stale' ? Math.min(failures + 1, 2) : 0;
      } catch {
        failures = Math.min(failures + 1, 2);
        if (!cancelled) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (!cancelled) {
          setBusy(false);
          timer = setTimeout(() => void refresh(), Math.min(REFRESH_MS * 2 ** failures, 60_000));
        }
      }
    };

    if (initialResponse.status !== 'live' || !initialResponse.data || refreshKey > 0) void refresh();
    else timer = setTimeout(() => void refresh(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
    };
  // The page gives each applied query a fresh component key. A refresh retains its last successful rows.
  }, [query, filters.page, refreshKey, initialResponse]);

  const visibleSnapshot = snapshot?.asOf && (now === null || now - Date.parse(snapshot.asOf) <= MAX_STALE_MS) ? snapshot : null;
  const data = visibleSnapshot?.data;
  const total = data?.total;
  const pages = total === null || total === undefined ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedClass = filters.class ?? filters.job ?? '';
  const stale = visibleSnapshot !== null && (failed || visibleSnapshot.status === 'stale'
    || (now !== null && now - Date.parse(visibleSnapshot.asOf!) > 30_000));

  return <>
    <form className="search-form" action="/rankings" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const rawClass = form.get('job');
      const selected = typeof rawClass === 'string' ? rawClass : '';
      const next: RankingFilters = {
        sort: form.get('sort') === 'fame' ? 'fame' : 'level', page: 1,
        ...(selected === 'demon-avenger' || selected === 'paladin' ? { class: selected } : selected ? { job: selected } : {}),
      };
      startNavigation(() => router.push(`/rankings?${queryString(next)}`, { scroll: false }));
    }}>
      <label className="field">Rank by<select name="sort" defaultValue={filters.sort}><option value="level">Level / EXP</option><option value="fame">Fame</option></select></label>
      <label className="field">Class<select name="job" defaultValue={selectedClass}>
        <option value="">All classes</option>
        {selectedClass && !classOptions.some(([value]) => value === selectedClass) && <option value={selectedClass}>Job {selectedClass}</option>}
        {classOptions.map(([value, label]) => <option key={value} value={value}>{label}{/^\d+$/.test(value)
          ? value === '0' ? ' (Explorer)' : value === '2218' ? ' (10th growth)' : value.length === 4 && value.startsWith('1') ? ' (3rd job)' : ' (4th job)'
          : ''}</option>)}
      </select></label>
      <button className="button button-gold" type="submit" disabled={navigating}>{navigating ? 'Loading…' : 'Apply filters'}</button>
    </form>

    <div className={styles.statusRow}>
      <div className={`data-note ${styles.status} ${stale ? styles.stale : visibleSnapshot ? 'data-note-live' : ''}`}>
        <Radio size={14} aria-hidden="true" />
        <output>{stale ? failed ? 'Stale data · refresh unavailable · showing the last update' : 'Stale data · showing the last update' : visibleSnapshot ? 'Live public data' : busy ? 'Loading live rankings…' : 'Data unavailable'}</output>
        {visibleSnapshot?.asOf && <span>· <time dateTime={visibleSnapshot.asOf} title={visibleSnapshot.asOf}>{ageLabel(visibleSnapshot.asOf, now)}</time></span>}
      </div>
      <button className={`button button-secondary ${styles.refresh}`} type="button" disabled={busy} onClick={() => setRefreshKey((value) => value + 1)}>
        <RefreshCw size={13} aria-hidden="true" />{busy ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>

    <div className="portal-panel" aria-busy={busy && !visibleSnapshot}>
      {!data ? <EmptyState title={busy ? 'Finding the latest standings…' : 'The standings are temporarily unavailable.'}>
        {busy ? 'Loading the latest character records.' : 'Please try again shortly. Rankings will retry automatically.'}
      </EmptyState> : <>
        <p className={styles.summary}>{total?.toLocaleString('en-US')} {filters.job || filters.class ? 'matching characters' : 'characters'}
          {data.entries.length > 0 && <> · Showing {((filters.page - 1) * PAGE_SIZE + 1).toLocaleString('en-US')}–{((filters.page - 1) * PAGE_SIZE + data.entries.length).toLocaleString('en-US')}</>}
        </p>
        {data.entries.length > 0 ? <RankingTable entries={data.entries} /> : <EmptyState title={filters.page > 1 ? 'No characters on this page.' : 'The hall is waiting for its heroes.'}>
          {filters.page > 1 ? 'The standings have changed. Return to the first page to see the latest rankings.' : filters.job || filters.class ? 'No characters match this class yet. Try viewing all classes.' : 'New characters will appear here automatically, starting at Level 1.'}
        </EmptyState>}
      </>}
    </div>

    <nav className={`portal-tabs ${styles.pagination}`} aria-label="Ranking pages">
      {filters.page > 1 && <Link href={`/rankings?${queryString({ ...filters, page: 1 })}`} scroll={false}>First page</Link>}
      {filters.page > 1 && <Link href={`/rankings?${queryString({ ...filters, page: filters.page - 1 })}`} scroll={false}>Previous</Link>}
      <span>Page {filters.page}{pages !== null && <> of {pages}</>}</span>
      {pages !== null && filters.page < pages && <Link href={`/rankings?${queryString({ ...filters, page: filters.page + 1 })}`} scroll={false}>Next</Link>}
    </nav>
    <p className="data-note">{filters.sort === 'fame' ? 'Fame rankings use fame first, then level and current EXP.' : 'Level rankings use level, then current EXP.'} Ties use a stable server order. Every level is included. Updates automatically about every 20 seconds.</p>
  </>;
}
