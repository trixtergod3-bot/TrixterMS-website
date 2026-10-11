import Link from 'next/link';

const questions = [
  ['Can I play everything shown on the website?', 'Feature spotlights describe the beta direction. The matching release notes confirm what is available in your client. In-development content, including the Arcane River milestone, is not a public release.'],
  ['Why are downloads or registration unavailable?', 'Each opens after its release checks pass. If a service is unavailable, return to its page for the current state and follow official announcements. An unavailable page does not mean the game server is offline.'],
  ['How do I install the game?', 'Use an official download on the download page. Extract an archive before opening its supplied launcher, keep the files together in a writable folder, and let the launcher finish checking and updating before you press PLAY.'],
  ['Why is PLAY disabled or a file check failing?', 'PLAY stays disabled until the launcher finishes verification. Check your connection and writable installation folder, then retry the update. If it still fails, share the error message through the official community; never share your password.'],
  ['Where do I sign in?', 'Enter your account ID and password on MapleStory’s native login screen after launching. The launcher manages files. The website does not sign you into the game.'],
  ['Are the player counts and rankings live?', 'They appear only when the public service supplies verified data. Unknown counts remain unknown; unavailable rankings are not replaced with sample players.'],
] as const;

export function BetaFaq() {
  return <section className="shell beta-faq portal-section" id="faq" aria-labelledby="faq-title">
    <div className="section-heading"><div><span className="eyebrow">A little help before the journey</span><h2 id="faq-title">Your beta questions, answered.</h2></div></div>
    <div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    <p className="faq-help">Need more help? <Link href="/discord">Visit the official community</Link> or <Link href="/download">check the download guide</Link>.</p>
  </section>;
}
