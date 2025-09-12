import { DatasetLoader } from '../../../src/lib/dataset';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const ids = loader.listIds();
    res.status(200).json({ ids, count: ids.length });
  } catch (e) {
    res.status(500).json({ error: `获取患者ID列表时出错: ${e.message}` });
  }
}

