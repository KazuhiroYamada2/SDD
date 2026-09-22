import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

describe('GET /health', () => {
  it('returns HTTP 200 and an ok status', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('health endpoints', () => {
  it('returns liveness without querying the database or requiring authentication', async () => {
    const query = vi.fn();

    const response = await request(createApp({ healthDatabase: { query } })).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });

  it('returns readiness after a lightweight database query without authentication', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

    const response = await request(createApp({ healthDatabase: { query } })).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ready' });
    expect(query).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns a generic unavailable response when the database query fails', async () => {
    const internalError = 'connection failed for secret-host.example';
    const query = vi.fn().mockRejectedValue(new Error(internalError));

    const response = await request(createApp({ healthDatabase: { query } })).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
    expect(response.text).not.toContain(internalError);
  });

  it('returns unavailable when no database is configured', async () => {
    const response = await request(createApp({ healthDatabase: null })).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
  });
});
