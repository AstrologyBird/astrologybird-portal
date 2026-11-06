import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { LOCALES, getDictionary, isLocale, localePath } from '../../lib/i18n';
import '../globals.css';

export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.meta.title,
    description: t.meta.description,
    icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
    alternates: { languages: { en: '/', nl: '/nl' } },
  };
}

export const viewport: Viewport = { themeColor: '#0e1630' };

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const waitlist = process.env.NEXT_PUBLIC_WAITLIST_URL ?? 'https://www.astrologybird.com/waitlist';
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&family=Noto+Sans+Symbols&family=Noto+Sans+Symbols+2&display=swap"
        />
      </head>
      <body>
        <div className="wrap">
          <header className="topbar">
            <a href={lang === 'nl' ? 'https://www.astrologybird.com/nl' : 'https://www.astrologybird.com'} aria-label={t.nav.home}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Astrologybird" width={148} height={34} />
            </a>
            <nav>
              <span className="lang">
                <a href={localePath('en')} aria-current={lang === 'en'}>EN</a>
                <a href={localePath('nl')} aria-current={lang === 'nl'}>NL</a>
              </span>
              <a className="btn btn-small" href={waitlist}>{t.nav.account}</a>
            </nav>
          </header>
          {children}
          <footer className="footer">
            <span>{t.footer.privacy}</span>
            <a href={lang === 'nl' ? 'https://www.astrologybird.com/nl' : 'https://www.astrologybird.com'}>{t.footer.back}</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
