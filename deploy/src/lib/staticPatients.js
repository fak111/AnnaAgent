// Generate 40 static patient records for demo/production fallback

function buildSeekerPrompt(p) {
  const gender = p.gender || '未知';
  const age = p.age || '未知';
  const occ = p.occupation || '未知';
  const ms = p.martial_status || '未知';
  const symptoms = p.symptoms || '心理困扰';
  return `# 角色: 心理咨询患者\n\n## 档案\n- 性别: ${gender}\n- 年龄: ${age}\n- 职业: ${occ}\n- 婚姻状况: ${ms}\n\n## 状况\n- 你是心理咨询中的来访者（患者）。请始终以第一人称、来访者的口吻与咨询师对话。\n- 你的主要症状包括：${symptoms}。每轮只谈一个要点，不要一次性讲完所有信息。\n- 语气口语化、真实、避免专业术语。\n\n## 表达风格\n- 简洁、自然、带情绪色彩，围绕当前困扰展开。\n- 可以举生活中的具体例子来说明感受与影响。\n\n## 输出格式\n- 仅输出来访者的对话内容，不要加入任何旁白或标注。\n- 语言: Chinese\n- 每次不超过200字。`;
}

function makeChain(items) {
  return items.map((c, i) => ({ stage: i + 1, content: c }));
}

function createPatient(id, portrait, report, chain) {
  return { id, portrait, report, chain: makeChain(chain) };
}

function generatePatients() {
  const out = [];
  const occupations = ['软件工程师', '教师', '学生', '产品经理', '销售', '护士', '设计师', '律师', '自由职业', '运营'];
  let idx = 1;
  // 10 焦虑/失眠
  for (let i = 0; i < 10; i++) {
    const age = 22 + (i % 10);
    const gender = i % 2 === 0 ? '男' : '女';
    const occ = occupations[i % occupations.length];
    out.push(createPatient(
      `static-${idx++}`,
      { age: String(age), gender, occupation: occ, martial_status: i % 3 ? '未婚' : '已婚', symptoms: '焦虑;失眠' },
      { '案例标题': '工作压力与睡眠问题', '案例类别': ['职业压力', '睡眠'] },
      ['最近工作/学习压力很大', '晚上难以入睡或易醒', '白天注意力差、易烦躁', '担心影响表现与人际']
    ));
  }
  // 10 抑郁/低落
  for (let i = 0; i < 10; i++) {
    const age = 24 + (i % 12);
    const gender = i % 2 === 0 ? '女' : '男';
    const occ = occupations[(i + 3) % occupations.length];
    out.push(createPatient(
      `static-${idx++}`,
      { age: String(age), gender, occupation: occ, martial_status: i % 4 ? '未婚' : '已婚', symptoms: '情绪低落;兴趣减退' },
      { '案例标题': '情绪低落与动力不足', '案例类别': ['情绪', '能量'] },
      ['情绪持续低落', '对原本喜欢的事失去兴趣', '精力差、拖延', '自我评价下降']
    ));
  }
  // 10 社交焦虑/回避
  for (let i = 0; i < 10; i++) {
    const age = 20 + (i % 8);
    const gender = i % 2 === 0 ? '男' : '女';
    const occ = occupations[(i + 6) % occupations.length];
    out.push(createPatient(
      `static-${idx++}`,
      { age: String(age), gender, occupation: occ, martial_status: '未婚', symptoms: '社交焦虑;回避' },
      { '案例标题': '社交焦虑与回避', '案例类别': ['社交', '焦虑'] },
      ['在人多场合明显紧张', '担心被评价出丑', '主动回避社交活动', '影响学习/工作机会']
    ));
  }
  // 10 家庭矛盾/压力
  for (let i = 0; i < 10; i++) {
    const age = 28 + (i % 12);
    const gender = i % 2 === 0 ? '女' : '男';
    const occ = occupations[(i + 1) % occupations.length];
    out.push(createPatient(
      `static-${idx++}`,
      { age: String(age), gender, occupation: occ, martial_status: i % 2 ? '已婚' : '未婚', symptoms: '家庭矛盾;压力' },
      { '案例标题': '家庭沟通与情绪管理', '案例类别': ['家庭', '压力'] },
      ['与家人沟通不畅', '家庭责任与期待带来压力', '情绪波动、易争执', '希望改善关系与沟通']
    ));
  }
  return out;
}

const STATIC_PATIENTS = generatePatients();

function listStaticIds() {
  return STATIC_PATIENTS.map(p => p.id);
}

function getStaticById(id) {
  return STATIC_PATIENTS.find(p => String(p.id) === String(id)) || null;
}

module.exports = { STATIC_PATIENTS, listStaticIds, getStaticById, buildSeekerPrompt };

