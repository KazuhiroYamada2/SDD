import { describe, expect, it, vi } from 'vitest';
import {
  buildMaintenanceMessage, createMaintenanceEvent, sendMaintenanceNotification, validatePhase,
  type MaintenanceEvent, type MaintenanceRepository,
} from './maintenance-service.js';

const event = (type: 'PLANNED' | 'EMERGENCY' = 'PLANNED'): MaintenanceEvent => ({
  id: '10000000-0000-4000-8000-000000000001', type,
  startsAt: new Date('2026-10-01T01:00:00Z'), expectedRecoveryAt: new Date('2026-10-01T02:00:00Z'),
  impact: 'Service is unavailable.', contact: 'Operations desk.', createdAt: new Date('2026-09-01T00:00:00Z'),
});

const repository = (overrides: Partial<MaintenanceRepository> = {}): MaintenanceRepository => ({
  createEvent: vi.fn(), findEvent: vi.fn().mockResolvedValue(event()),
  listActiveRecipients: vi.fn().mockResolvedValue([{ id: 'u1', email: 'one@example.test' }, { id: 'u2', email: 'two@example.test' }]),
  claimDelivery: vi.fn().mockResolvedValue(true), markSent: vi.fn(), markFailed: vi.fn(), ...overrides,
});

describe('maintenance event and message', () => {
  it('validates event input and stores absolute instants', async () => {
    const repo = repository();
    const result = await createMaintenanceEvent(repo, {
      type: 'PLANNED', startsAt: '2026-10-01T10:00:00+09:00', expectedRecoveryAt: '2026-10-01T11:00:00+09:00',
      impact: ' impact ', contact: ' contact ',
    });
    expect(result.startsAt.toISOString()).toBe('2026-10-01T01:00:00.000Z');
    expect(repo.createEvent).toHaveBeenCalledOnce();
  });

  it.each([
    ['PLANNED', 'INITIAL'], ['PLANNED', 'REMINDER'], ['EMERGENCY', 'EMERGENCY'],
  ] as const)('accepts %s + %s', (type, phase) => expect(() => validatePhase(type, phase)).not.toThrow());

  it.each([
    ['PLANNED', 'EMERGENCY'], ['EMERGENCY', 'INITIAL'], ['EMERGENCY', 'REMINDER'],
  ] as const)('rejects %s + %s', (type, phase) => expect(() => validatePhase(type, phase)).toThrow());

  it('builds deterministic plain text with JST dates and required content', () => {
    const message = buildMaintenanceMessage(event(), 'REMINDER');
    expect(message.subject).toBe('maintenance開始1時間前の再通知');
    expect(message.body).toContain('2026-10-01 10:00 JST');
    expect(message.body).toContain('影響: Service is unavailable.');
    expect(message.body).toContain('問い合わせ先: Operations desk.');
  });
});

describe('maintenance delivery', () => {
  it('records success and suppresses deliveries that are already claimed', async () => {
    const repo = repository({ claimDelivery: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) });
    const transport = { send: vi.fn().mockResolvedValue({ messageId: 'provider-id' }) };
    expect(await sendMaintenanceNotification(repo, transport, event().id, 'INITIAL'))
      .toEqual({ target: 2, sent: 1, failed: 0, skipped: 1 });
    expect(transport.send).toHaveBeenCalledOnce();
  });

  it('continues after one recipient failure and records only a safe failure code', async () => {
    const repo = repository();
    const transport = { send: vi.fn().mockRejectedValueOnce(new Error('provider raw credential detail')).mockResolvedValueOnce({ messageId: null }) };
    expect(await sendMaintenanceNotification(repo, transport, event().id, 'INITIAL'))
      .toEqual({ target: 2, sent: 1, failed: 1, skipped: 0 });
    expect(repo.markFailed).toHaveBeenCalledWith(event().id, 'INITIAL', 'u1', 'SES_SEND_FAILED');
    expect(JSON.stringify(vi.mocked(repo.markFailed).mock.calls)).not.toContain('provider raw credential detail');
  });
});

