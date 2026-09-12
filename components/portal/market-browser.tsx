import Link from 'next/link';
import { ArrowLeft, ArrowRight, Search, Store } from 'lucide-react';
import { DataNote, EmptyState, displayCount } from '@/components/portal/shared';
import type { FreeMarketData, MarketItem, PortalEnvelope } from '@/lib/portal/contracts';

interface MarketBrowserProps {
  response: PortalEnvelope<FreeMarketData>;
  query: string;
  category: string;
  page: number;
}

function marketHref(query: string, category: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);
  if (page > 1) params.set('page', String(page));
  return params.size ? `/free-market?${params}` : '/free-market';
}

function currencyLabel(item: MarketItem) {
  if (item.currency === 'mesos') return 'mesos';
  if (item.currency === 'nx') return 'NX';
  return `× item #${item.currencyItemId}`;
}

export function MarketBrowser({ response, query, category, page }: MarketBrowserProps) {
  const items = response.data?.items ?? [];
  const total = response.data?.total ?? null;
  const hasNext = page < 10000 && (total !== null ? page * 24 < total : items.length === 24);

  return (
    <div className="portal-panel">
      <search><form className="search-form" method="get" action="/free-market">
        <label className="field" htmlFor="market-query"><span>Find an item or shopkeeper</span><input id="market-query" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Search the market" /></label>
        <label className="field" htmlFor="market-category"><span>Shop category</span><input id="market-category" name="category" defaultValue={category} maxLength={96} placeholder="All categories" /></label>
        <button className="button button-gold" type="submit"><Search size={17} aria-hidden="true" /> Search</button>
        {(query || category) && <Link className="inline-link" href="/free-market">Clear filters</Link>}
      </form></search>
      <DataNote response={response} />
      {!response.data ? <EmptyState title="The stalls are being set up.">Shop listings will appear here when the public market catalog is ready. You will be able to compare item prices, currencies and each shopkeeper’s rules before visiting in game.</EmptyState>
        : items.length === 0 ? <EmptyState title={query || category ? 'No stalls match these filters.' : 'No listings have been published yet.'}>{query || category ? 'Try a shorter search or clear the category filter.' : 'Return after the next shop catalog update.'}</EmptyState>
          : <>
            <p>{displayCount(items.length)} {items.length === 1 ? 'listing' : 'listings'} on page {page}{total !== null && <> · {displayCount(total)} in total</>}</p>
            <div className="portal-three-grid">{items.map((item, index) => <article className="portal-panel" key={`${item.shopId}-${item.itemId}-${index}`}>
              <span className="pill">{item.category}</span><h2>{item.itemName}</h2>
              <p><Store size={16} aria-hidden="true" /> {item.npcName ?? `NPC #${item.npcId}`}</p>
              <p className="market-price"><strong>{displayCount(item.price)}</strong> {currencyLabel(item)}</p>
              <dl><div><dt>Item ID</dt><dd>{item.itemId}</dd></div><div><dt>Stock</dt><dd>{item.stock === null ? 'Not published' : displayCount(item.stock)}</dd></div></dl>
              {item.rules.length > 0 ? <><h3>Shop rules</h3><ul>{item.rules.map((rule, ruleIndex) => <li key={ruleIndex}>{rule}</li>)}</ul></> : <p>No additional shop rules are published.</p>}
            </article>)}</div>
            <p>Browse here, visit the shop in game. Availability and purchase conditions are confirmed by the in-game shop.</p>
          </>}
      {response.data && (page > 1 || hasNext) && <nav className="portal-tabs portal-pagination" aria-label="Market result pages">
        {page > 1 && <Link className="button" href={marketHref(query, category, page - 1)}><ArrowLeft size={16} aria-hidden="true" /> Previous</Link>}
        <span>Page {page}</span>
        {hasNext && <Link className="button" href={marketHref(query, category, page + 1)}>Next <ArrowRight size={16} aria-hidden="true" /></Link>}
      </nav>}
    </div>
  );
}
