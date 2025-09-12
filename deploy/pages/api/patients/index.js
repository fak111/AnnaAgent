import { DatasetLoader } from '../../../src/lib/dataset';

const loader = new DatasetLoader(process.env.MERGED_DATA_PATH);

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const page = parseInt(req.query.page || '1', 10);
    const page_size = parseInt(req.query.page_size || '10', 10);
    const random_order = String(req.query.random_order || 'false') === 'true';
    let ids = loader.listIds();
    const total = ids.length;
    if (random_order) {
      ids = ids.sort(() => Math.random() - 0.5);
    }
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageIds = ids.slice(start, end);
    const patients = [];
    for (const pid of pageIds) {
      try {
        const record = loader.getById(pid);
        const [portrait, report, conversation] = loader.tryMapToComponents(record);
        const symptomsStr = portrait.symptoms || '';
        const symptoms = symptomsStr ? symptomsStr.split(';').map(s => s.trim()).filter(Boolean) : [];
        const case_title = report['案例标题'] || '心理咨询案例';
        let difficulty = '初级';
        if (symptomsStr.includes('抑郁') || symptomsStr.includes('焦虑')) difficulty = '中级';
        if (/(精神|幻听|双相)/.test(symptomsStr)) difficulty = '高级';
        const case_categories = report['案例类别'] || [];
        const description = `${portrait.age}岁${portrait.gender}性，${portrait.occupation}，主要涉及${case_categories.slice(0,2).join(' ') || '心理健康'}问题`;
        patients.push({
          id: pid,
          name: `${portrait.gender}性求助者`,
          age: portrait.age,
          gender: portrait.gender,
          occupation: portrait.occupation,
          symptoms,
          case_title,
          difficulty,
          description
        });
      } catch (_) { /* skip bad record */ }
    }
    res.status(200).json({ patients, total, page, page_size });
  } catch (e) {
    res.status(500).json({ error: `获取病人列表时出错: ${e.message}` });
  }
}

