import type { FeatureStatus } from '@/lib/contracts/public';

const labels: Record<FeatureStatus, string> = {
  live: 'Live',
  beta: 'Beta',
  'in-development': 'In development',
  roadmap: 'Roadmap',
};

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span className={`status-badge status-badge-${status}`}>
      {labels[status]}
    </span>
  );
}
