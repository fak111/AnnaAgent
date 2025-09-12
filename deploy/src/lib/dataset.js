const fs = require('fs');
const path = require('path');

class DatasetLoader {
  constructor(datasetPath) {
    this.datasetPath = datasetPath || process.env.MERGED_DATA_PATH || 'ref/merged_data.json';
    this._loaded = false;
    this._mtime = 0;
    this._idToRecord = new Map();
  }

  _absPath() {
    // Resolve relative to project root (deploy/ is cwd when running next dev in this dir)
    const primary = path.isAbsolute(this.datasetPath)
      ? this.datasetPath
      : path.join(process.cwd(), this.datasetPath);
    if (fs.existsSync(primary)) return primary;
    // Fallback to parent ref/ for local dev using repo root ref/merged_data.json
    const fallback = path.join(process.cwd(), '..', this.datasetPath);
    return fallback;
  }

  _loadFromDisk() {
    const p = this._absPath();
    if (!fs.existsSync(p)) {
      throw new Error(`Dataset file not found: ${p}`);
    }
    const stat = fs.statSync(p);
    if (this._loaded && stat.mtimeMs === this._mtime) return;
    const raw = fs.readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    let records;
    if (Array.isArray(data)) {
      records = data;
    } else if (data && typeof data === 'object') {
      const values = Object.values(data);
      if (values.every(v => v && typeof v === 'object')) {
        records = values;
      } else {
        throw new Error('Unsupported dataset dict structure; expected {id: record}');
      }
    } else {
      throw new Error('Unsupported dataset type; expected list or dict');
    }
    const map = new Map();
    for (const rec of records) {
      if (rec && typeof rec === 'object' && rec.id != null) {
        map.set(String(rec.id), rec);
      }
    }
    this._idToRecord = map;
    this._mtime = stat.mtimeMs;
    this._loaded = true;
  }

  _ensureLoaded() {
    const p = this._absPath();
    const stat = fs.existsSync(p) ? fs.statSync(p) : { mtimeMs: 0 };
    if (!this._loaded || stat.mtimeMs !== this._mtime) this._loadFromDisk();
  }

  listIds() {
    this._ensureLoaded();
    return Array.from(this._idToRecord.keys());
  }

  getById(id) {
    this._ensureLoaded();
    const key = String(id);
    if (!this._idToRecord.has(key)) throw new Error(`Patient id not found: ${id}`);
    return this._idToRecord.get(key);
  }

  _normalizePortrait(portrait) {
    const p = portrait && typeof portrait === 'object' ? { ...portrait } : {};
    if (p.martial_status == null && p.marital_status != null) p.martial_status = p.marital_status;
    if (p.age == null) p.age = '28';
    if (p.gender == null) p.gender = '男';
    if (p.occupation == null) p.occupation = '未知';
    if (p.martial_status == null) p.martial_status = '未婚';
    if (p.symptoms == null) p.symptoms = '工作焦虑，失眠';
    return p;
  }

  tryMapToComponents(record) {
    const portrait = this._normalizePortrait(record?.portrait);
    const report = record?.report || {};
    let conversation = record?.previous_conversations;
    if (conversation == null) conversation = record?.conversation || [];
    if (conversation == null) conversation = [];
    let seeker_prompt = record?.seeker_prompt || record?.seek_prompt || record?.prompt || record?.system;
    if (!seeker_prompt) {
      const info = this._normalizePortrait(record?.portrait || {});
      seeker_prompt = `# Role: 心理咨询患者\n\n## Profile\n- 性别: ${info.gender || '未知'}\n- 年龄: ${info.age || '未知'}\n- 职业: ${info.occupation || '未知'}\n- 婚姻状况: ${info.martial_status || '未知'}\n\n## Situation\n- 你是一个有心理障碍的患者，正在向心理咨询师求助，在咨询师的引导和帮助下解决自己的困惑\n- 你的主要症状包括：${info.symptoms || '心理困扰'}\n\n## Characteristics of speaking style\n- 情绪低落，寡言少语，回复风格表现心情不振奋\n- 表达情绪真实，通过具体实例传达内心感受\n- 对自身的疑惑和不安能够坦诚表达\n- 采用反思的语气，愿意探讨内心深处的问题\n- 对解决方案表现出一定的开放性和期待\n\n## Constraints\n- 你对咨询师有一种抵触情绪，不太愿意接受他人的帮助\n- 你是一个遇到心理健康问题的求助者，需要真正的帮助和情绪支持，如果咨询师的回应不理想，要勇于表达自己的困惑和不满\n- 一次不能提及过多的症状信息，每轮最多讨论一个症状\n- 你应该用含糊和口语化的方式表达你的症状，并将其与你的生活经历联系起来，不要使用专业术语\n\n## OutputFormat:\n- 语言：Chinese\n- 不超过200字\n- 口语对话风格，仅包含对话内容`;
    }
    const chain = record?.chain || record?.complaint_chain || [];
    return [portrait, report, conversation, seeker_prompt, chain];
  }
}

module.exports = { DatasetLoader };
