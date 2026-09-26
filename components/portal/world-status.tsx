import type { PortalEnvelope, StatusData } from '@/lib/portal/contracts';
import { DataNote, displayCount } from './shared';

function availability(online: boolean | null | undefined): string {
  return online === true ? 'Online' : online === false ? 'Offline' : 'Unavailable';
}

/** Displays only the validated public observation. Unknown channel counts stay unknown. */
export function WorldStatusPanel({ response, compact = false }: {
  response: PortalEnvelope<StatusData>;
  compact?: boolean;
}) {
  const status = response.data;
  const channels = status?.channels;
  return (
    <div className={`public-world-status${compact ? ' public-world-status-compact' : ''}`}>
      <DataNote response={response} />
      <div className="stat-grid">
        <div className="stat-tile"><span>World</span><strong>{status?.world ? status.world.name ?? `World ${status.world.id}` : 'Unavailable'}</strong></div>
        <div className="stat-tile"><span>World status</span><strong>{availability(status?.online)}</strong></div>
        <div className="stat-tile"><span>Players online</span><strong>{displayCount(status?.playersOnline)}</strong></div>
        <div className="stat-tile"><span>Game version</span><strong>{status?.version ?? 'Unavailable'}</strong></div>
      </div>
      {!status && <p className="data-note">Current status is unavailable. The game may still be online.</p>}
      {!compact && (
        <section className="portal-panel" aria-label="World rates">
          <h2>World rates</h2>
          <div className="portal-three-grid">
            {(['exp', 'meso', 'drop'] as const).map((key) => (
              <div className="stat-tile" key={key}>
                <span>{key === 'exp' ? 'EXP' : key === 'meso' ? 'Mesos' : 'Drop'}</span>
                <strong>{status?.rates[key] === null || status?.rates[key] === undefined ? '—' : `${status.rates[key]}×`}</strong>
              </div>
            ))}
          </div>
          <p>Current base world rates. Character bonuses and special events may apply separately.</p>
        </section>
      )}
      <section className="portal-panel public-channel-status" aria-label="Channel status">
        <h2>Channels</h2>
        {channels && channels.length > 0 ? (
          <div className="portal-three-grid">
            {channels.map((channel) => (
              <article className="stat-tile public-channel-card" key={channel.id}>
                <span>{channel.name ?? `Channel ${channel.id}`}</span>
                <strong>{availability(channel.online)}</strong>
                <p>{channel.playersOnline === null ? 'Population unavailable' : `${displayCount(channel.playersOnline)} players online`}</p>
              </article>
            ))}
          </div>
        ) : <p>{channels?.length === 0 ? 'No public channels are listed in this update.' : 'Channel status is not available right now.'}</p>}
      </section>
    </div>
  );
}
