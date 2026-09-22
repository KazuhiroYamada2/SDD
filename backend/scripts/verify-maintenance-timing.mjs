import { database, closeDatabase } from '../src/db.ts';
import { createMaintenanceTimingRepository } from '../src/maintenance/maintenance-timing-repository.ts';
import { evaluateMaintenanceEventTiming } from '../src/maintenance/maintenance-timing.ts';

const args = process.argv.slice(2);
const eventIndex = args.indexOf('--event-id');
const eventId = eventIndex >= 0 ? args[eventIndex + 1] : undefined;

async function main() {
  if (database === undefined || eventId === undefined) throw new Error('Maintenance timing configuration is invalid.');
  const repository = createMaintenanceTimingRepository(database);
  const event = await repository.findEvent(eventId);
  if (event === null) throw new Error('Maintenance event was not found.');
  const phases = evaluateMaintenanceEventTiming(event, await repository.listDeliveries(event.id));
  const result = phases.length > 0 && phases.every((phase) => phase.result === 'PASS') ? 'PASS' : 'FAIL';
  console.log(JSON.stringify({ eventId: event.id, eventType: event.type, verifiedAt: new Date().toISOString(), phases, result }));
  if (result === 'FAIL') process.exitCode = 2;
}

main().catch(() => {
  console.error('Maintenance timing verification failed.');
  process.exitCode = 1;
}).finally(closeDatabase);
