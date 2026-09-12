'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock3,
  Radio,
  Server,
  Trophy,
  Users,
} from 'lucide-react';
import type {
  ChannelAvailability,
  DataSource,
  ServerAvailability,
  ServerStatus,
} from '@/lib/contracts/public';

interface StatusDashboardProps {
  status: ServerStatus;
  source: DataSource;
}

const stateLabels: Record<ServerAvailability, string> = {
  online: 'Online',
  offline: 'Offline',
  maintenance: 'Maintenance',
};

const channelStateLabels: Record<ChannelAvailability, string> = {
  online: 'Online',
  full: 'Full',
  offline: 'Offline',
};

function formatUptime(seconds: number | null): string {
  if (seconds === null) return 'Unavailable';
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  return `${days}d ${hours}h`;
}

export function StatusDashboard({ status, source }: StatusDashboardProps) {
  const [previewState, setPreviewState] = useState<ServerAvailability>(
    status.availability,
  );

  const display = useMemo(
    () => ({
      ...status,
      availability: previewState,
      onlinePlayers: previewState === 'online' ? status.onlinePlayers : 0,
      maintenance:
        previewState === 'maintenance'
          ? {
              active: true,
              message: 'Scheduled world maintenance is in progress.',
              startsAt: null,
              endsAt: null,
            }
          : { ...status.maintenance, active: false },
      channels: status.channels.map((channel) => ({
        ...channel,
        availability:
          previewState === 'online'
            ? channel.availability
            : ('offline' as const),
        population: previewState === 'online' ? channel.population : 0,
      })),
    }),
    [previewState, status],
  );

  return (
    <div className="status-dashboard">
      {source === 'fixture' && (
        <fieldset className="shell status-preview-control">
          <legend>State preview</legend>
          {(['online', 'maintenance', 'offline'] as const).map((state) => (
            <button
              aria-pressed={previewState === state}
              key={state}
              onClick={() => setPreviewState(state)}
              type="button"
            >
              {stateLabels[state]}
            </button>
          ))}
        </fieldset>
      )}

      <section
        className="shell status-overview"
        aria-labelledby="world-health-title"
      >
        <div className={`world-health world-health-${display.availability}`}>
          <div className="world-health-icon">
            {display.availability === 'online' ? (
              <Radio aria-hidden="true" />
            ) : (
              <AlertTriangle aria-hidden="true" />
            )}
          </div>
          <div>
            <span>World health</span>
            <h2 id="world-health-title">{stateLabels[display.availability]}</h2>
            <p>
              {display.availability === 'online' &&
                'The world and public services are responding normally.'}
              {display.availability === 'maintenance' &&
                display.maintenance.message}
              {display.availability === 'offline' &&
                'The world is not accepting connections. Check back after the next status update.'}
            </p>
          </div>
          <time dateTime={display.updatedAt}>
            {source === 'public-read-api' ? 'Live check' : 'Fixture updated'}{' '}
            {new Date(display.updatedAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })}{' '}
            UTC
          </time>
        </div>

        <div className="status-stat-grid">
          <article>
            <Users aria-hidden="true" />
            <span>Population</span>
            <strong>{display.onlinePlayers.toLocaleString('en-US')}</strong>
            <small>players online</small>
          </article>
          <article>
            <Server aria-hidden="true" />
            <span>World</span>
            <strong>{display.world}</strong>
            <small>{display.channels.length} channels configured</small>
          </article>
          <article>
            <Clock3 aria-hidden="true" />
            <span>Uptime</span>
            <strong>
              {display.availability === 'online'
                ? formatUptime(display.uptimeSeconds)
                : '—'}
            </strong>
            <small>since last restart</small>
          </article>
          <article>
            <Activity aria-hidden="true" />
            <span>Current build</span>
            <strong>{display.build}</strong>
            <small>public display identifier</small>
          </article>
          <article>
            <Trophy aria-hidden="true" />
            <span>Population record</span>
            <strong>{display.recordOnline ?? '—'}</strong>
            <small>when supported</small>
          </article>
          <article>
            <CalendarDays aria-hidden="true" />
            <span>Current event</span>
            <strong>{display.activeEvent ?? 'None'}</strong>
            <small>provider-owned label</small>
          </article>
        </div>
      </section>

      <section
        className="shell channel-section"
        aria-labelledby="channel-health-title"
      >
        <div className="section-heading compact-heading">
          <div>
            <span className="section-index">Channel health</span>
            <h2 id="channel-health-title">Every route into the world.</h2>
          </div>
          <p>
            Challenge channels are shown separately from regular progression
            channels.
          </p>
        </div>
        <div className="channel-grid">
          {display.channels.map((channel) => {
            const percent =
              channel.population === null
                ? null
                : Math.round((channel.population / channel.capacity) * 100);
            return (
              <article
                className={`channel-card channel-${channel.availability}`}
                key={channel.id}
              >
                <div>
                  <span className="channel-dot" />
                  <strong>{channel.name}</strong>
                  {channel.challenge && <em>Challenge</em>}
                </div>
                <span>{channelStateLabels[channel.availability]}</span>
                <div
                  className="population-bar"
                  aria-label={
                    channel.population === null
                      ? 'Channel population unavailable'
                      : `${channel.population} of ${channel.capacity} players`
                  }
                >
                  <span style={{ width: `${percent ?? 0}%` }} />
                </div>
                <small>
                  {channel.availability === 'offline'
                    ? 'Unavailable'
                    : percent === null
                      ? 'Population not exposed'
                      : `${percent}% population`}
                </small>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
