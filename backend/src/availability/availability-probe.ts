export type ProbeResponse = { status: number; json(): Promise<unknown> };
export type ProbeFetch = (url: string) => Promise<ProbeResponse>;

function requireHttps(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Availability probe URL must use HTTPS.');
  return parsed.toString();
}

export async function runAvailabilityProbe(fetch: ProbeFetch, frontendHealthUrl: string, backendBaseUrl: string) {
  const frontend = await fetch(requireHttps(frontendHealthUrl));
  if (frontend.status < 200 || frontend.status >= 300) throw new Error('Frontend availability probe failed.');

  const readyUrl = new URL('/health/ready', requireHttps(backendBaseUrl)).toString();
  const ready = await fetch(readyUrl);
  if (ready.status !== 200) throw new Error('Backend readiness probe failed.');
  let body: unknown;
  try { body = await ready.json(); } catch { throw new Error('Backend readiness response is invalid.'); }
  if (typeof body !== 'object' || body === null || (body as { status?: unknown }).status !== 'ready') {
    throw new Error('Backend readiness response is invalid.');
  }
  return { status: 'SUCCESS' as const };
}
