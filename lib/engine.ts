// Server-side helper: forwards requests to the chart engine service.
const ENGINE = process.env.CHART_ENGINE_URL ?? 'http://localhost:8787';

export async function engineFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${ENGINE}${path}`, { ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
