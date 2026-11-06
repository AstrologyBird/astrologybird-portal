'use client';

import { usePathname } from 'next/navigation';
import { getDictionary, localePath } from '../../lib/i18n';

export default function NotFound() {
  const path = usePathname() ?? '/';
  const lang = path === '/nl' || path.startsWith('/nl/') ? 'nl' : 'en';
  const t = getDictionary(lang).notFound;
  return (
    <main className="hero notfound">
      <div className="eyebrow">404</div>
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <div className="notfound-actions">
        <a className="btn" href={localePath(lang)}>{t.chart}</a>
        <a className="btn btn-ghost" href={localePath(lang, '/relationship')}>{t.relationship}</a>
      </div>
    </main>
  );
}
