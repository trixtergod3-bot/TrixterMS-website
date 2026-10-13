'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUpRight, Download, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { mountAscent } from './ascent-engine.mjs';

const chapters = [
  [0, 'The abyss', 'ABYSS'], [.28, 'Genesis strike', 'GENESIS'], [.43, 'Maple World', 'MAPLE WORLD'],
  [.60, 'Holy Symbol', 'HOLY SYMBOL'], [.875, 'Angelic rebirth', 'REBIRTH'], [1, 'Astral Nexus', 'ASTRAL NEXUS'],
] as const;

export function AstralJourney() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!root.current) return;
    return mountAscent(root.current);
  }, []);

  return <section className="astral-journey" id="astral-ascent" ref={root} aria-label="An Astral story — from the abyss to Angel Avenger">
    <link rel="preload" as="image" href="/art/astral-ascent/astral-world-clean.webp" />
    <div className="astral-scene">
      <canvas id="astral-canvas" aria-hidden="true" />
      <div className="astral-vignette" aria-hidden="true" />
      <div className="astral-topline">
        <div className="astral-brand"><Sparkles aria-hidden="true" size={21} /><h1 id="home-title">TRIXTERMS</h1><span>AN ASTRAL STORY</span></div>
        <div className="astral-quick-links"><Link href="/classes">Explore classes <ArrowUpRight size={13} /></Link><Link href="/register">Register</Link><Link href="/download" className="astral-download"><Download size={14} /> Play now</Link></div>
      </div>
      <p className="astral-status" />
      <p className="astral-character" id="astral-character">Demon Avenger</p>
      <div className="astral-titles">
        <p className="astral-eyebrow"><span className="astral-chapter-index">01 / 06</span><span id="astral-chapter">THE LONG NIGHT</span></p>
        <h2 className="astral-title" id="astral-title">For so long,<br />bound to the dark.</h2>
        <p className="astral-description" id="astral-description">But even here, a light has been waiting.</p>
      </div>
      <ol className="astral-track" aria-label="Cinematic chapters">{chapters.map(([progress, label, short]) => <li key={label}><button type="button" data-chapter={progress} aria-label={label} aria-current={progress === 0 ? 'true' : 'false'}>{short}</button></li>)}</ol>
      <div className="astral-final-links"><Link href="/download" className="astral-primary-link"><Download size={15} /> Begin your adventure <ArrowUpRight size={15} /></Link><Link href="/register">Account details <ArrowUpRight size={14} /></Link></div>
      <div className="astral-scroll-hint"><ArrowDown size={18} aria-hidden="true" /><span>Scroll to ascend</span></div>
      <div className="astral-controls">
        <button className="astral-play" id="astral-play" type="button" aria-pressed="false"><Play size={13} aria-hidden="true" /><span>Play the story</span></button>
        <div className="astral-actions"><button className="astral-motion" id="astral-motion" type="button" aria-pressed="false"><Pause size={12} aria-hidden="true" /><span>Reduce motion</span></button><button className="astral-replay" id="astral-replay" type="button"><RotateCcw size={13} aria-hidden="true" /><span>Replay</span></button><a className="astral-skip" href="#portal-content">Enter the portal <ArrowUpRight size={13} aria-hidden="true" /></a></div>
      </div>
      <p className="astral-concept-note">A class-concept cinematic. Check beta release notes for playable classes.</p>
      <div className="astral-progress" aria-hidden="true" />
      <output className="astral-announcement sr-only" aria-live="polite" />
    </div>
  </section>;
}
