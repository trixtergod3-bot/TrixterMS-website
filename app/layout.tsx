import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { createSiteMetadata } from '@/lib/site-config';
import './globals.css';
import './portal.css';
import './midnight.css';

export const metadata = createSiteMetadata();
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><div id="main-content">{children}</div><SiteFooter/></body></html>}
