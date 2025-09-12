import { DatasetLoader } from '../../../src/lib/dataset';
import { getStaticById } from '../../../src/lib/staticPatients';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

function sampleDetail(id) {
  const d = getStaticById(id);
  if (!d) return null;
  return {
    id,
    profile: d.portrait,
    report: d.report,
    conversation_preview: [],
    seeker_prompt: '',
    chain: (d.chain || []).map((c) => ({ stage: c.stage, content: c.content })),
    total_messages: 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  try {
    try {
      await loader.ensureReady();
      const record = loader.getById(id);
      const [portrait, report, conversation, seeker_prompt, chain] = loader.tryMapToComponents(record);
      const conversation_preview = Array.isArray(conversation) ? conversation.slice(0, 6) : [];
      const formatted_chain = [];
      if (Array.isArray(chain)) {
        chain.forEach((item, i) => {
          if (item && typeof item === 'object') {
            formatted_chain.push({ stage: item.stage ?? i + 1, content: item.content ?? String(item) });
          } else {
            formatted_chain.push({ stage: i + 1, content: String(item) });
          }
        });
      }
      return res.status(200).json({
        id,
        profile: portrait,
        report,
        conversation_preview,
        seeker_prompt,
        chain: formatted_chain,
        total_messages: Array.isArray(conversation) ? conversation.length : 0
      });
    } catch (e) {
      const fb = sampleDetail(id);
      if (fb) return res.status(200).json(fb);
      if (/not found/i.test(String(e.message))) return res.status(404).json({ error: `病人ID ${id} 不存在` });
      throw e;
    }
  } catch (e) {
    if (/not found/i.test(e.message)) return res.status(404).json({ error: `病人ID ${id} 不存在` });
    res.status(500).json({ error: `获取病人详情时出错: ${e.message}` });
  }
}
