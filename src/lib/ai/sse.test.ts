import { describe, it, expect } from "vitest";
import { readSseEvents, type SseEvent } from "./sse";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function collect(chunks: string[]): Promise<SseEvent[]> {
  const events: SseEvent[] = [];
  await readSseEvents(streamOf(chunks), (e) => events.push(e));
  return events;
}

describe("readSseEvents", () => {
  it("parses whole events", async () => {
    const events = await collect([
      'data: {"type":"progress","step":"outline"}\n\n',
      'data: {"type":"done","roadmapId":"r1"}\n\n',
    ]);
    expect(events).toEqual([
      { type: "progress", step: "outline" },
      { type: "done", roadmapId: "r1" },
    ]);
  });

  it("handles an event split across chunks", async () => {
    const events = await collect([
      'data: {"type":"progress","st',
      'ep":"graphify"}\n\n',
    ]);
    expect(events).toEqual([{ type: "progress", step: "graphify" }]);
  });

  it("handles multiple events in one chunk", async () => {
    const events = await collect([
      'data: {"type":"progress","step":"a"}\n\ndata: {"type":"progress","step":"b"}\n\n',
    ]);
    expect(events.map((e) => e.step)).toEqual(["a", "b"]);
  });

  it("flushes a final event without a trailing blank line", async () => {
    const events = await collect(['data: {"type":"done"}']);
    expect(events).toEqual([{ type: "done" }]);
  });

  it("ignores malformed lines and events without a type", async () => {
    const events = await collect([
      "data: {broken\n\n",
      'data: {"noType":true}\n\n',
      ": comment\n\n",
      'data: {"type":"ok"}\n\n',
    ]);
    expect(events).toEqual([{ type: "ok" }]);
  });
});
