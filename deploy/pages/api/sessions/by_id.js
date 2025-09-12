import { DatasetLoader } from '../../../src/lib/dataset';
import { createSession } from '../../../src/lib/sessionStore';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { patient_id } = req.body || {};
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
    console.log('[API] create session by_id', patient_id);
    const record = loader.getById(patient_id);
    const [portrait, report, previous, seeker_prompt, chain] = loader.tryMapToComponents(record);
    const session = createSession({ portrait, report, previous_conversations: previous, seeker_prompt, chain });
    console.log('[API] session created', session.id);
    return res.status(200).json({
      session_id: session.id,
      created_at: session.createdAt.toISOString(),
      profile: session.portrait,
      status: session.status
    });
  } catch (e) {
    if (/not found/i.test(e.message)) return res.status(404).json({ error: `未找到患者ID: ${req.body?.patient_id}` });
    return res.status(500).json({ error: `创建会话时出错: ${e.message}` });
  }
}
