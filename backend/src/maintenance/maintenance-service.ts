import { randomUUID } from 'node:crypto';

export type MaintenanceType = 'PLANNED' | 'EMERGENCY';
export type NotificationPhase = 'INITIAL' | 'REMINDER' | 'EMERGENCY';

export type MaintenanceEvent = {
  id: string;
  type: MaintenanceType;
  startsAt: Date;
  expectedRecoveryAt: Date;
  impact: string;
  contact: string;
  createdAt: Date;
};

export type MaintenanceEventInput = {
  type: MaintenanceType;
  startsAt: string;
  expectedRecoveryAt: string;
  impact: string;
  contact: string;
};

export type MaintenanceRecipient = { id: string; email: string };

export type MaintenanceRepository = {
  createEvent(event: MaintenanceEvent): Promise<void>;
  findEvent(id: string): Promise<MaintenanceEvent | null>;
  listActiveRecipients(): Promise<MaintenanceRecipient[]>;
  claimDelivery(eventId: string, phase: NotificationPhase, recipientId: string): Promise<boolean>;
  markSent(eventId: string, phase: NotificationPhase, recipientId: string, providerMessageId: string | null): Promise<void>;
  markFailed(eventId: string, phase: NotificationPhase, recipientId: string, failureCode: 'SES_SEND_FAILED'): Promise<void>;
};

export type MaintenanceEmailTransport = {
  send(message: { to: string; subject: string; body: string }): Promise<{ messageId: string | null }>;
};

const parseInstant = (value: string): Date => {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new Error('Maintenance event is invalid.');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Maintenance event is invalid.');
  return date;
};

export const validatePhase = (type: MaintenanceType, phase: NotificationPhase): void => {
  const valid = type === 'PLANNED'
    ? phase === 'INITIAL' || phase === 'REMINDER'
    : phase === 'EMERGENCY';
  if (!valid) throw new Error('Notification phase is invalid for the maintenance type.');
};

export const createMaintenanceEvent = async (
  repository: MaintenanceRepository,
  input: MaintenanceEventInput,
): Promise<MaintenanceEvent> => {
  const startsAt = parseInstant(input.startsAt);
  const expectedRecoveryAt = parseInstant(input.expectedRecoveryAt);
  if (input.impact.trim() === '' || input.contact.trim() === '' || expectedRecoveryAt <= startsAt) {
    throw new Error('Maintenance event is invalid.');
  }
  const event: MaintenanceEvent = {
    id: randomUUID(),
    type: input.type,
    startsAt,
    expectedRecoveryAt,
    impact: input.impact.trim(),
    contact: input.contact.trim(),
    createdAt: new Date(),
  };
  await repository.createEvent(event);
  return event;
};

const jst = (date: Date): string => new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(date).replaceAll('/', '-') + ' JST';

export const buildMaintenanceMessage = (
  event: MaintenanceEvent,
  phase: NotificationPhase,
): { subject: string; body: string } => {
  validatePhase(event.type, phase);
  const subject = phase === 'INITIAL'
    ? '予定maintenanceのお知らせ'
    : phase === 'REMINDER'
      ? 'maintenance開始1時間前の再通知'
      : '緊急maintenanceのお知らせ';
  return {
    subject,
    body: [
      `種別: ${event.type === 'PLANNED' ? '予定maintenance' : '緊急maintenance'}`,
      `開始日時: ${jst(event.startsAt)}`,
      `復旧予定日時: ${jst(event.expectedRecoveryAt)}`,
      `影響: ${event.impact}`,
      `問い合わせ先: ${event.contact}`,
    ].join('\n'),
  };
};

export type DeliverySummary = { target: number; sent: number; failed: number; skipped: number };

export const sendMaintenanceNotification = async (
  repository: MaintenanceRepository,
  transport: MaintenanceEmailTransport,
  eventId: string,
  phase: NotificationPhase,
): Promise<DeliverySummary> => {
  const event = await repository.findEvent(eventId);
  if (event === null) throw new Error('Maintenance event was not found.');
  validatePhase(event.type, phase);
  const content = buildMaintenanceMessage(event, phase);
  const recipients = await repository.listActiveRecipients();
  const summary: DeliverySummary = { target: recipients.length, sent: 0, failed: 0, skipped: 0 };
  for (const recipient of recipients) {
    if (!await repository.claimDelivery(event.id, phase, recipient.id)) {
      summary.skipped += 1;
      continue;
    }
    try {
      const result = await transport.send({ to: recipient.email, ...content });
      await repository.markSent(event.id, phase, recipient.id, result.messageId);
      summary.sent += 1;
    } catch {
      await repository.markFailed(event.id, phase, recipient.id, 'SES_SEND_FAILED');
      summary.failed += 1;
    }
  }
  return summary;
};

