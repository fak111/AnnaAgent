export type SSEOptions = {
  url: string;
  payload: any;
  onDelta?: (delta: string) => void;
  onDone?: (full: string) => void;
  onMeta?: (meta: { emotion?: string; complaint?: string }) => void;
  onError?: (err: Error) => void;
  debug?: boolean;
};

export function useSSEChat() {
  let controller: AbortController | null = null;
  let isStreaming = false;

  const start = async ({ url, payload, onDelta, onDone, onMeta, onError, debug }: SSEOptions) => {
    try {
      controller = new AbortController();
      isStreaming = true;
      if (debug) console.log('[SSE] start', { url, payload });
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: controller.signal,
      });
      if (debug) console.log('[SSE] response', { ok: resp.ok, status: resp.status, ct: resp.headers.get('content-type') });
      if (!resp.body) {
        if (debug) console.log('[SSE] no resp.body, fallback to JSON');
        const data = await resp.json().catch(() => ({} as any));
        const full = data?.response || '';
        if (data && (data.emotion || data.complaint)) {
          onMeta && onMeta({ emotion: data.emotion, complaint: data.complaint });
        }
        if (full) onDone && onDone(full);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (debug) console.log('[SSE] reader done');
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        if (debug) console.log('[SSE] chunk', { len: value?.length, bufferLen: buffer.length });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          for (const line of part.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              if (json?.meta) {
                if (debug) console.log('[SSE] meta', json.meta);
                onMeta && onMeta(json.meta);
              }
              const delta = json?.delta || '';
              if (delta) {
                acc += delta;
                if (debug) console.log('[SSE] delta', delta);
                onDelta && onDelta(delta);
              }
            } catch {}
          }
        }
      }
      if (debug) console.log('[SSE] done total', acc);
      onDone && onDone(acc);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // canceled by user
      console.error('[SSE] error', e);
      onError && onError(e);
    } finally {
      isStreaming = false;
    }
  };

  const stop = () => {
    if (controller) controller.abort();
    isStreaming = false;
  };

  return { start, stop, get isStreaming() { return isStreaming; } };
}
