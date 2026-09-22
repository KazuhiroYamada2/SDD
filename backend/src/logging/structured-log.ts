export type StructuredLogRecord = Readonly<Record<string, unknown>>;
export type StructuredLogWriter = (record: StructuredLogRecord) => void;

const writeJsonLine = (stream: NodeJS.WriteStream): StructuredLogWriter => (record) => {
  stream.write(`${JSON.stringify(record)}\n`);
};

export const stdoutStructuredLog = writeJsonLine(process.stdout);
export const stderrStructuredLog = writeJsonLine(process.stderr);
export const noOpStructuredLog: StructuredLogWriter = () => undefined;
