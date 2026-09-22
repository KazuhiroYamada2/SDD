import { SESv2Client } from '@aws-sdk/client-sesv2';
import { database, closeDatabase } from '../src/db.ts';
import { config } from '../src/config.ts';
import { createMaintenanceRepository } from '../src/maintenance/maintenance-repository.ts';
import { createMaintenanceEvent, sendMaintenanceNotification } from '../src/maintenance/maintenance-service.ts';
import { createSesMaintenanceTransport } from '../src/maintenance/ses-maintenance-transport.ts';

const args = process.argv.slice(2);
const command = args.shift();
const options = new Map();
for (let index = 0; index < args.length; index += 2) {
  const key = args[index];
  const value = args[index + 1];
  if (!key?.startsWith('--') || value === undefined) throw new Error('Maintenance CLI arguments are invalid.');
  options.set(key.slice(2), value);
}
const required = (name) => {
  const value = options.get(name);
  if (value === undefined || value.trim() === '') throw new Error('Maintenance CLI arguments are invalid.');
  return value;
};

async function main() {
  if (database === undefined) throw new Error('Maintenance notification database is unavailable.');
  const repository = createMaintenanceRepository(database);
  if (command === 'create') {
    const typeValue = required('type').toUpperCase();
    if (!['PLANNED', 'EMERGENCY'].includes(typeValue)) throw new Error('Maintenance CLI arguments are invalid.');
    const event = await createMaintenanceEvent(repository, {
      type: typeValue,
      startsAt: required('starts-at'), expectedRecoveryAt: required('expected-recovery-at'),
      impact: required('impact'), contact: required('contact'),
    });
    console.log(JSON.stringify({ eventId: event.id, type: event.type }));
    return;
  }
  if (command === 'send') {
    const phase = required('phase').toUpperCase();
    if (!['INITIAL', 'REMINDER', 'EMERGENCY'].includes(phase)) throw new Error('Maintenance CLI arguments are invalid.');
    if (config.awsRegion === undefined || config.maintenanceFromEmail === undefined) {
      throw new Error('Maintenance notification configuration is invalid.');
    }
    const transport = createSesMaintenanceTransport(new SESv2Client({ region: config.awsRegion }), config.maintenanceFromEmail);
    const summary = await sendMaintenanceNotification(repository, transport, required('event-id'), phase);
    console.log(JSON.stringify(summary));
    if (summary.failed > 0) process.exitCode = 1;
    return;
  }
  throw new Error('Usage: maintenance create|send [options]');
}

main().catch(() => {
  console.error('Maintenance notification operation failed.');
  process.exitCode = 1;
}).finally(closeDatabase);

