import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const templatePath = resolve(process.cwd(), '../infra/monitoring.yaml');
const source = readFileSync(templatePath, 'utf8');
const template = parse(source, {
  customTags: [
    { tag: '!Ref', resolve: (value: string) => value },
    { tag: '!Sub', resolve: (value: string) => value },
  ],
}) as {
  Parameters: Record<string, { Default?: unknown }>;
  Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  Outputs: Record<string, { Value: unknown }>;
};

const requiredParameters = [
  'EnvironmentName',
  'EcsClusterName',
  'EcsServiceName',
  'LoadBalancerFullName',
  'TargetGroupFullName',
  'RdsDbInstanceIdentifier',
  'NotificationEmail',
  'FrontendHealthUrl',
  'BackendBaseUrl',
  'AvailabilityCanaryName',
];

describe('infra/monitoring.yaml', () => {
  it('is parseable and declares the required environment parameters without secret parameters', () => {
    expect(Object.keys(template.Parameters)).toEqual(expect.arrayContaining(requiredParameters));
    for (const name of requiredParameters) {
      expect(template.Parameters[name]?.Default).toBeUndefined();
    }
    expect(source).not.toMatch(/JWT_SECRET|CUSTOMER_ENCRYPTION_KEYS_JSON|DATABASE_URL|enc:v1:/);
  });

  it('wires every CloudWatch alarm to the monitoring SNS topic', () => {
    const alarms = Object.values(template.Resources)
      .filter((resource) => resource.Type === 'AWS::CloudWatch::Alarm');

    expect(alarms).toHaveLength(12);
    for (const alarm of alarms) {
      expect(alarm.Properties.AlarmActions).toEqual(['MonitoringTopic']);
      expect(alarm.Properties.OKActions).toEqual(['MonitoringTopic']);
      expect(alarm.Properties).not.toHaveProperty('InsufficientDataActions');
    }
    expect(template.Resources.MonitoringTopic?.Type).toBe('AWS::SNS::Topic');
    expect(template.Resources.MonitoringEmailSubscription?.Properties).toMatchObject({
      Protocol: 'email',
      Endpoint: 'NotificationEmail',
      TopicArn: 'MonitoringTopic',
    });
  });

  it('subscribes availability, failure, and backup RDS instance events to SNS', () => {
    expect(template.Resources.RdsOperationalEventSubscription).toMatchObject({
      Type: 'AWS::RDS::EventSubscription',
      Properties: {
        Enabled: true,
        EventCategories: ['availability', 'failure', 'backup'],
        SnsTopicArn: 'MonitoringTopic',
        SourceIds: ['RdsDbInstanceIdentifier'],
        SourceType: 'db-instance',
      },
    });
  });

  it('defines the ALB readiness contract', () => {
    expect(template.Parameters.AlbHealthCheckPath?.Default).toBe('/health/ready');
    expect(template.Outputs.RequiredAlbHealthCheckSuccessCode?.Value).toBe('200');
  });

  it('defines a weekday JST business-hours Synthetics canary without credentials', () => {
    expect(template.Resources.AvailabilityCanaryRole?.Type).toBe('AWS::IAM::Role');
    expect(template.Resources.AvailabilityArtifactBucket?.Type).toBe('AWS::S3::Bucket');
    expect(template.Resources.BusinessHoursAvailabilityCanary).toMatchObject({
      Type: 'AWS::Synthetics::Canary',
      Properties: {
        Name: 'AvailabilityCanaryName',
        StartCanaryAfterCreation: true,
        Schedule: { Expression: 'cron(0/5 0-8 ? * MON-FRI *)', DurationInSeconds: 0 },
        RunConfig: { EnvironmentVariables: { FRONTEND_HEALTH_URL: 'FrontendHealthUrl', BACKEND_BASE_URL: 'BackendBaseUrl' } },
      },
    });
    expect(source).toContain("new URL('/health/ready'");
    expect(source).toContain("body.status !== 'ready'");
    expect(source).not.toMatch(/AWS_ACCESS_KEY|AWS_SECRET_ACCESS_KEY|Authorization:/);
  });
});
