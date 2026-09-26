'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Sparkles, Menu, X } from 'lucide-react';

const navigation = [['/', 'Home'], ['/rankings', 'Rankings'], ['/achievements', 'Achievements'], ['/database', 'Database'], ['/free-market', 'Free Market']] as const;
const more = [['/register', 'Register'], ['/download', 'Download'], ['/classes', 'Classes'], ['/features', 'Features'], ['/news', 'News'], ['/events', 'Events'], ['/rankings/daily', 'Daily rankings'], ['/rankings/weekly', 'Weekly rankings'], ['/vote', 'Vote'], ['/donate', 'Donate'], ['/discord', 'Discord'], ['/status', 'Server status'], ['/guide', 'Getting started']] as const;
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  return <header className="portal-header">
    <div className="portal-ribbon"><div className="shell"><span>A NEW CHAPTER IN A FAMILIAR WORLD</span><Link href="/news">TRIXTERMS beta journal <ArrowUpRight size={12}/></Link></div></div>
    <div className="shell portal-header-inner">
      <Link className="portal-brand" href="/" aria-label="TRIXTERMS home"><Sparkles aria-hidden="true" size={31}/><span>TRIXTERMS<small>YOUR NEXT ADVENTURE</small></span></Link>
      <nav className="portal-desktop-nav" aria-label="Primary navigation">{navigation.map(([href,label])=><Link key={href} href={href} aria-current={active(href)?'page':undefined}>{label}</Link>)}
        <details className="portal-more"><summary>More</summary><div>{more.map(([href,label])=><Link key={href} href={href} onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')}>{label}</Link>)}</div></details>
      </nav>
      <div className="portal-header-actions"><Link className="portal-register-link" href="/register">Register</Link><Link className="button button-gold button-small" href="/download">Play now <ArrowUpRight size={15}/></Link>
      <button className="portal-menu-toggle" type="button" aria-expanded={open} aria-controls="portal-mobile-nav" aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>
    </div>
    {open&&<nav id="portal-mobile-nav" className="portal-mobile-nav shell" aria-label="Mobile navigation">{[...navigation,...more].map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={active(href)?'page':undefined}>{label}</Link>)}</nav>}
  </header>;
}
