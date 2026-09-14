'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  DatabaseZap,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  DataSource,
  JobFamily,
  RankingCatalog,
  RankingCategory,
} from '@/lib/contracts/public';
import {
  applyRankingQuery,
  formatMetric,
  getMetricColumns,
} from '@/lib/data/rankings';
import { AvatarPlaceholder } from '@/components/shared/avatar-placeholder';
import { FixtureNotice } from '@/components/shared/fixture-notice';

const categoryLabels: Record<RankingCategory, string> = {
  overall: 'Overall',
  level: 'Level',
  exp: 'EXP',
  mesos: 'Mesos',
  nx: 'NX',
  bossing: 'Bossing',
  farming: 'Farming',
  achievements: 'Achievements',
  classes: 'Classes',
  items: 'Items',
  seasons: 'Seasons',
};

const categoryDescriptions: Record<RankingCategory, string> = {
  overall: 'Composite of level, season points, and achievement score.',
  level: 'Highest level first, then total lifetime EXP.',
  exp: 'Total EXP earned during the selected period.',
  mesos: 'Total mesos earned during the selected period.',
  nx: 'Total NX earned from tracked server systems.',
  bossing:
    'Sorted by boss damage; supporting columns show confirmed kills and fastest clear.',
  farming:
    'Sorted by mobs per hour; supporting columns show mesos, EXP, and the best-map sample.',
  achievements: 'Achievement score and completed records.',
  classes: 'Position within each character job.',
  items: 'Equipment score and best recorded item.',
  seasons: 'Points earned within the selected competitive season.',
};

interface RankingsExplorerProps {
  catalog: RankingCatalog;
  generatedAt: string;
  source: DataSource;
  stale: boolean;
}

export function RankingsExplorer({
  catalog,
  generatedAt,
  source,
  stale,
}: RankingsExplorerProps) {
  const [category, setCategory] = useState<RankingCategory>(
    catalog.availableCategories[0] ?? 'level',
  );
  const [job, setJob] = useState('');
  const [family, setFamily] = useState<JobFamily | ''>('');
  const [season, setSeason] = useState(catalog.seasons[0] ?? '');

  const entries = useMemo(
    () =>
      applyRankingQuery(catalog.entries, {
        category,
        job: job || undefined,
        family: family || undefined,
        season: season || undefined,
      }),
    [catalog.entries, category, family, job, season],
  );
  const metricColumns = getMetricColumns(category);
  const topPlayers = entries.slice(0, 3);

  const resetFilters = () => {
    setJob('');
    setFamily('');
    setSeason(catalog.seasons[0] ?? '');
  };

  return (
    <div className="rankings-explorer">
      <section
        className="shell ranking-category-section"
        aria-labelledby="ranking-categories-title"
      >
        <div className="ranking-toolbar-heading">
          <div>
            <span className="section-index">Ranking signal</span>
            <h2 id="ranking-categories-title">Choose the record.</h2>
          </div>
          <FixtureNotice
            compact
            source={source}
            stale={stale}
            updatedAt={generatedAt}
          />
        </div>
        <fieldset className="category-tabs">
          <legend className="sr-only">Ranking category</legend>
          {catalog.availableCategories.map((item) => (
            <button
              aria-pressed={category === item}
              className={category === item ? 'active' : undefined}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {categoryLabels[item]}
            </button>
          ))}
        </fieldset>
        <p className="sort-definition">
          <DatabaseZap aria-hidden="true" size={14} />{' '}
          {categoryDescriptions[category]}
        </p>
      </section>

      {topPlayers.length > 0 && (
        <section
          className="shell podium-section"
          aria-labelledby="podium-title"
        >
          <div className="section-heading compact-heading">
            <div>
              <span className="section-index">Top signal</span>
              <h2 id="podium-title">The leading three.</h2>
            </div>
            <p>Avatar slots are ready for future Maple character renders.</p>
          </div>
          <div className="podium-grid">
            {topPlayers.map((entry, index) => (
              <article
                className={`podium-card podium-rank-${index + 1}`}
                key={entry.id}
              >
                <span className="podium-position">0{index + 1}</span>
                <AvatarPlaceholder
                  avatar={entry.avatar}
                  name={entry.name}
                  size="large"
                />
                <div className="podium-copy">
                  <span>
                    {entry.job} · LV. {entry.level}
                  </span>
                  <h3>
                    <Link href={`/character/${entry.name}`}>{entry.name}</Link>
                  </h3>
                  <strong>{formatMetric(entry, metricColumns[0].key)}</strong>
                  <small>{metricColumns[0].label}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section
        className="shell leaderboard-section"
        aria-labelledby="leaderboard-title"
      >
        <div className="leaderboard-heading">
          <div>
            <span className="section-index">Full leaderboard</span>
            <h2 id="leaderboard-title">{categoryLabels[category]} rankings</h2>
          </div>
          <span>{entries.length} records</span>
        </div>

        <div className="ranking-filters" aria-label="Ranking filters">
          <div className="filter-label">
            <SlidersHorizontal aria-hidden="true" size={15} /> Filters
          </div>
          <label>
            <span>Job</span>
            <select
              value={job}
              onChange={(event) => setJob(event.target.value)}
            >
              <option value="">All jobs</option>
              {catalog.jobs.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Class family</span>
            <select
              value={family}
              onChange={(event) =>
                setFamily(event.target.value as JobFamily | '')
              }
            >
              <option value="">All families</option>
              {catalog.families.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Season</span>
            <select
              value={season}
              onChange={(event) => setSeason(event.target.value)}
            >
              {catalog.seasons.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <SearchX aria-hidden="true" size={32} />
            <h3>No ranking data for this signal.</h3>
            <p>
              Try another job, family, or season. The empty state is intentional
              and API-ready.
            </p>
            <button
              className="button button-secondary"
              onClick={resetFilters}
              type="button"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div className="ranking-table-wrap">
              <table className="ranking-table">
                <caption className="sr-only">
                  TRIXTERMS {categoryLabels[category]} rankings
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Character</th>
                    <th scope="col">Job</th>
                    <th scope="col">Level</th>
                    <th className="column-secondary" scope="col">
                      Fame
                    </th>
                    <th className="column-secondary" scope="col">
                      Guild
                    </th>
                    <th className="column-secondary" scope="col">
                      Achievement
                    </th>
                    {metricColumns.map((column) => (
                      <th scope="col" key={column.key}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td>
                        <span className={`table-rank rank-${index + 1}`}>
                          #{index + 1}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="table-character"
                          href={`/character/${entry.name}`}
                        >
                          <AvatarPlaceholder
                            avatar={entry.avatar}
                            name={entry.name}
                            size="small"
                          />
                          <span>
                            <strong>{entry.name}</strong>
                            <small>{entry.family}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{entry.job}</td>
                      <td>
                        <strong>{entry.level}</strong>
                      </td>
                      <td className="column-secondary">
                        {entry.fame.toLocaleString('en-US')}
                      </td>
                      <td className="column-secondary">{entry.guild ?? '—'}</td>
                      <td className="column-secondary">
                        {entry.achievementScore?.toLocaleString('en-US') ?? '—'}
                      </td>
                      {metricColumns.map((column) => (
                        <td className="metric-cell" key={column.key}>
                          {formatMetric(entry, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-ranking-list">
              {entries.map((entry, index) => (
                <details className="mobile-ranking-row" key={entry.id}>
                  <summary>
                    <span className={`table-rank rank-${index + 1}`}>
                      #{index + 1}
                    </span>
                    <AvatarPlaceholder
                      avatar={entry.avatar}
                      name={entry.name}
                      size="small"
                    />
                    <span className="mobile-rank-name">
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.job} · LV. {entry.level}
                      </small>
                    </span>
                    <span className="mobile-primary-metric">
                      <strong>
                        {formatMetric(entry, metricColumns[0].key)}
                      </strong>
                      <small>{metricColumns[0].label}</small>
                    </span>
                    <ChevronDown aria-hidden="true" size={16} />
                  </summary>
                  <div className="mobile-rank-details">
                    <div>
                      <span>Fame</span>
                      <strong>{entry.fame.toLocaleString('en-US')}</strong>
                    </div>
                    <div>
                      <span>Guild</span>
                      <strong>{entry.guild ?? '—'}</strong>
                    </div>
                    <div>
                      <span>Achievement</span>
                      <strong>
                        {entry.achievementScore?.toLocaleString('en-US') ?? '—'}
                      </strong>
                    </div>
                    {metricColumns.map((column) => (
                      <div key={column.key}>
                        <span>{column.label}</span>
                        <strong>{formatMetric(entry, column.key)}</strong>
                      </div>
                    ))}
                    <Link href={`/character/${entry.name}`}>
                      View full character record
                    </Link>
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
