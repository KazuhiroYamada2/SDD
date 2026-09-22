import { describe, expect, it, vi } from 'vitest';
import { runAvailabilityProbe } from './availability-probe.js';

const response = (status: number, body: unknown = {}) => ({ status, json: vi.fn().mockResolvedValue(body) });

describe('availability probe', () => {
  it('succeeds only when frontend is 2xx and readiness is ready', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(200, { status: 'ready' }));
    await expect(runAvailabilityProbe(fetch, 'https://frontend.example.test/', 'https://backend.example.test/')).resolves.toEqual({ status: 'SUCCESS' });
    expect(fetch.mock.calls[1]?.[0]).toBe('https://backend.example.test/health/ready');
  });

  it('fails for a frontend error', async () => {
    await expect(runAvailabilityProbe(vi.fn().mockResolvedValue(response(500)), 'https://frontend.example.test/', 'https://backend.example.test/')).rejects.toThrow('Frontend availability probe failed.');
  });

  it('fails for readiness 503', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(503));
    await expect(runAvailabilityProbe(fetch, 'https://frontend.example.test/', 'https://backend.example.test/')).rejects.toThrow('Backend readiness probe failed.');
  });

  it.each([['malformed JSON', response(200, undefined)], ['non-ready status', response(200, { status: 'unavailable' })]])('fails for %s without exposing response details', async (_name, ready) => {
    if (_name === 'malformed JSON') ready.json = vi.fn().mockRejectedValue(new Error('sensitive raw response'));
    const fetch = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(ready);
    await expect(runAvailabilityProbe(fetch, 'https://frontend.example.test/', 'https://backend.example.test/')).rejects.toThrow('Backend readiness response is invalid.');
  });

  it('rejects non-HTTPS URLs', async () => {
    await expect(runAvailabilityProbe(vi.fn(), 'http://frontend.example.test/', 'https://backend.example.test/')).rejects.toThrow('must use HTTPS');
  });
});
