import { DatasetLoader } from '../../../src/lib/dataset';
import { listStaticIds } from '../../../src/lib/staticPatients';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

function sampleIds() { return listStaticIds(); }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    try {
      await loader.ensureReady();
      const ids = loader.listIds();
      return res.status(200).json({ ids, count: ids.length });
    } catch {
      const ids = sampleIds();
      return res.status(200).json({ ids, count: ids.length });
    }
  } catch (e) {
    res.status(500).json({ error: `获取患者ID列表时出错: ${e.message}` });
  }
}
