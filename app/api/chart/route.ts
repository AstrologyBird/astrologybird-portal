import { engineFetch } from '../../../lib/engine';

export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 20000) return Response.json({ error: 'body too large' }, { status: 413 });
  try {
    return await engineFetch('/api/chart', { method: 'POST', body });
  } catch {
    return Response.json({ error: 'chart engine unavailable' }, { status: 502 });
  }
}
