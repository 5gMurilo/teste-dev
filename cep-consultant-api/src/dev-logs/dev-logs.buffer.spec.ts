import { describe, expect, it } from "vitest";
import { DevLogsBuffer } from "./dev-logs.buffer.js";

function writeRecords(buffer: DevLogsBuffer, count: number, offset = 0): void {
  for (let i = 0; i < count; i += 1) {
    buffer.write(`${JSON.stringify({ msg: `log-${offset + i}` })}\n`);
  }
}

describe("DevLogsBuffer", () => {
  it("assigns monotonic seq starting at 1", () => {
    const buffer = new DevLogsBuffer(10);
    writeRecords(buffer, 3);

    const page = buffer.query(0);

    expect(page.records.map((record) => record.seq)).toEqual([1, 2, 3]);
    expect(page.nextSeq).toBe(3);
    expect(page.dropped).toBeUndefined();
  });

  it("returns only records newer than since", () => {
    const buffer = new DevLogsBuffer(10);
    writeRecords(buffer, 3);

    const page = buffer.query(2);

    expect(page.records).toHaveLength(1);
    expect(page.records[0]).toMatchObject({ msg: "log-2", seq: 3 });
    expect(page.nextSeq).toBe(3);
  });

  it("returns an empty page and an unchanged nextSeq when polled twice", () => {
    const buffer = new DevLogsBuffer(10);
    writeRecords(buffer, 2);

    const first = buffer.query(0);
    const second = buffer.query(first.nextSeq);

    expect(second.records).toHaveLength(0);
    expect(second.nextSeq).toBe(first.nextSeq);
  });

  it("evicts the oldest records past capacity", () => {
    const buffer = new DevLogsBuffer(3);
    writeRecords(buffer, 5);

    const page = buffer.query(0);

    expect(page.records.map((record) => record.seq)).toEqual([3, 4, 5]);
  });

  it("flags dropped when since predates the oldest retained record", () => {
    const buffer = new DevLogsBuffer(3);
    writeRecords(buffer, 5);

    expect(buffer.query(0).dropped).toBe(true);
    expect(buffer.query(2).dropped).toBeUndefined();
  });

  it("reassembles records split across chunk boundaries", () => {
    const buffer = new DevLogsBuffer(10);

    buffer.write('{"msg":"sp');
    buffer.write('lit"}\n');

    expect(buffer.query(0).records[0]).toMatchObject({ msg: "split", seq: 1 });
  });

  it("ignores blank and non-JSON lines", () => {
    const buffer = new DevLogsBuffer(10);

    buffer.write("\nnot json\n   \n");

    expect(buffer.query(0).records).toHaveLength(0);
  });

  it("accepts writes through the pino-facing Writable stream", () => {
    const buffer = new DevLogsBuffer(10);
    const stream = buffer.asWritable();

    stream.write(`${JSON.stringify({ msg: "via-stream" })}\n`);

    expect(buffer.query(0).records[0]).toMatchObject({ msg: "via-stream" });
  });
});
