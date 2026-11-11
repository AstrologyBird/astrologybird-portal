'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase/browser';
import { ACCOUNTS_OPEN } from '../lib/supabase/config';
import { localePath, type Dictionary, type Locale } from '../lib/i18n';

/** Header button: "My account" when signed in, otherwise the sign-up call to action. */
export default function AccountLink({ lang, t, waitlistUrl }: { lang: Locale; t: Dictionary; waitlistUrl: string }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (signedIn) return <a className="btn btn-small" href={localePath(lang, '/account')}>{t.acct.myAccount}</a>;
  return <a className="btn btn-small" href={ACCOUNTS_OPEN ? localePath(lang, '/login') : waitlistUrl}>{t.nav.account}</a>;
}
