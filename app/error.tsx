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
    console.error('TRIXTERMS public route failed', error);
  }, [error]);

  return (
    <main className="state-page">
      <div className="state-panel">
        <AlertTriangle aria-hidden="true" />
        <span className="section-index">Signal interrupted</span>
        <h1>This page could not be loaded.</h1>
        <p>
          Please try again. If the problem continues, check server information
          or visit the community page for updates.
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
            View server information
          </Link>
        </div>
      </div>
    </main>
  );
}
