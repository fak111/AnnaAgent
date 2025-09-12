const { v4: uuidv4 } = require('uuid');

// Persist across Next.js dev HMR by pinning on globalThis
const g = globalThis;
if (!g.__ANNA_SESSIONS__) {
  g.__ANNA_SESSIONS__ = new Map();
}
const sessions = g.__ANNA_SESSIONS__;

function createSession({ portrait, report, previous_conversations, seeker_prompt, chain }) {
  const id = uuidv4();
  const createdAt = new Date();
  const state = {
    id,
    createdAt,
    status: 'active',
    messageCount: 0,
    portrait: portrait || {},
    report: report || {},
    previous_conversations: Array.isArray(previous_conversations) ? previous_conversations.slice() : [],
    seeker_prompt: seeker_prompt || '',
    chain: Array.isArray(chain) ? chain.slice() : [],
    chain_index: 0,
    conversation: [], // {role: 'Counselor'|'Seeker', content}
    messages: [] // {role: 'user'|'assistant', content}
  };
  sessions.set(id, state);
  return state;
}

function getSession(id) {
  return sessions.get(id);
}

function listSessions() {
  return Array.from(sessions.values()).map(s => ({
    session_id: s.id,
    created_at: s.createdAt.toISOString(),
    message_count: s.messageCount,
    status: s.status,
    profile: s.portrait
  }));
}

function endSession(id) {
  const s = sessions.get(id);
  if (!s) return false;
  s.status = 'ended';
  s.endedAt = new Date();
  return true;
}

module.exports = { sessions, createSession, getSession, listSessions, endSession };
