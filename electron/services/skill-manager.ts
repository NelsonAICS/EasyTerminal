// Skill Manager — Discover, index, and semantically search local skills
// Skills are defined by manifest.json files in the user's skills directory

import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';
import { dbAll, dbGet, dbInsert, dbDelete, dbUpdate, generateId, dbQuery } from './database';
import { generateEmbedding, cosineSimilarity, type EmbeddingConfig, serializeEmbedding, deserializeEmbedding } from './vector-store';

export interface Skill {
  id: string;
  name: string;
  description: string;
  manifest_path: string;
  icon: string;
  category: string;
  tags: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  embedding: number[] | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface SkillRow {
  id: string;
  name: string;
  description: string;
  manifest_path: string;
  icon: string;
  category: string;
  tags: string;
  input_schema: string;
  output_schema: string;
  embedding: Buffer | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface SkillManifest {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  tags?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

function rowToSkill(row: SkillRow): Skill {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    input_schema: JSON.parse(row.input_schema || '{}'),
    output_schema: JSON.parse(row.output_schema || '{}'),
    embedding: row.embedding ? deserializeEmbedding(row.embedding) : null,
  };
}

// ── Skill directory ───────────────────────────────────────────────

function getSkillsDir(): string {
  const skillsDir = path.join(app.getPath('userData'), 'skills');
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }
  return skillsDir;
}

// ── Discover skills from filesystem ───────────────────────────────

export function discoverSkills(): SkillManifest[] {
  const skillsDir = getSkillsDir();
  const manifests: SkillManifest[] = [];

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(skillsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw) as SkillManifest;
        manifests.push(manifest);
      } catch {
        // Skip invalid manifests
      }
    }
  } catch {
    // Skills dir not accessible
  }

  return manifests;
}

// ── Re-index all skills (discover + embed) ────────────────────────

export async function reindexSkills(embeddingConfig: EmbeddingConfig): Promise<number> {
  const manifests = discoverSkills();
  const skillsDir = getSkillsDir();

  for (const manifest of manifests) {
    const id = manifest.name.toLowerCase().replace(/\s+/g, '_');
    const manifestPath = path.join(skillsDir, manifest.name.toLowerCase().replace(/\s+/g, '_'), 'manifest.json');

    // Generate embedding from name + description
    const text = `${manifest.name}: ${manifest.description || ''}`;
    let embedding: Buffer | null = null;
    try {
      const vec = await generateEmbedding(embeddingConfig, text);
      embedding = serializeEmbedding(vec);
    } catch {
      // Embedding failed, store without vector
    }

    dbInsert('skills', {
      id,
      name: manifest.name,
      description: manifest.description || '',
      manifest_path: manifestPath,
      icon: manifest.icon || '',
      category: manifest.category || 'general',
      tags: JSON.stringify(manifest.tags || []),
      input_schema: JSON.stringify(manifest.inputSchema || {}),
      output_schema: JSON.stringify(manifest.outputSchema || {}),
      embedding,
      enabled: 1,
    });
  }

  return manifests.length;
}

// ── CRUD ──────────────────────────────────────────────────────────

export function listSkills(category?: string): Skill[] {
  const rows = category
    ? dbAll<SkillRow>('skills', 'category = ? AND enabled = 1', [category])
    : dbAll<SkillRow>('skills', 'enabled = 1');
  return rows.map(rowToSkill);
}

export function getSkill(id: string): Skill | undefined {
  const row = dbGet<SkillRow>('skills', id);
  return row ? rowToSkill(row) : undefined;
}

export function deleteSkill(id: string) {
  dbDelete('skills', id);
}

export function toggleSkill(id: string, enabled: boolean) {
  dbUpdate('skills', id, { enabled: enabled ? 1 : 0 });
}

// ── Semantic search ───────────────────────────────────────────────

export async function searchSkills(
  query: string,
  embeddingConfig: EmbeddingConfig,
  topK: number = 5,
): Promise<Array<{ skill: Skill; score: number }>> {
  // Generate query embedding
  const queryVec = await generateEmbedding(embeddingConfig, query);

  // Get all skills with embeddings
  const rows = dbAll<SkillRow>('skills', 'embedding IS NOT NULL AND enabled = 1');
  const skills = rows.map(rowToSkill);

  // Compute similarity
  const scored = skills
    .filter(s => s.embedding && s.embedding.length > 0)
    .map(skill => ({
      skill,
      score: cosineSimilarity(queryVec, skill.embedding!),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

// ── Get skill categories ──────────────────────────────────────────

export function getSkillCategories(): string[] {
  const rows = dbQuery<{ category: string }>('SELECT DISTINCT category FROM skills WHERE enabled = 1');
  return rows.map(r => r.category);
}
