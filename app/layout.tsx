import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import './globals.css';
import './portal.css';
export const metadata:Metadata={
 metadataBase:new URL('https://trixterms.com'),
 applicationName:'TRIXTERMS',
 icons:{icon:'/favicon.svg'},
 title:{default:'TRIXTERMS — A familiar world. A new adventure.',template:'%s — TRIXTERMS'},
 description:'An independent GMS v111.1 adventure with classic roots, remastered possibilities, and a new beta chapter. Downloads, rankings, achievements and community.',
 openGraph:{type:'website',siteName:'TRIXTERMS',title:'TRIXTERMS — The beta chapter',description:'A familiar world. A new adventure.',images:[{url:'/art/trixter-world.webp',width:1672,height:941,alt:'The original TRIXTERMS floating village'}]},
 twitter:{card:'summary_large_image',title:'TRIXTERMS — The beta chapter',description:'A familiar world. A new adventure.',images:[{url:'/art/trixter-world.webp',alt:'The original TRIXTERMS floating village'}]},
 robots:process.env.TRIXTER_PUBLIC_LAUNCH==='true'?{index:true,follow:true}:{index:false,follow:false}
};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader/><div id="main-content">{children}</div><SiteFooter/></body></html>}
