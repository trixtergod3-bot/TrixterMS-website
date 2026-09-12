'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('TrixterMS public route failed', error);
  }, [error]);

  return (
    <main className="state-page">
      <div className="state-panel">
        <AlertTriangle aria-hidden="true" />
        <span className="section-index">Signal interrupted</span>
        <h1>We could not load this world record.</h1>
        <p>
          The public read service may be unavailable. No gameplay connection or
          database access was attempted.
        </p>
        <div className="state-actions">
          <button
            className="button button-primary"
            onClick={reset}
            type="button"
          >
            <RotateCcw aria-hidden="true" size={16} /> Try again
          </button>
          <Link className="button button-secondary" href="/status">
            View world status
          </Link>
        </div>
      </div>
    </main>
  );
}
