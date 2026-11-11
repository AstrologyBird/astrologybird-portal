import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '../../../lib/i18n';
import LoginForm from '../../../components/LoginForm';

export const metadata: Metadata = { robots: { index: false } };

export default async function LoginPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ error?: string; next?: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const t = getDictionary(lang);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.nav.account}</div>
        <h1>{t.acct.loginTitle}</h1>
        <p className="lead">{t.acct.loginLead}</p>
      </section>
      <LoginForm lang={lang} t={t} linkError={sp.error === 'link'} next={sp.next ?? null} />
    </main>
  );
}
