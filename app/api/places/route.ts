import { engineFetch } from '../../../lib/engine';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').slice(0, 80);
  const lang = url.searchParams.get('lang') === 'nl' ? 'nl' : 'en';
  try {
    return await engineFetch(`/api/places?q=${encodeURIComponent(q)}&lang=${lang}`);
  } catch {
    return Response.json({ error: 'chart engine unavailable' }, { status: 502 });
  }
}
