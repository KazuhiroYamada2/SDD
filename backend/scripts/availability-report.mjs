import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { calculateAvailability, getAvailabilityRange } from '../src/availability/availability-calculator.ts';
import { getCanaryAvailabilityDatapoints } from '../src/availability/cloudwatch-availability-source.ts';

const args = process.argv.slice(2);
const readOption = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

async function main() {
  const month = readOption('month');
  const canaryName = readOption('canary-name') ?? process.env.AVAILABILITY_CANARY_NAME;
  const region = process.env.AWS_REGION;
  if (month === undefined || canaryName === undefined || region === undefined) {
    throw new Error('Availability report configuration is invalid.');
  }
  const now = new Date();
  const range = getAvailabilityRange(month, now);
  const datapoints = await getCanaryAvailabilityDatapoints(new CloudWatchClient({ region }), canaryName, range.start, range.end);
  const report = calculateAvailability(month, datapoints, now);
  console.log(JSON.stringify({ ...report, availabilityPercent: Number(report.availabilityPercent.toFixed(3)) }));
  if (report.result === 'FAIL') process.exitCode = 2;
}

main().catch(() => {
  console.error('Availability report operation failed.');
  process.exitCode = 1;
});
