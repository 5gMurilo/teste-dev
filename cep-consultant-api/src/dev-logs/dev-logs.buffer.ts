import { Writable } from "node:stream";

export const DEV_LOGS_BUFFER = Symbol("DEV_LOGS_BUFFER");

export const DEFAULT_DEV_LOGS_BUFFER_SIZE = 500;

export type DevLogRecord = Record<string, unknown> & { seq: number };

export interface DevLogsPage {
  records: DevLogRecord[];
  nextSeq: number;
  dropped?: boolean;
}

export class DevLogsBuffer {
  private readonly capacity: number;
  private readonly records: DevLogRecord[] = [];
  private partialLine = "";
  private seq = 0;

  constructor(capacity: number = DEFAULT_DEV_LOGS_BUFFER_SIZE) {
    this.capacity = capacity > 0 ? Math.floor(capacity) : 1;
  }

  write(chunk: string): void {
    const lines = (this.partialLine + chunk).split("\n");
    this.partialLine = lines.pop() ?? "";

    for (const line of lines) {
      this.push(line);
    }
  }

  query(since = 0): DevLogsPage {
    const records = this.records.filter((record) => record.seq > since);
    const oldestRetained = this.records[0]?.seq;
    const dropped = oldestRetained !== undefined && oldestRetained > since + 1;

    return {
      records,
      nextSeq: records.at(-1)?.seq ?? Math.max(since, this.seq),
      ...(dropped ? { dropped: true } : {}),
    };
  }

  asWritable(): Writable {
    return new Writable({
      write: (chunk, _encoding, callback) => {
        this.write(String(chunk));
        callback();
      },
    });
  }

  private push(line: string): void {
    if (line.trim() === "") {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }

    if (typeof parsed !== "object" || parsed === null) {
      return;
    }

    this.seq += 1;
    this.records.push({
      ...(parsed as Record<string, unknown>),
      seq: this.seq,
    });

    if (this.records.length > this.capacity) {
      this.records.splice(0, this.records.length - this.capacity);
    }
  }
}

let sharedBuffer: DevLogsBuffer | undefined;

export function getDevLogsBuffer(): DevLogsBuffer {
  if (!sharedBuffer) {
    sharedBuffer = new DevLogsBuffer(
      Number(
        process.env.DEV_LOGS_BUFFER_SIZE ?? DEFAULT_DEV_LOGS_BUFFER_SIZE,
      ) || DEFAULT_DEV_LOGS_BUFFER_SIZE,
    );
  }

  return sharedBuffer;
}
