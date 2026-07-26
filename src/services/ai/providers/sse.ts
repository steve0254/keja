// Minimal Server-Sent-Events line parser shared by every provider adapter.
// Providers stream `data: {...}` lines (with occasional `event:` / blank
// keep-alive lines mixed in); we only care about the `data:` payloads, which
// each carry their own `.type`/shape that the caller inspects.

/** Yields each `data:` payload string from an SSE response body, in order. */
export async function* iterateSseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer.
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        yield payload;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
