export default function Loading() {
  return (
    <main className="state-page" aria-busy="true" aria-live="polite">
      <div className="shell loading-shell">
        <span className="loading-line loading-kicker" />
        <span className="loading-line loading-title" />
        <span className="loading-line loading-copy" />
        <div className="loading-card-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="loading-card" key={index} />
          ))}
        </div>
        <span className="sr-only">Loading TRIXTERMS data</span>
      </div>
    </main>
  );
}
