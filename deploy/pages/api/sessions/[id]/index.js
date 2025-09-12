import { getSession, endSession } from '../../../../src/lib/sessionStore';

export default function handler(req, res) {
  const { id } = req.query;
  const s = getSession(id);
  if (!s) return res.status(404).json({ error: `会话 ${id} 不存在` });
  if (req.method === 'GET') {
    return res.status(200).json({
      session_id: s.id,
      metadata: {
        created_at: s.createdAt.toISOString(),
        message_count: s.messageCount,
        status: s.status,
        profile: s.portrait
      },
      conversation: s.conversation,
      complaint_stage: s.chain_index,
      status_summary: s.status
    });
  }
  if (req.method === 'DELETE') {
    endSession(id);
    return res.status(200).json({ message: `会话 ${id} 已结束`, session_id: id });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

