'use client';
import { useEffect, useState, type SubmitEvent } from 'react';
import Link from 'next/link';
const messages: Record<string, string> = {
  INVALID_REGISTRATION: 'Use 4–13 letters or numbers for your ID and 8–32 printable characters without spaces for your password. Both passwords must match.',
  USERNAME_TAKEN: 'That account ID is already in use. Choose another ID.',
  RATE_LIMITED: 'Too many attempts. Please wait before trying again.',
  REGISTRATION_UNAVAILABLE: 'Registration is not available right now. Please check back soon.',
  REQUEST_REJECTED: 'Your form session expired. Refresh this page and try again.',
};
export function RegistrationForm({ enabled }: { enabled: boolean }) {
  const [csrfToken, setCsrfToken] = useState('');
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    fetch('/api/register', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && typeof result.csrfToken === 'string') setCsrfToken(result.csrfToken);
        else setMessage(messages[result.code] ?? messages.REGISTRATION_UNAVAILABLE);
      }).catch(() => { if (!abort.signal.aborted) setMessage(messages.REGISTRATION_UNAVAILABLE); });
    return () => abort.abort();
  }, [enabled]);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || !csrfToken || pending || created) return;
    const form = event.currentTarget; const values = new FormData(form);
    if (values.get('password') !== values.get('passwordConfirmation')) {
      setMessage('The two passwords do not match.'); return;
    }
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/register', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(Object.fromEntries(values)),
      });
      const result = await response.json();
      if (response.status === 201 && result.code === 'ACCOUNT_CREATED') {
        form.reset(); setCreated(true); setMessage('Your account is ready. Open MapleStory and sign in on its ID and password screen.');
      } else setMessage(messages[result.code] ?? messages.REGISTRATION_UNAVAILABLE);
    } catch { setMessage(messages.REGISTRATION_UNAVAILABLE); }
    finally { setPending(false); }
  }
  return <form className="portal-panel registration-form" onSubmit={submit} aria-labelledby="registration-form-title">
    <h2 id="registration-form-title">Create your account</h2>
    {!enabled && <p className="portal-notice">Registration will open when the beta account service is ready.</p>}
    <fieldset disabled={!enabled || pending || created}>
      <div className="field"><label htmlFor="register-username">Account ID</label>
        <input id="register-username" name="username" autoComplete="username" minLength={4} maxLength={13}
          pattern="[A-Za-z0-9]{4,13}" required spellCheck={false} aria-describedby="username-help" />
        <small id="username-help">4–13 letters or numbers. This is your in-game login ID.</small></div>
      <div className="field"><label htmlFor="register-password">Password</label>
        <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={32}
          pattern="[!-~]{8,32}" required aria-describedby="password-help" />
        <small id="password-help">8–32 printable characters, without spaces. Use a unique password.</small></div>
      <div className="field"><label htmlFor="register-confirm">Confirm password</label>
        <input id="register-confirm" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} maxLength={32} required /></div>
      <div hidden aria-hidden="true"><label htmlFor="register-website">Website</label>
        <input id="register-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></div>
      <button className="button button-primary" type="submit" disabled={!enabled || !csrfToken || pending || created}>
        {created ? 'Account created' : pending ? 'Creating account…' : enabled ? 'Create account' : 'Registration opens soon'}
      </button>
    </fieldset>
    {message && <output aria-live="polite">{message}</output>}
    {created && <Link className="button button-secondary" href="/download">Download TRIXTERMS</Link>}
  </form>;
}
