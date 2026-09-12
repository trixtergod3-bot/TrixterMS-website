'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Crown, Gem, Radio, Sparkles, Swords } from 'lucide-react';
import type { WorldEvent } from '@/lib/contracts/public';

const filters = [
  ['all', 'All signals'],
  ['milestones', 'Milestones'],
  ['bosses', 'Bosses'],
  ['drops', 'Rare drops'],
] as const;

const icons = {
  level: Crown,
  achievement: Award,
  'rare-drop': Gem,
  'boss-clear': Swords,
  'boss-record': Swords,
  'world-milestone': Sparkles,
} as const;

function belongsToFilter(
  event: WorldEvent,
  filter: (typeof filters)[number][0],
) {
  if (filter === 'all') return true;
  if (filter === 'milestones')
    return (
      event.type === 'level' ||
      event.type === 'achievement' ||
      event.type === 'world-milestone'
    );
  if (filter === 'bosses')
    return event.type === 'boss-clear' || event.type === 'boss-record';
  return event.type === 'rare-drop';
}

export function LiveWorldFeed({ events }: { events: WorldEvent[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>('all');
  const filteredEvents = useMemo(
    () => events.filter((event) => belongsToFilter(event, filter)),
    [events, filter],
  );

  return (
    <div className="world-feed-panel">
      <div className="tab-row" aria-label="World event filters" role="tablist">
        {filters.map(([value, label]) => (
          <button
            aria-selected={filter === value}
            className={filter === value ? 'active' : undefined}
            key={value}
            onClick={() => setFilter(value)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="world-feed" aria-live="polite">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <Radio aria-hidden="true" />
            <h2>No signals in this view</h2>
            <p>
              Try another filter or check back after the next approved public
              snapshot.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const Icon = icons[event.type];
            return (
              <article
                className={`world-feed-row world-feed-${event.importance}`}
                key={event.id}
              >
                <div className="world-feed-icon">
                  <Icon aria-hidden="true" />
                  <span>{event.iconLabel}</span>
                </div>
                <div className="world-feed-copy">
                  <div>
                    <span>{event.type.replaceAll('-', ' ')}</span>
                    <time dateTime={event.occurredAt}>
                      {new Date(event.occurredAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC',
                      })}{' '}
                      UTC
                    </time>
                  </div>
                  <h2>{event.title}</h2>
                  <p>{event.summary}</p>
                </div>
                {event.characterName && (
                  <Link href={`/character/${event.characterName}`}>
                    {event.characterName}
                  </Link>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
