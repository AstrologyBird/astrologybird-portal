'use client';

import { useState } from 'react';
import { supabaseBrowser } from '../lib/supabase/browser';
import type { Dictionary, Locale } from '../lib/i18n';
import { localePath } from '../lib/i18n';

export default function LoginForm({ lang, t, linkError, next }: { lang: Locale; t: Dictionary; linkError: boolean; next: string | null }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : localePath(lang, '/account');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`, shouldCreateUser: true },
    });
    setState(error ? 'error' : 'sent');
  };

  return (
    <form className="form card" onSubmit={submit}>
      {linkError && state === 'idle' && <p className="error" role="alert">{t.acct.linkError}</p>}
      <label>
        {t.acct.email}
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={state === 'sent'} />
      </label>
      {state === 'sent' ? (
        <p className="notice" role="status">{t.acct.sent}</p>
      ) : (
        <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? t.acct.sending : t.acct.sendLink}</button>
      )}
      {state === 'error' && <p className="error" role="alert">{t.acct.sendError}</p>}
    </form>
  );
}
