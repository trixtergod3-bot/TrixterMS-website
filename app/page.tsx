import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Download, Swords, Flame, Gem, Trophy, BookOpen, Users, Sparkles, UserRound, CalendarDays, Radio, MoonStar } from 'lucide-react';
import { readPortal } from '@/lib/portal/data';
import type { StatusData, RankingsData, TournamentData } from '@/lib/portal/contracts';
import { SectionHeading } from '@/components/portal/shared';
import { HomeLeaders } from '@/components/portal/home-leaders';
import { WorldStatusPanel } from '@/components/portal/world-status';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [status, overall, daily, weekly] = await Promise.all([
    readPortal<StatusData>('/api/status'), readPortal<RankingsData>('/api/rankings'),
    readPortal<TournamentData>('/api/rankings/daily'), readPortal<TournamentData>('/api/rankings/weekly'),
  ]);
  const state = status.data?.online === true ? 'Online' : status.data?.online === false ? 'Offline' : 'Status unavailable';
  return <main className="beta-home midnight-home">
    <div className="midnight-world" aria-hidden="true"><picture><source media="(max-width: 640px)" srcSet="/art/trixterms-midnight-mobile.webp" /><Image src="/art/trixterms-midnight-world.webp" fill loading="eager" fetchPriority="high" sizes="100vw" alt="" /></picture></div>
    <section className="portal-hero" aria-labelledby="home-title">
      <div className="shell portal-hero-content">
        <div className="hero-kicker"><MoonStar size={15} /> GMS v111.1 <i /> THE BETA CHAPTER</div>
        <div className="hero-wordmark"><Sparkles className="wordmark-star" aria-hidden="true" /><h1 id="home-title">TRIXTERMS</h1></div>
        <p className="hero-ribbon">A NEW CHAPTER BEGINS</p>
        <p className="hero-intro">Same memories. New adventures.<br />A familiar world. A brighter tomorrow.</p>
        <div className="hero-buttons">
          <Link href="/download" className="button button-gold hero-play"><Download size={27} /><span>PLAY NOW<small>Download & start your journey</small></span></Link>
          <Link href="/register" className="button button-glass"><UserRound size={27} /><span>REGISTER<small>Your next story starts here</small></span></Link>
        </div>
        <div className="hero-footnote"><Sparkles size={13} /><span>Explore</span><i /><span>Level</span><i /><span>Meet</span><i /><span>Belong</span><Sparkles size={13} /></div>
      </div>
    </section>
    <div className="shell portal-main">
      <div className="adventure-dashboard">
        <aside className="adventure-sidebar" aria-label="Account and server information">
          <section className="game-panel account-panel" aria-labelledby="account-title">
            <div className="game-panel-heading"><h2 id="account-title"><UserRound size={16} /> Your account</h2></div>
            <div className="account-panel-body"><div className="account-emblem"><MoonStar size={30} /></div><h3>Your adventure awaits.</h3><p>One account. A world of possibilities.</p><Link href="/register" className="button button-gold">Create an account <ArrowRight size={15} /></Link><Link href="/guide" className="account-help">Getting started <ArrowUpRight size={13} /></Link><small>Sign in with your ID and password inside the game.</small></div>
          </section>
          <section className="game-panel server-panel" aria-labelledby="server-info-title">
            <div className="game-panel-heading"><h2 id="server-info-title"><Radio size={16} /> Server info</h2><Link href="/status" aria-label="View full server status"><ArrowUpRight size={16} /></Link></div>
            <div className="server-state"><i className={'world-dot ' + (status.data?.online === true ? 'online' : '')} />{state}</div>
            <WorldStatusPanel response={status} compact />
            <div className="sidebar-rates" aria-label="World rates">{(['exp', 'meso', 'drop'] as const).map(key => <div key={key}><span>{key === 'exp' ? 'EXP' : key === 'meso' ? 'Mesos' : 'Drop'}</span><strong>{status.data?.rates[key] == null ? '—' : status.data.rates[key] + '×'}</strong></div>)}</div>
          </section>
        </aside>
        <div className="adventure-center">
          <section className="game-panel news-panel" aria-labelledby="latest-news-title">
            <div className="game-panel-heading"><h2 id="latest-news-title">Latest news</h2><Link href="/news">View all <ArrowRight size={13} /></Link></div>
            <Link className="news-lead" href="/news#beta-portal"><span className="news-tag">JOURNAL</span><div><h3>A home for your next adventure.</h3><p>The beta portal brings your next chapter together.</p><time dateTime="2026-09-12">12 September 2026</time></div><ArrowUpRight size={17} /></Link>
            <Link className="news-row" href="/classes"><span className="news-tag tag-violet">CLASSES</span><div><h3>Familiar jobs. New possibilities.</h3><p>Explore the remaster and classes in development.</p></div><ArrowUpRight size={15} /></Link>
            <Link className="news-row" href="/achievements"><span className="news-tag tag-cyan">DISCOVER</span><div><h3>Make every milestone matter.</h3><p>40 achievements. Eight paths to explore.</p></div><ArrowUpRight size={15} /></Link>
            <Link className="news-row" href="/download"><span className="news-tag tag-blue">BETA</span><div><h3>Your journey starts here.</h3><p>Client availability and installation guide.</p></div><ArrowUpRight size={15} /></Link>
          </section>
          <section className="game-panel ranking-panel" aria-labelledby="top-players-title"><div className="game-panel-heading"><h2 id="top-players-title"><Trophy size={16} /> Top players</h2><Link href="/rankings">Full rankings <ArrowRight size={13} /></Link></div><HomeLeaders overall={overall} daily={daily} weekly={weekly} /></section>
        </div>
        <aside className="adventure-right" aria-label="Events and community">
          <section className="game-panel events-panel" aria-labelledby="events-title"><div className="game-panel-heading"><h2 id="events-title">Events</h2><Link href="/events">View all <ArrowRight size={13} /></Link></div><div className="events-intro"><CalendarDays size={27} /><h3>Good things are gathering.</h3><p>Dates and rules will appear here when the next world events are confirmed.</p><span className="pill">ANNOUNCEMENTS TO COME</span></div><Link href="/rankings/daily" className="event-row"><Trophy size={26} /><div><strong>Daily challenges</strong><small>Explore the competition</small></div><ArrowUpRight size={14} /></Link><Link href="/rankings/weekly" className="event-row"><Swords size={26} /><div><strong>Weekly legends</strong><small>A whole week to make your mark</small></div><ArrowUpRight size={14} /></Link></section>
          <Link href="/discord" className="game-panel legend-card"><Users size={23} /><span>BETTER WITH A PARTY</span><h2>Become a legend.<br /><em>Together.</em></h2><p>Find your people. Write your story.</p><span className="inline-link">Join the community <ArrowRight size={17} /></span></Link>
        </aside>
      </div>
      <section className="home-features"><SectionHeading eyebrow="CLASSIC ROOTS · A WORLD OF OUR OWN" title="More reasons to return." href="/features" label="Discover TRIXTERMS" /><div className="feature-cards"><Link href="/classes" className="feature-card explorer-card"><Swords className="feature-art" size={108} strokeWidth={.7} /><span className="pill">CLASS REMASTERS</span><h3>The explorers.<br />Reimagined.</h3><p>Your favorite jobs, with a new chapter to master.</p><span className="inline-link">Explorer Remaster <ArrowUpRight size={16} /></span></Link><Link href="/classes#demon-avenger" className="feature-card avenger-card"><Flame className="feature-art" size={115} strokeWidth={.7} /><span className="pill">IN DEVELOPMENT</span><h3>Power with<br />a different pulse.</h3><p>Meet Demon Avenger, our next class adventure.</p><span className="inline-link">Meet Demon Avenger <ArrowUpRight size={16} /></span></Link><Link href="/features" className="feature-card systems-card"><Gem className="feature-art" size={104} strokeWidth={.7} /><span className="pill">CUSTOM SYSTEMS</span><h3>Progress that<br />stays with you.</h3><p>Cards, cubing, and milestones for the long journey.</p><span className="inline-link">Discover the systems <ArrowUpRight size={16} /></span></Link></div></section>
      <section className="home-milestones"><div><span className="eyebrow">SMALL STEPS. GREAT STORIES.</span><h2>Every adventure<br />has its milestones.</h2><p>Explore the staged beta catalog: 40 achievements across eight paths. Character progress will arrive with the public world feed.</p><Link href="/achievements" className="inline-link">Explore achievements <ArrowRight size={17} /></Link></div><div className="milestone-cards"><Link href="/achievements"><Trophy size={28} /><strong>First Steps</strong><span>Reach level 10</span><small>CATALOG PREVIEW · 10 AP</small></Link><Link href="/achievements"><BookOpen size={28} /><strong>Find your path</strong><span>Combat, exploration & more</span><small>8 ACHIEVEMENT CATEGORIES</small></Link><Link href="/database"><Gem size={28} /><strong>Know your world</strong><span>Items, monsters & equipment</span><small>EXPLORE THE DATABASE</small></Link></div></section>
      <section className="recent-unlocks portal-panel" aria-labelledby="recent-unlocks-title"><span className="eyebrow">MOMENTS WORTH REMEMBERING</span><h2 id="recent-unlocks-title">Latest achievement unlocks.</h2><p>Fresh milestones from across the world will appear here when the public achievement feed opens.</p><span className="pill">RECENT UNLOCKS UNAVAILABLE</span></section>
      <section className="home-start"><Sparkles size={28} /><span className="eyebrow">READY FOR A NEW CHAPTER?</span><h2>See you in TRIXTERMS.</h2><p>Create your account, get the verified client, and sign in through the native game login flow.</p><Link href="/download" className="button button-gold"><Download size={17} /> Download & get started</Link></section>
    </div>
  </main>;
}
