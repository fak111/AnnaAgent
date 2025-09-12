const axios = require('axios');
let Agent;
try { ({ Agent } = require('undici')); } catch {}

function getConfig() {
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const timeout = parseInt(process.env.DEEPSEEK_TIMEOUT_MS || '30000', 10);
  const fake = process.env.DEEPSEEK_FAKE === '1' || process.env.NODE_ENV === 'test' || !apiKey;
  return { baseURL, apiKey, model, timeout };
}

// Non-streaming chat completion (returns full text)
async function chatCompletion({ messages, temperature, max_tokens }) {
  const { baseURL, apiKey, model, timeout } = getConfig();
  const temp = typeof temperature === 'number' ? temperature : parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7');
  const maxTok = typeof max_tokens === 'number' ? max_tokens : parseInt(process.env.DEEPSEEK_MAX_TOKENS || '512', 10);
  if (!apiKey) {
    // Fake mode for local/test without network
    const content = '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
    return { content, raw: { choices: [{ message: { content } }] } };
  }
  const client = axios.create({ baseURL, timeout, headers: { Authorization: `Bearer ${apiKey}` } });
  const url = '/chat/completions';
  const body = { model, messages, temperature: temp, max_tokens: maxTok, stream: false };
  let delay = 300;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await client.post(url, body, { timeout });
      const choice = res?.data?.choices?.[0];
      const content = choice?.message?.content || '';
      return { content, raw: res.data };
    } catch (err) {
      if (i === 2) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// Streaming via fetch; yields chunks of text deltas; assumes OpenAI-compatible SSE
async function streamChatCompletion({ messages, temperature, max_tokens, onEvent }) {
  const { baseURL, apiKey, model } = getConfig();
  const temp = typeof temperature === 'number' ? temperature : parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7');
  const maxTok = typeof max_tokens === 'number' ? max_tokens : parseInt(process.env.DEEPSEEK_MAX_TOKENS || '512', 10);
  if (!apiKey) {
    // Simulate streaming locally
    const faux = '最近工作确实很忙，压力挺大的...有时候晚上都睡不好觉。';
    for (const ch of faux) {
      onEvent && onEvent({ type: 'delta', data: ch });
      // no delay to keep tests fast
    }
    onEvent && onEvent({ type: 'done' });
    return faux;
  }
  const url = `${baseURL}/chat/completions`;
  const connectTimeout = parseInt(process.env.DEEPSEEK_CONNECT_TIMEOUT_MS || '30000', 10);
  const opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature: temp, max_tokens: maxTok, stream: true })
  };
  if (Agent) {
    opts.dispatcher = new Agent({ connect: { timeout: connectTimeout } });
  }
  const resp = await fetch(url, opts);
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    throw new Error(`DeepSeek stream error: ${resp.status} ${text}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      for (const line of part.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          onEvent && onEvent({ type: 'done' });
          return accumulated;
        }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content || '';
          if (delta) {
            accumulated += delta;
            onEvent && onEvent({ type: 'delta', data: delta });
          }
        } catch (_) {
          // ignore parse errors
        }
      }
    }
  }
  onEvent && onEvent({ type: 'done' });
  return accumulated;
}

module.exports = { chatCompletion, streamChatCompletion };
