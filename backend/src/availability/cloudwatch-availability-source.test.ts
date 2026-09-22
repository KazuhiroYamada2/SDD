import { GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { describe, expect, it, vi } from 'vitest';
import { getCanaryAvailabilityDatapoints } from './cloudwatch-availability-source.js';

describe('CloudWatch availability source', () => {
  it('requests five-minute Synthetics SuccessPercent data and maps values', async () => {
    const timestamps = [new Date('2026-09-01T00:00:00Z'), new Date('2026-09-01T00:05:00Z')];
    const send = vi.fn().mockResolvedValue({ MetricDataResults: [{ Id: 'availability', Timestamps: timestamps, Values: [100, 0] }] });
    await expect(getCanaryAvailabilityDatapoints({ send } as never, 'canary-name', timestamps[0]!, new Date('2026-09-01T00:10:00Z'))).resolves.toEqual([
      { timestamp: timestamps[0], successful: true }, { timestamp: timestamps[1], successful: false },
    ]);
    const command = send.mock.calls[0]![0] as GetMetricDataCommand;
    expect(command.input.MetricDataQueries?.[0]?.MetricStat).toMatchObject({
      Period: 300, Stat: 'Average', Metric: { Namespace: 'CloudWatchSynthetics', MetricName: 'SuccessPercent' },
    });
  });
});
