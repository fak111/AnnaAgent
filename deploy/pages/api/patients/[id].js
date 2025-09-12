import { DatasetLoader } from '../../../src/lib/dataset';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  try {
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
    res.status(200).json({
      id,
      profile: portrait,
      report,
      conversation_preview,
      seeker_prompt,
      chain: formatted_chain,
      total_messages: Array.isArray(conversation) ? conversation.length : 0
    });
  } catch (e) {
    if (/not found/i.test(e.message)) return res.status(404).json({ error: `病人ID ${id} 不存在` });
    res.status(500).json({ error: `获取病人详情时出错: ${e.message}` });
  }
}

