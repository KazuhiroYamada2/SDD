import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import type { MaintenanceEmailTransport } from './maintenance-service.js';

export const createSesMaintenanceTransport = (
  client: Pick<SESv2Client, 'send'>,
  fromEmail: string,
): MaintenanceEmailTransport => ({
  async send(message) {
    const response = await client.send(new SendEmailCommand({
      FromEmailAddress: fromEmail,
      Destination: { ToAddresses: [message.to] },
      Content: { Simple: {
        Subject: { Data: message.subject, Charset: 'UTF-8' },
        Body: { Text: { Data: message.body, Charset: 'UTF-8' } },
      } },
    }));
    return { messageId: response.MessageId ?? null };
  },
});

