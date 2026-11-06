import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary, isLocale } from '../../../lib/i18n';
import RelationshipTool from '../../../components/RelationshipTool';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return { title: t.rel.metaTitle, description: t.rel.metaDescription, alternates: { languages: { en: '/relationship', nl: '/nl/relationship' } } };
}

export default async function RelationshipPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.rel.eyebrow}</div>
        <h1>{t.rel.title}</h1>
        <p className="lead">{t.rel.lead}</p>
      </section>
      <RelationshipTool lang={lang} t={t} waitlistUrl={process.env.NEXT_PUBLIC_WAITLIST_URL ?? 'https://www.astrologybird.com/waitlist'} />
    </main>
  );
}
