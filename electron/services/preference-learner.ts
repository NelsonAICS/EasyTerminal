// Preference Learner — Analyze user interactions to learn preferences
// Analyzes: tone, coding style, tool preferences, communication patterns

import { dbAll, dbInsert, dbUpdate, dbRun, dbQuery, generateId } from './database';

export interface UserPreference {
  id: string;
  scope: 'prompt' | 'skill' | 'all';
  dimension: 'tone' | 'code_style' | 'tool' | 'language' | 'response_style';
  value: string;
  weight: number; // 0-1 confidence score
  sample_count: number;
  created_at: string;
  updated_at: string;
}

interface PreferenceRow {
  id: string;
  scope: string;
  dimension: string;
  value: string;
  weight: number;
  sample_count: number;
  created_at: string;
  updated_at: string;
}

// Tone patterns to detect
const TONE_PATTERNS = {
  casual: /\b(hey|cool|awesome|great|thanks?|please|appreciate)\b/i,
  formal: /\b(please|kindly|would you|could|i would appreciate)\b/i,
  technical: /\b(api|function|method|call|invoke|execute|implement)\b/i,
  brief: /\b(just|quick|simple|brief)\b/i,
  detailed: /\b(detailed|thorough|complete|full)\b/i,
};

// Code style patterns
const CODE_STYLE_PATTERNS = {
  modern: /\b(typescript|rust|go|modern|es2022)\b/i,
  classic: /\b(javascript|java|python|classic)\b/i,
  functional: /\b(map|filter|reduce|lambda|pure)\b/i,
  oop: /\b(class|object|inherit|extends)\b/i,
  imperative: /\b(let|var|const|assignment|loop)\b/i,
};

// Tool preferences (detected from skill usage)
const POPULAR_SKILLS = [
  'git', 'npm', 'yarn', 'pnpm', 'node', 'python', 'pip', 'docker', 'kubectl',
  'bash', 'shell', 'grep', 'sed', 'awk', 'make', 'cmake',
  'curl', 'wget', 'http', 'api', 'rest', 'graphql',
];

export function learnFromPrompt(prompt: string) {
  if (!prompt || prompt.length < 10) return;

  const normalized = prompt.toLowerCase();

  // Detect tone preference
  for (const [tone, pattern] of Object.entries(TONE_PATTERNS)) {
    if (pattern.test(normalized)) {
      upsertPreference('all', 'tone', tone, 0.3);
    }
  }

  // Detect code style preference
  for (const [style, pattern] of Object.entries(CODE_STYLE_PATTERNS)) {
    if (pattern.test(normalized)) {
      upsertPreference('all', 'code_style', style, 0.2);
    }
  }
}

export function learnFromSkill(skillId: string, skillName: string) {
  if (!skillId) return;

  // Detect tool preference from skill name
  const toolLower = skillName.toLowerCase();
  for (const tool of POPULAR_SKILLS) {
    if (toolLower.includes(tool)) {
      upsertPreference('skill', 'tool', tool, 0.5);
    }
  }

  // Also update skill usage count
  upsertPreference('skill', 'tool', skillId, 0.3);
}

export function learnFromLanguage(language: string) {
  if (!language) return;
  upsertPreference('prompt', 'language', language, 0.4);
}

function upsertPreference(scope: string, dimension: string, value: string, weightDelta: number) {
  const existing = dbQuery<PreferenceRow>(
    'SELECT * FROM user_preferences WHERE scope = ? AND dimension = ? AND value = ?',
    [scope, dimension, value]
  )[0];

  if (existing) {
    const newWeight = Math.min(1, existing.weight + weightDelta);
    const newCount = existing.sample_count + 1;
    dbRun(
      'UPDATE user_preferences SET weight = ?, sample_count = ?, updated_at = datetime("now") WHERE id = ?',
      [newWeight, newCount, existing.id]
    );
  } else {
    dbInsert('user_preferences', {
      id: generateId(),
      scope,
      dimension,
      value,
      weight: weightDelta,
      sample_count: 1,
    });
  }
}

export function getPreferences(scope?: string): UserPreference[] {
  let query = 'SELECT * FROM user_preferences';
  const params: string[] = [];

  if (scope) {
    query += ' WHERE scope = ?';
    params.push(scope);
  }

  query += ' ORDER BY weight DESC, sample_count DESC';

  return dbAll<PreferenceRow>(query, ...params).map(row => ({
    id: row.id,
    scope: row.scope as UserPreference['scope'],
    dimension: row.dimension as UserPreference['dimension'],
    value: row.value,
    weight: row.weight,
    sample_count: row.sample_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function buildStyleBlock(): string {
  const preferences = getPreferences();

  if (preferences.length === 0) return '';

  const tonePref = preferences.find(p => p.dimension === 'tone' && p.weight > 0.3);
  const stylePref = preferences.find(p => p.dimension === 'code_style' && p.weight > 0.3);
  const toolPref = preferences.find(p => p.dimension === 'tool' && p.weight > 0.3);
  const langPref = preferences.find(p => p.dimension === 'language' && p.weight > 0.3);

  const sections: string[] = [];

  if (tonePref) {
    const toneInstructions = {
      casual: '保持轻松友好的语气，像朋友之间交流',
      formal: '使用正式礼貌的语言',
      technical: '使用准确的技术术语',
      brief: '简洁明了，直接给出要点',
      detailed: '提供详细完整的解释',
    };
    sections.push(`语气风格：${toneInstructions[tonePref.value as keyof typeof toneInstructions] || '自然流畅'}`);
  }

  if (stylePref) {
    const styleInstructions = {
      modern: '优先使用现代编程实践',
      classic: '使用经过验证的经典方法',
      functional: '推荐函数式编程风格',
      oop: '使用面向对象设计',
      imperative: '清晰明确的命令式代码',
    };
    sections.push(`代码风格：${styleInstructions[stylePref.value as keyof typeof styleInstructions] || '根据场景选择合适风格'}`);
  }

  if (toolPref && toolPref.weight > 0.5) {
    sections.push(`常用工具：${toolPref.value}，优先使用熟悉的工具`);
  }

  if (langPref) {
    sections.push(`首选语言：${langPref.value}`);
  }

  return sections.length > 0
    ? `\n[\u7528\u6237\u5047\u5957]\n${sections.join('\n')}`
    : '';
}

