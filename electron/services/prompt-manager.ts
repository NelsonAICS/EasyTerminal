// Prompt Manager — CRUD operations for prompt templates
// Supports variable extraction ({{variable}}), categories, tags, and LLM-driven optimization

import { dbAll, dbGet, dbInsert, dbUpdate, dbDelete, generateId } from './database';
import { simpleCompletion, type LLMConfig } from './llm-gateway';

export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  variables: string[];
  is_template: number;
  created_at: string;
  updated_at: string;
}

interface PromptRow {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  variables: string;
  is_template: number;
  created_at: string;
  updated_at: string;
}

function rowToPrompt(row: PromptRow): Prompt {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    variables: JSON.parse(row.variables || '[]'),
  };
}

// Extract {{variable}} patterns from prompt content
function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g);
  const vars = new Set<string>();
  for (const m of matches) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

// ── CRUD ──────────────────────────────────────────────────────────

export function listPrompts(category?: string): Prompt[] {
  const rows = category
    ? dbAll<PromptRow>('prompts', 'category = ?', [category])
    : dbAll<PromptRow>('prompts');
  return rows.map(rowToPrompt);
}

export function getPrompt(id: string): Prompt | undefined {
  const row = dbGet<PromptRow>('prompts', id);
  return row ? rowToPrompt(row) : undefined;
}

export function createPrompt(data: { title: string; content: string; category?: string; tags?: string[] }): Prompt {
  const id = generateId();
  const variables = extractVariables(data.content);
  const record = {
    id,
    title: data.title,
    content: data.content,
    category: data.category || 'general',
    tags: JSON.stringify(data.tags || []),
    variables: JSON.stringify(variables),
    is_template: 0,
  };
  dbInsert('prompts', record);
  return { ...record, tags: data.tags || [], variables, created_at: '', updated_at: '' };
}

export function updatePrompt(id: string, data: Partial<{ title: string; content: string; category: string; tags: string[] }>) {
  const fields: Record<string, unknown> = {};
  if (data.title !== undefined) fields.title = data.title;
  if (data.content !== undefined) {
    fields.content = data.content;
    fields.variables = JSON.stringify(extractVariables(data.content));
  }
  if (data.category !== undefined) fields.category = data.category;
  if (data.tags !== undefined) fields.tags = JSON.stringify(data.tags);
  dbUpdate('prompts', id, fields);
}

export function deletePrompt(id: string) {
  dbDelete('prompts', id);
}

// ── Render a prompt with variable values ──────────────────────────

export function renderPrompt(promptId: string, values: Record<string, string>): string {
  const prompt = getPrompt(promptId);
  if (!prompt) throw new Error('Prompt not found');

  let content = prompt.content;
  for (const [key, value] of Object.entries(values)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

// ── LLM-driven prompt optimization ────────────────────────────────

const OPTIMIZATION_SYSTEM_PROMPT = `You are a Prompt Engineering expert. You optimize user prompts using the CO-STAR framework:
- Context: Provide background information
- Objective: Clearly define the task
- Style: Specify the writing/output style
- Tone: Set the appropriate tone
- Audience: Define the target audience
- Response: Specify the expected output format

Rewrite the given prompt to be more effective. Output ONLY the optimized prompt, nothing else.
If the original prompt is already well-structured, improve its clarity and specificity.`;

export async function optimizePrompt(llmConfig: LLMConfig, draftPrompt: string): Promise<string> {
  return simpleCompletion(llmConfig, draftPrompt, OPTIMIZATION_SYSTEM_PROMPT);
}

// ── Search prompts by keyword ─────────────────────────────────────

export function searchPrompts(query: string): Prompt[] {
  const all = listPrompts();
  const q = query.toLowerCase();
  return all.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
}
