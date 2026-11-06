import { getDictionary, isLocale } from '../../lib/i18n';
import { notFound } from 'next/navigation';
import BirthChartTool from '../../components/BirthChartTool';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">{t.hero.eyebrow}</div>
        <h1>{t.hero.title}</h1>
        <p className="lead">{t.hero.lead}</p>
      </section>
      <BirthChartTool lang={lang} t={t} waitlistUrl={process.env.NEXT_PUBLIC_WAITLIST_URL ?? 'https://www.astrologybird.com/waitlist'} sourceUrl={process.env.NEXT_PUBLIC_ENGINE_SOURCE_URL ?? null} />
    </main>
  );
}
