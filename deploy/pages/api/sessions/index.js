import { DatasetLoader } from '../../../src/lib/dataset';
import { createSession, listSessions } from '../../../src/lib/sessionStore';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return res.status(200).json({ sessions: listSessions(), total: listSessions().length });
    } catch (e) {
      return res.status(500).json({ error: `获取会话列表时出错: ${e.message}` });
    }
  }
  if (req.method === 'POST') {
    try {
      const { profile, report, previous_conversations, seeker_prompt, chain } = req.body || {};
      const portrait = {
        age: profile?.age,
        gender: profile?.gender,
        occupation: profile?.occupation,
        martial_status: profile?.martial_status,
        symptoms: profile?.symptoms,
      };
      const session = createSession({
        portrait,
        report: report || { title: '自定义咨询案例' },
        previous_conversations: previous_conversations || [],
        seeker_prompt: seeker_prompt || '',
        chain: chain || []
      });
      return res.status(200).json({
        session_id: session.id,
        created_at: session.createdAt.toISOString(),
        profile: session.portrait,
        status: session.status
      });
    } catch (e) {
      return res.status(500).json({ error: `创建会话时出错: ${e.message}` });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
