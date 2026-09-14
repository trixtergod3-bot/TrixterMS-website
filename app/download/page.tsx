import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ShieldCheck, Gamepad2 } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import { getPublicIntegrations, type DownloadArtifact } from '@/lib/portal/integrations';
export const metadata: Metadata = { title: 'Download TRIXTERMS', description: 'Download the Windows launcher, install TRIXTERMS, and sign in through the native game login.' };
export const dynamic = 'force-dynamic';
const startupQa = {
  url: 'https://floralwhite-stinkbug-872547.hostingersite.com/beta/qa/TrixterMS-Startup-QA-1.3.4-qa1-78107ef1e9f7.zip?verify=78107ef1e9f7',
  sha256: '78107EF1E9F732F357DB24AEBBF5FBFA621465420AD4E08353A25A61BD749293',
};
function Artifact({ artifact, title }: { artifact: DownloadArtifact; title: string }) {
  return <article className="portal-panel"><Download aria-hidden="true" /><h3>{title}</h3>
    <p>{title} · Windows x64 · {(artifact.sizeBytes / 1024 / 1024).toFixed(1)} MiB</p>
    <a className="button button-primary" href={artifact.url} rel="noopener noreferrer">{title === 'Launcher' ? 'DOWNLOAD FOR WINDOWS' : `Download ${title}`}</a>
    <details><summary>SHA-256 checksum</summary><code className="checksum">{artifact.sha256}</code></details>
  </article>;
}
export default function DownloadPage() {
  const { downloads } = getPublicIntegrations();
  return <main>
    <PageHero eyebrow="TRIXTERMS · GMS v111.1" title="Your next adventure."
      description="Get the game, create your account, and make your mark on TRIXTERMS."
      aside={<div className="hero-stat"><Gamepad2 aria-hidden="true" /><strong>Windows</strong><span>native game client</span></div>} />
    <section className="shell portal-section" aria-labelledby="download-title">
      <div className="section-heading"><div><span className="eyebrow">Download center</span><h2 id="download-title">Get TRIXTERMS</h2></div>
        <Link className="button button-secondary" href="/patch-notes">Patch notes</Link></div>
      {downloads ? <>
        <p>Published beta · Current version: <strong>{downloads.releaseVersion}</strong> · {downloads.clientVersion}</p>
        <div className="portal-grid">
          {!downloads.launcher && downloads.fullClient && <Artifact artifact={downloads.fullClient} title="Full client" />}
          {downloads.launcher && <Artifact artifact={downloads.launcher} title="Launcher" />}
        </div>
        {downloads.manifest && <details><summary>Release verification details</summary><p><a href={downloads.manifest.url} rel="noopener noreferrer">Release manifest</a> · sequence {downloads.manifest.sequence}. The launcher authenticates the signed manifest and verifies managed files before applying updates.</p></details>}
      </> : <div className="portal-panel"><span className="eyebrow">Release preparation</span>
        <h3>The next journey is getting ready.</h3><p>Beta downloads will appear here when the client and launcher are published. Current release version and patch status are awaiting publication.</p>
        <span className="button button-disabled" aria-disabled="true">Downloads coming soon</span>
        <p>Follow release announcements for availability.</p><Link href="/discord">Visit the community page</Link></div>}
    </section>
    <section className="shell portal-section" aria-labelledby="qa-download-title">
      <div className="section-heading"><div><span className="eyebrow">Public Beta startup test</span><h2 id="qa-download-title">Startup QA download</h2></div></div>
      <article className="portal-panel">
        <h3>TRIXTERMS Startup QA 1.3.4</h3>
        <p>This optional diagnostic package requires an existing game installation. On a new PC, install the game with the Windows launcher above first.</p>
        <a className="button button-secondary" href={startupQa.url} rel="noopener noreferrer">Download Public Beta QA ZIP</a>
        <details><summary>QA ZIP SHA-256 checksum</summary><code className="checksum">{startupQa.sha256}</code></details>
        <p>Extract the ZIP into a separate folder, run <strong>1-TEST-ASCII.cmd</strong>, select your existing game folder, then use <strong>CHECK / REPAIR</strong> followed by <strong>PLAY</strong>.</p>
      </article>
    </section>
    <section className="shell portal-section" aria-labelledby="installation-title">
      <div className="section-heading"><div><span className="eyebrow">Three steps to play</span><h2 id="installation-title">A fresh start.</h2></div></div>
      <div className="portal-grid portal-grid-three">
        <article className="portal-panel"><span className="section-index">01</span><h3>Create your account</h3><p>Register your account ID and password through the registration page when it opens.</p><Link href="/register">Account registration</Link></article>
        <article className="portal-panel"><span className="section-index">02</span>
          <h3>{downloads?.launcher ? 'Install with the launcher' : 'Install the game'}</h3>
          {downloads?.fullClient && !downloads.launcher ? <p>Download the full client and extract the entire archive into a writable folder. Keep its files together. If you download the launcher separately, place it in that same folder.</p>
            : downloads?.launcher ? <p>Download the launcher into your chosen writable installation folder. If it comes in a ZIP, extract it there first. The launcher can be the only file in this folder; click UPDATE after the initial check. It downloads and verifies the game files for you.</p>
              : <p>Installation instructions will match the published package. A launcher-only release installs the game into your chosen folder; a full-client archive is extracted there.</p>}
          {downloads && <p>Open the supplied launcher executable without renaming it.</p>}
        </article>
        <article className="portal-panel"><span className="section-index">03</span><h3>Launch and sign in</h3><p>PLAY stays disabled while the launcher checks, updates, and verifies your files. Wait for Ready to play, then press PLAY and enter your ID and password on MapleStory’s native login screen.</p></article>
      </div>
    </section>
    <section className="shell portal-section portal-grid">
      <article className="portal-panel"><ShieldCheck aria-hidden="true" /><h2>File checks, built in.</h2><p>The launcher checks SHA-256 file hashes and authenticates its signed update manifest. A failed file check needs repair before you play.</p><p>The website cannot inspect files installed on your PC. Your launcher shows the current installation and update status.</p></article>
      <article className="portal-panel"><h2>Before you install</h2><ul><li>A Windows PC; the current launcher targets Windows x64.</li><li>A stable internet connection for installation and play.</li><li>A writable installation folder with space for the client and update backups.</li><li>Final tested Windows versions, hardware minimums, and required disk space will accompany the published release.</li></ul><p>No game database or Java installation is required on the player’s PC.</p></article>
    </section>
  </main>;
}
