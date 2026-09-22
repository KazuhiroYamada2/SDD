export const rehearsalSourceDatabase = 'customer_management_e2e';
export const rehearsalDatabase = 'customer_management_rehearsal_t704';
export const rollbackDatabase = 'customer_management_rollback_t704';
export const failureDatabase = 'customer_management_failure_t704';

export type RehearsalStep =
  | 'precheck'
  | 'backup'
  | 'schemaMigration'
  | 'dataMigration'
  | 'forwardVerification'
  | 'applicationSmoke'
  | 'rollbackRestore'
  | 'rollbackVerification'
  | 'rerunVerification'
  | 'cleanup';

export type StepResult = 'PASS' | 'FAIL' | 'NOT_RUN';

export const assertRehearsalConnection = (
  nodeEnv: string | undefined,
  connectionString: string | undefined,
): URL => {
  if (nodeEnv !== 'e2e' || connectionString === undefined) {
    throw new Error('Migration rehearsal requires the dedicated local E2E database.');
  }
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('Migration rehearsal requires the dedicated local E2E database.');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' ||
      url.port !== '55432' || database !== rehearsalSourceDatabase || url.username !== rehearsalSourceDatabase) {
    throw new Error('Migration rehearsal requires the dedicated local E2E database.');
  }
  return url;
};

export const connectionForDatabase = (source: URL, database: string): string => {
  if (![rehearsalDatabase, rollbackDatabase, failureDatabase, 'postgres'].includes(database)) {
    throw new Error('Migration rehearsal database name is not allowed.');
  }
  const result = new URL(source);
  result.pathname = `/${database}`;
  return result.toString();
};

export const createStepResults = (): Record<RehearsalStep, StepResult> => ({
  precheck: 'NOT_RUN',
  backup: 'NOT_RUN',
  schemaMigration: 'NOT_RUN',
  dataMigration: 'NOT_RUN',
  forwardVerification: 'NOT_RUN',
  applicationSmoke: 'NOT_RUN',
  rollbackRestore: 'NOT_RUN',
  rollbackVerification: 'NOT_RUN',
  rerunVerification: 'NOT_RUN',
  cleanup: 'NOT_RUN',
});

export const runOrderedSteps = async <Step extends string>(
  order: readonly Step[],
  actions: Record<Step, () => Promise<void>>,
): Promise<Record<Step, StepResult>> => {
  const result = Object.fromEntries(order.map((step) => [step, 'NOT_RUN'])) as Record<Step, StepResult>;
  for (const step of order) {
    try {
      await actions[step]();
      result[step] = 'PASS';
    } catch (error) {
      result[step] = 'FAIL';
      throw Object.assign(error instanceof Error ? error : new Error('Migration rehearsal step failed.'), {
        stepResults: result,
      });
    }
  }
  return result;
};
