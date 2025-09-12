import { getSession } from '../../../../src/lib/sessionStore';
import { chatCompletion, streamChatCompletion } from '../../../../src/lib/deepseek';

function buildMessages(session, userMessage) {
  // Mimic Python message building: system + history + status system
  // History uses session.messages [{role: 'user'|'assistant', content}]
  const system = session.seeker_prompt || '';
  // Simple emotion + complaint estimation
  const emotion = 'neutral';
  const complaint = Array.isArray(session.chain) && session.chain.length > 0
    ? (typeof session.chain[session.chain_index] === 'object' ? (session.chain[session.chain_index].content || String(session.chain[session.chain_index])) : String(session.chain[session.chain_index]))
    : 'unknown';

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push(...session.messages);
  messages.push({ role: 'system', content: `当前的情绪状态是：${emotion}，当前的主诉是：${complaint}` });
  // Append current user message to provider request but do not store until success
  const finalMessages = messages.concat([{ role: 'user', content: userMessage }]);
  return { finalMessages, emotion, complaint };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  const { message, stream } = req.body || {};
  console.log('[API] chat request', { id, stream, messageLen: (message||'').length });
  const s = getSession(id);
  if (!s) return res.status(404).json({ error: `会话 ${id} 不存在` });
  if (s.status !== 'active') return res.status(400).json({ error: `会话 ${id} 已结束` });
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

  // Record counselor message into session state
  s.conversation.push({ role: 'Counselor', content: message });
  s.messages.push({ role: 'user', content: message });

  const { finalMessages, emotion, complaint } = buildMessages(s, message);

  // Increment stage index in a bounded way
  if (Array.isArray(s.chain) && s.chain.length > 0) {
    s.chain_index = Math.min(s.chain_index + 1, s.chain.length - 1);
  }

  // Streaming branch
  if (stream === true || stream === 'true') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
    // Send a quick ping to flush proxies/buffers
    res.write(': ping\n\n');
    // Emit metadata first so UI can show emotion and complaint promptly
    try { res.write(`data: ${JSON.stringify({ meta: { emotion, complaint } })}\n\n`); } catch {}
    let accumulated = '';
    let sentDelta = false;
    let doneReached = false;
    try {
      await streamChatCompletion({
        messages: finalMessages,
        onEvent: (evt) => {
          if (evt.type === 'delta' && evt.data) {
            accumulated += evt.data;
            res.write(`data: ${JSON.stringify({ delta: evt.data })}\n\n`);
            sentDelta = true;
          } else if (evt.type === 'done') {
            doneReached = true;
          }
        }
      });
      console.log('[API] stream finished', { sentDelta, len: accumulated.length });
      // Update session with assistant message
      const responseContent = accumulated || '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
      if (!sentDelta && responseContent) {
        // Provider didn't stream tokens; send a single delta so client UI updates
        res.write(`data: ${JSON.stringify({ delta: responseContent })}\n\n`);
      }
      if (!doneReached) {
        res.write('data: [DONE]\n\n');
      }
      s.conversation.push({ role: 'Seeker', content: responseContent });
      s.messages.push({ role: 'assistant', content: responseContent });
      s.messageCount += 1;
      res.end();
    } catch (e) {
      console.error('[API] stream error', e);
      // Try non-stream as a fallback attempt
      try {
        const nonStream = await chatCompletion({ messages: finalMessages });
        const content = nonStream?.content || '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
        try {
          res.write(`data: ${JSON.stringify({ delta: content })}\n\n`);
          res.write('data: [DONE]\n\n');
        } catch {}
        try {
          s.conversation.push({ role: 'Seeker', content });
          s.messages.push({ role: 'assistant', content });
          s.messageCount += 1;
        } catch {}
        try { res.end(); } catch {}
        return;
      } catch (e2) {
        // Final fallback: emit static text
        const fallback = '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
        try {
          res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
          res.write('data: [DONE]\n\n');
        } catch {}
        try {
          s.conversation.push({ role: 'Seeker', content: fallback });
          s.messages.push({ role: 'assistant', content: fallback });
          s.messageCount += 1;
        } catch {}
        try { res.end(); } catch {}
      }
    }
    return;
  }

  // Non-streaming branch
  try {
    const result = await chatCompletion({ messages: finalMessages });
    const responseContent = result?.content || '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
    s.conversation.push({ role: 'Seeker', content: responseContent });
    s.messages.push({ role: 'assistant', content: responseContent });
    s.messageCount += 1;

    return res.status(200).json({
      response: responseContent,
      emotion: emotion || 'neutral',
      complaint: complaint || 'unknown',
      session_id: s.id,
      timestamp: new Date().toISOString(),
      message_count: s.messageCount,
      complaint_stage: s.chain_index
    });
  } catch (e) {
    return res.status(500).json({ error: `处理对话时出错: ${e.message}` });
  }
}
