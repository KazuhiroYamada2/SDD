import { describe, expect, it, vi } from 'vitest';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { createSesMaintenanceTransport } from './ses-maintenance-transport.js';

describe('SES maintenance transport', () => {
  it('creates a UTF-8 plain text SES request and returns the provider message ID', async () => {
    const send = vi.fn().mockResolvedValue({ MessageId: 'message-id' });
    const transport = createSesMaintenanceTransport({ send } as never, 'sender@example.test');
    await expect(transport.send({ to: 'recipient@example.test', subject: 'subject', body: 'body' }))
      .resolves.toEqual({ messageId: 'message-id' });
    const command = send.mock.calls[0]![0] as SendEmailCommand;
    expect(command.input).toMatchObject({
      FromEmailAddress: 'sender@example.test', Destination: { ToAddresses: ['recipient@example.test'] },
      Content: { Simple: { Subject: { Data: 'subject', Charset: 'UTF-8' }, Body: { Text: { Data: 'body', Charset: 'UTF-8' } } } },
    });
  });
});

