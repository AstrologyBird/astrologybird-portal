// Server-side helper: forwards requests to the chart engine service.
// Falls back to the public engine, so a preview without CHART_ENGINE_URL still works.
const ENGINE = (process.env.CHART_ENGINE_URL || (process.env.NODE_ENV === 'production' ? 'https://astrologybird-chart-engine-2ofw.vercel.app' : 'http://localhost:8787')).replace(/\/$/, '');

export async function engineFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ENGINE}${path}`, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
