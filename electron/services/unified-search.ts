// Unified Search — Cross-module search across all features
// Searches: prompts, skills, knowledge, workflows, context records

import * as promptManager from './prompt-manager';
import * as skillManager from './skill-manager';
import * as knowledgeBase from './knowledge-base';
import * as workflowEngine from './workflow-engine';
import * as contextStore from './context-store';
import type { EmbeddingConfig } from './vector-store';

export interface UnifiedSearchResult {
  source: 'prompt' | 'skill' | 'knowledge' | 'workflow' | 'context';
  id: string;
  title: string;
  description: string;
  score: number; // 0-1 relevance score
  metadata: Record<string, unknown>;
  url?: string; // Optional URL for navigation
}

export interface UnifiedSearchOptions {
  query: string;
  modules?: Array<'prompt' | 'skill' | 'knowledge' | 'workflow' | 'context'>;
  topK?: number; // Per-module results
  embeddingConfig?: EmbeddingConfig;
}

export interface UnifiedSearchResponse {
  results: UnifiedSearchResult[];
  totalCount: number;
  moduleCounts: Record<string, number>;
  query: string;
  took: number; // milliseconds
}

const DEFAULT_TOP_K = 5;

export async function unifiedSearch(options: UnifiedSearchOptions): Promise<UnifiedSearchResponse> {
  const { query, modules, topK = DEFAULT_TOP_K, embeddingConfig } = options;
  const startTime = Date.now();

  const activeModules = modules || ['prompt', 'skill', 'knowledge', 'workflow', 'context'];
  const results: UnifiedSearchResult[] = [];
  const moduleCounts: Record<string, number> = {};

  // Run all searches in parallel
  const searchPromises: Promise<UnifiedSearchResult[]>[] = [];

  if (activeModules.includes('prompt')) {
    searchPromises.push(
      searchPrompts(query, topK)
    );
  }

  if (activeModules.includes('skill')) {
    searchPromises.push(
      searchSkills(query, embeddingConfig, topK)
    );
  }

  if (activeModules.includes('knowledge')) {
    searchPromises.push(
      searchKnowledge(query, embeddingConfig, topK)
    );
  }

  if (activeModules.includes('workflow')) {
    searchPromises.push(
      searchWorkflows(query, topK)
    );
  }

  if (activeModules.includes('context')) {
    searchPromises.push(
      searchContext(query, topK)
    );
  }

  const moduleResults = await Promise.allSettled(searchPromises);

  const modulesList = activeModules;

  for (let i = 0; i < moduleResults.length; i++) {
    const result = moduleResults[i];
    const moduleName = modulesList[i];

    if (result.status === 'fulfilled' && result.value.length > 0) {
      const moduleResultsArr = result.value;
      moduleCounts[moduleName] = moduleResultsArr.length;
      results.push(...moduleResultsArr);
    } else {
      moduleCounts[moduleName] = 0;
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return {
    results,
    totalCount: results.length,
    moduleCounts,
    query,
    took: Date.now() - startTime,
  };
}

// ── Module-specific searchers ─────────────────────────────────

async function searchPrompts(query: string, topK: number): Promise<UnifiedSearchResult[]> {
  try {
    const prompts = promptManager.searchPrompts(query);
    return prompts.slice(0, topK).map((p, i) => ({
      source: 'prompt' as const,
      id: p.id,
      title: p.title,
      description: p.content.substring(0, 150),
      score: Math.max(0.9 - i * 0.1, 0.5),
      metadata: { category: p.category, tags: p.tags },
    }));
  } catch {
    return [];
  }
}

async function searchSkills(query: string, embeddingConfig?: EmbeddingConfig, topK?: number): Promise<UnifiedSearchResult[]> {
  try {
    if (!embeddingConfig) {
      // Fall back to text search
      const allSkills = (skillManager as unknown as { listSkills: (cat?: string) => Array<{ id: string; name: string; description: string }> }).listSkills();
      return allSkills
        .filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase()))
        .slice(0, topK)
        .map((s, i) => ({
          source: 'skill' as const,
          id: s.id,
          title: s.name,
          description: s.description,
          score: Math.max(0.8 - i * 0.1, 0.4),
          metadata: {},
        }));
    }

    const skills = await skillManager.searchSkills(query, embeddingConfig, topK || DEFAULT_TOP_K);
    return skills.map((s: { id: string; name: string; description: string; similarity?: number }, i: number) => ({
      source: 'skill' as const,
      id: s.id,
      title: s.name,
      description: s.description,
      score: s.similarity ?? Math.max(0.8 - i * 0.1, 0.4),
      metadata: {},
    }));
  } catch {
    return [];
  }
}

async function searchKnowledge(query: string, embeddingConfig?: EmbeddingConfig, topK?: number): Promise<UnifiedSearchResult[]> {
  try {
    if (!embeddingConfig) {
      return [];
    }
    const chunks = await knowledgeBase.retrieveContext(query, embeddingConfig, topK || DEFAULT_TOP_K);
    return chunks.map((c: { id: string; content: string; metadata?: string }, i: number) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = c.metadata ? JSON.parse(c.metadata) : {};
      } catch { /* ignore */ }
      return {
        source: 'knowledge' as const,
        id: c.id,
        title: (meta.filename as string) || `片段 ${i + 1}`,
        description: c.content.substring(0, 150),
        score: Math.max(0.8 - i * 0.1, 0.4),
        metadata: meta,
      };
    });
  } catch {
    return [];
  }
}

async function searchWorkflows(query: string, topK: number): Promise<UnifiedSearchResult[]> {
  try {
    const workflows = workflowEngine.listWorkflows(query);
    return workflows.slice(0, topK).map((w: { id: string; name: string; description: string; tags: string[] }, i: number) => ({
      source: 'workflow' as const,
      id: w.id,
      title: w.name,
      description: w.description,
      score: Math.max(0.85 - i * 0.1, 0.5),
      metadata: { tags: w.tags },
      url: `workflow://${w.id}`,
    }));
  } catch {
    return [];
  }
}

async function searchContext(query: string, topK: number): Promise<UnifiedSearchResult[]> {
  try {
    const records = contextStore.queryRecords({
      query,
      limit: topK,
    });
    return records.map((r: { id: string; title: string; summary: string; kind: string; source_type: string }, i: number) => ({
      source: 'context' as const,
      id: r.id,
      title: r.title,
      description: r.summary,
      score: Math.max(0.7 - i * 0.08, 0.3),
      metadata: { kind: r.kind, sourceType: r.source_type },
      url: `context://${r.id}`,
    }));
  } catch {
    return [];
  }
}

// ── IPC handler helper ─────────────────────────────────────────

export function getEmbeddingConfig(): EmbeddingConfig | null {
  try {
    const config = (global as unknown as { getEmbeddingConfig: () => EmbeddingConfig | null }).getEmbeddingConfig;
    return config ? config() : null;
  } catch {
    return null;
  }
}
