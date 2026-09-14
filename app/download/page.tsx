import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, ShieldCheck, Gamepad2 } from 'lucide-react';
import { PageHero } from '@/components/shared/page-hero';
import type { DownloadArtifact } from '@/lib/portal/integrations';
import { getReleaseDownloads } from '@/lib/portal/release-downloads';
export const metadata: Metadata = { title: 'Download TRIXTERMS', description: 'Download the Windows launcher, install TRIXTERMS, and sign in through the native game login.' };
export const dynamic = 'force-dynamic';
function Artifact({ artifact, title }: { artifact: DownloadArtifact; title: string }) {
  return <article className="portal-panel"><Download aria-hidden="true" /><h3>{title}</h3>
    <p>{title === 'Launcher' ? 'Small download. Installs or updates TRIXTERMS automatically.' : 'Complete game package. Extract, launch and play.'}</p><p>Windows x64 · {(artifact.sizeBytes / 1024 / 1024).toFixed(1)} MiB</p>
    <a className={title === 'Launcher' ? 'button button-primary' : 'button button-secondary'} href={artifact.url} rel="noopener noreferrer">{title === 'Launcher' ? 'DOWNLOAD LAUNCHER' : 'DOWNLOAD FULL CLIENT'}</a>
    <details><summary>SHA-256 checksum</summary><code className="checksum">{artifact.sha256}</code></details>
  </article>;
}
export default async function DownloadPage() {
  const downloads = await getReleaseDownloads();
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

          {downloads.launcher && <Artifact artifact={downloads.launcher} title="Launcher" />}
          {downloads.fullClient && <Artifact artifact={downloads.fullClient} title="Full client" />}
        </div>
        {downloads.manifest && <details><summary>Release verification details</summary><p><a href={downloads.manifest.url} rel="noopener noreferrer">Release manifest</a> · sequence {downloads.manifest.sequence}. The launcher authenticates the signed manifest and verifies managed files before applying updates.</p></details>}
      </> : <div className="portal-panel"><span className="eyebrow">Release preparation</span>
        <h3>The next journey is getting ready.</h3><p>Beta downloads will appear here when the client and launcher are published. Current release version and patch status are awaiting publication.</p>
        <span className="button button-disabled" aria-disabled="true">Downloads coming soon</span>
        <p>Follow release announcements for availability.</p><Link href="/discord">Visit the community page</Link></div>}
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
          {downloads?.fullClient && <p>For the full client, extract the ZIP into a writable folder and open its included launcher. It verifies existing files and downloads only files that need updating or repair.</p>}{downloads && <p>Open the supplied launcher executable without renaming it.</p>}
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
