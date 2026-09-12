import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import { DataNote, EmptyState, displayCount } from '@/components/portal/shared';
import type { DatabaseItemsData, DatabaseMobsData, PortalEnvelope } from '@/lib/portal/contracts';

export type DatabaseCategory = 'items' | 'equipment' | 'monsters' | 'bosses' | 'maps' | 'skills';
const labels: Record<DatabaseCategory, string> = { items: 'Items', equipment: 'Equipment', monsters: 'Monsters', bosses: 'Bosses', maps: 'Maps', skills: 'Skills' };
const categories = Object.keys(labels) as DatabaseCategory[];

interface DatabaseBrowserProps {
  category: DatabaseCategory;
  query: string;
  page: number;
  itemResponse?: PortalEnvelope<DatabaseItemsData>;
  mobResponse?: PortalEnvelope<DatabaseMobsData>;
}

function databaseHref(category: DatabaseCategory, query: string, page = 1) {
  const params = new URLSearchParams({ type: category });
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  return `/database?${params}`;
}

export function DatabaseBrowser({ category, query, page, itemResponse, mobResponse }: DatabaseBrowserProps) {
  const upcoming = category === 'maps' || category === 'skills';
  const response = itemResponse ?? mobResponse;
  const items = itemResponse?.data?.items ?? [];
  const mobs = mobResponse?.data?.mobs ?? [];
  const count = items.length + mobs.length;
  const total = response?.data?.total ?? null;
  const hasNext = page < 10000 && (total !== null ? page * 24 < total : count === 24);

  return (
    <div className="portal-panel">
      <nav className="portal-tabs" aria-label="Database categories">
        {categories.map((item) => <Link key={item} href={databaseHref(item, query)} aria-current={category === item ? 'page' : undefined}>
          {labels[item]}{(item === 'maps' || item === 'skills') && <span className="pill">Soon</span>}
        </Link>)}
      </nav>
      <search><form className="search-form" action="/database" method="get">
        <input type="hidden" name="type" value={category} />
        <label className="field" htmlFor="database-query"><span>Find {labels[category].toLowerCase()}</span>
          <input id="database-query" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Search by name" />
        </label>
        <button className="button button-gold" type="submit"><Search size={17} aria-hidden="true" /> Search</button>
        {query && <Link className="inline-link" href={databaseHref(category, '')}>Clear search</Link>}
      </form></search>
      {response && <DataNote response={response} />}
      {upcoming ? <EmptyState title={`${labels[category]} await their catalog.`}>{query ? `Your search for “${query}” cannot return results yet. ` : ''}The {labels[category].toLowerCase()} catalog has not been published. This section will open with verified records in a future update.</EmptyState>
        : !response?.data ? <EmptyState title="The archive is being prepared.">Public {labels[category].toLowerCase()} records are not available yet. Search will open here as soon as the current game catalog is connected.</EmptyState>
          : count === 0 ? <EmptyState title={query ? 'No discoveries match that search.' : 'No records in this collection yet.'}>{query ? 'Try a shorter name or browse another category.' : 'Check another category or return after the next catalog update.'}</EmptyState>
            : <>
              <p>{displayCount(count)} {count === 1 ? 'result' : 'results'} on page {page}{total !== null && <> · {displayCount(total)} in total</>}</p>
              {itemResponse && <div className="portal-three-grid">{items.map((item) => <article className="portal-panel" key={item.id}>
                <BookOpen size={22} aria-hidden="true" /><span className="pill">{item.category}</span><h2>{item.name}</h2>
                <p>{item.description ?? 'A description has not been published for this item.'}</p>
                <dl><div><dt>Item ID</dt><dd>{item.id}</dd></div><div><dt>Required level</dt><dd>{item.requiredLevel === null ? 'Not published' : displayCount(item.requiredLevel)}</dd></div></dl>
              </article>)}</div>}
              {mobResponse && <div className="portal-table-wrap"><table className="portal-table"><caption className="sr-only">{labels[category]} search results</caption>
                <thead><tr><th scope="col">Creature</th><th scope="col">Level</th><th scope="col">HP</th><th scope="col">EXP</th></tr></thead>
                <tbody>{mobs.map((mob) => <tr key={mob.id}><th scope="row">{mob.name}<small>#{mob.id} · {mob.boss ? 'Boss' : 'Monster'}</small></th><td>{displayCount(mob.level)}</td><td>{displayCount(mob.hp)}</td><td>{displayCount(mob.exp)}</td></tr>)}</tbody>
              </table></div>}
            </>}
      {response?.data && (page > 1 || hasNext) && <nav className="portal-tabs portal-pagination" aria-label="Database result pages">
        {page > 1 && <Link className="button" href={databaseHref(category, query, page - 1)}><ArrowLeft size={16} aria-hidden="true" /> Previous</Link>}
        <span>Page {page}</span>
        {hasNext && <Link className="button" href={databaseHref(category, query, page + 1)}>Next <ArrowRight size={16} aria-hidden="true" /></Link>}
      </nav>}
    </div>
  );
}
