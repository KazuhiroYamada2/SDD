import { GetMetricDataCommand, type CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import type { AvailabilityDatapoint } from './availability-calculator.js';

type CloudWatchSender = Pick<CloudWatchClient, 'send'>;

export async function getCanaryAvailabilityDatapoints(
  client: CloudWatchSender,
  canaryName: string,
  start: Date,
  end: Date,
): Promise<AvailabilityDatapoint[]> {
  if (canaryName.trim() === '') throw new Error('Availability canary name is required.');
  const response = await client.send(new GetMetricDataCommand({
    StartTime: start,
    EndTime: end,
    ScanBy: 'TimestampAscending',
    MetricDataQueries: [{
      Id: 'availability',
      ReturnData: true,
      MetricStat: {
        Period: 300,
        Stat: 'Average',
        Metric: {
          Namespace: 'CloudWatchSynthetics',
          MetricName: 'SuccessPercent',
          Dimensions: [{ Name: 'CanaryName', Value: canaryName }],
        },
      },
    }],
  }));
  const result = response.MetricDataResults?.find((item) => item.Id === 'availability');
  const timestamps = result?.Timestamps ?? [];
  const values = result?.Values ?? [];
  return timestamps.flatMap((timestamp, index) => {
    const value = values[index];
    return value === undefined ? [] : [{ timestamp, successful: value === 100 }];
  });
}
