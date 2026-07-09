/**
 * Client-side reader for the data-only SSE protocol used by the AI routes
 * (`data: <JSON>\n\n` per event). Buffers chunks so events split across network
 * chunks parse correctly; silently skips malformed lines (a torn final chunk on
 * abort must not throw). Client-safe: no SDK imports.
 */

export type SseEvent = Record<string, unknown> & { type: string };

export async function readSseEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        emit(raw, onEvent);
      }
    }
    // Flush a final event that arrived without a trailing blank line.
    if (buffer.trim()) emit(buffer, onEvent);
  } finally {
    reader.releaseLock();
  }
}

function emit(raw: string, onEvent: (event: SseEvent) => void): void {
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const parsed: unknown = JSON.parse(line.slice("data: ".length));
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { type?: unknown }).type === "string"
      ) {
        onEvent(parsed as SseEvent);
      }
    } catch {
      // torn/malformed line — ignore
    }
  }
}
