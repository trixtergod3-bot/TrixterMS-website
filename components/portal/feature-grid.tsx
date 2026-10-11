import Link from 'next/link';
import { ArrowUpRight, Flame, Gem, MoonStar, Sparkles, Swords, Users } from 'lucide-react';
import { featureCatalog } from '@/lib/portal/feature-catalog';

const icons = { swords: Swords, flame: Flame, moon: MoonStar, sparkles: Sparkles, gem: Gem, users: Users };
export function FeatureGrid({ detailed = false }: { detailed?: boolean }) {
  return <div className="beta-feature-grid">
    {featureCatalog.map((feature) => {
      const Icon = icons[feature.icon];
      return <article key={feature.id} id={detailed ? feature.id : undefined} className={'beta-feature beta-feature-' + feature.icon}>
        <div className="beta-feature-top"><span className="beta-feature-icon"><Icon size={26} aria-hidden="true" /></span><span className="pill">{feature.status}</span></div>
        <span className="beta-feature-label">{feature.label}</span>
        <h3>{feature.title}</h3><p>{feature.description}</p>
        <small>{feature.note}</small>
        <Link className="inline-link" href={detailed && feature.href.startsWith('/features#') ? '/patch-notes' : feature.href}>
          {detailed && feature.href.startsWith('/features#') ? 'Follow release notes' : feature.link}<ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </article>;
    })}
  </div>;
}
