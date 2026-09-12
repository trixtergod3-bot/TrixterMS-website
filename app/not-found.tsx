import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="state-page">
      <div className="state-panel">
        <Compass aria-hidden="true" />
        <span className="section-index">404 · Uncharted</span>
        <h1>This path is outside the world map.</h1>
        <p>
          The page or character record may have moved, or it may not exist in
          the current public snapshot.
        </p>
        <div className="state-actions">
          <Link className="button button-primary" href="/">
            Return home
          </Link>
          <Link className="button button-secondary" href="/rankings">
            Browse rankings
          </Link>
        </div>
      </div>
    </main>
  );
}
