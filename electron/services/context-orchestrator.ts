import * as fs from 'node:fs';
import * as path from 'node:path';

import * as contextStore from './context-store';
import type { DriftGuard, DriftCheckResult } from './drift-guard';
import * as knowledgeBase from './knowledge-base';
import type { EmbeddingConfig } from './vector-store';

export interface ContextPacket {
  anchorBlock: string;
  workingBlock: string;
  episodicBlock: string;
  retrievalBlock: string;
  styleBlock?: string;
  tokenBudget: {
    total: number;
    reservedForResponse: number;
    usedByContext: number;
  };
  refs: string[];
}

interface ContextPacketOptions {
  sessionId?: string;
  taskId?: string;
  query?: string;
  totalBudget?: number;
  reservedForResponse?: number;
}

interface CompactContextOptions {
  sessionId?: string;
  taskId?: string;
  query?: string;
  totalBudget?: number;
}

interface ContextOrchestratorDependencies {
  getEmbeddingConfig: () => EmbeddingConfig;
  projectRoot: string;
  driftGuard?: DriftGuard;
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function clampText(text: string, maxChars: number) {
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => path.join(dirPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

function discoverAnchorFiles(projectRoot: string) {
  const candidates = [
    path.join(projectRoot, 'README.md'),
    path.join(projectRoot, 'Agent_Extension_Design.md'),
    ...listMarkdownFiles(path.join(projectRoot, 'design')),
    ...listMarkdownFiles(path.join(projectRoot, 'docs')),
  ];
  return Array.from(new Set(candidates)).filter(filePath => fs.existsSync(filePath));
}

function buildAnchorBlock(projectRoot: string, maxChars: number) {
  const files = discoverAnchorFiles(projectRoot).slice(0, 6);
  const sections: string[] = [];
  const refs: string[] = [];
  let remaining = maxChars;

  for (const filePath of files) {
    if (remaining <= 0) break;
    const raw = fs.readFileSync(filePath, 'utf-8')
      .replace(/^---[\s\S]+?---/m, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) continue;

    const excerpt = clampText(raw, Math.min(remaining, 700));
    sections.push(`[${path.relative(projectRoot, filePath)}]\n${excerpt}`);
    refs.push(filePath);
    remaining -= excerpt.length;
  }

  return {
    block: sections.join('\n\n---\n\n'),
    refs,
  };
}

function buildRecordBlock(
  title: string,
  records: Array<{ title: string; summary: string; source_ref: string }>,
  maxItems: number,
) {
  const items = records.slice(0, maxItems).map(record => `- ${record.title}: ${record.summary}`);
  if (items.length === 0) return '';
  return `${title}\n${items.join('\n')}`;
}

export class ContextOrchestrator {
  private readonly deps: ContextOrchestratorDependencies;

  constructor(deps: ContextOrchestratorDependencies) {
    this.deps = deps;
  }

  async buildContextPacket(options: ContextPacketOptions = {}): Promise<ContextPacket> {
    const totalBudget = Math.max(1200, options.totalBudget || 6000);
    const reservedForResponse = Math.max(600, options.reservedForResponse || Math.floor(totalBudget * 0.4));
    const contextBudget = totalBudget - reservedForResponse;

    const anchorBudget = Math.floor(contextBudget * 0.3);
    const workingBudget = Math.floor(contextBudget * 0.25);
    const episodicBudget = Math.floor(contextBudget * 0.2);
    const retrievalBudget = Math.floor(contextBudget * 0.15);
    const styleBudget = Math.floor(contextBudget * 0.1);

    const anchor = buildAnchorBlock(this.deps.projectRoot, anchorBudget * 4);

    const workingRecords = contextStore.queryRecords({
      scope: options.sessionId ? 'session' : 'project',
      status: 'active',
      limit: 10,
    });
    const episodicRecords = contextStore.queryRecords({
      scope: 'project',
      status: 'active',
      limit: 12,
    }).filter(record => record.kind === 'decision' || record.kind === 'artifact' || record.kind === 'summary');
    const styleRecords = contextStore.queryRecords({
      status: 'active',
      limit: 6,
    }).filter(record => record.kind === 'style' || record.kind === 'constraint');

    const workingBlock = clampText(
      buildRecordBlock('Working Memory', workingRecords, 6),
      workingBudget * 4,
    );
    const episodicBlock = clampText(
      buildRecordBlock('Episodic Memory', episodicRecords, 6),
      episodicBudget * 4,
    );
    const styleBlock = clampText(
      buildRecordBlock('Style And Constraints', styleRecords, 5),
      styleBudget * 4,
    ) || undefined;

    let retrievalBlock = '';
    const retrievalRefs: string[] = [];
    if (options.query?.trim()) {
      try {
        const embConfig = this.deps.getEmbeddingConfig();
        if (embConfig.model) {
          const results = await knowledgeBase.retrieveContext(options.query, embConfig, 3);
          retrievalBlock = clampText(
            results.map(result => {
              const source = result.doc?.filename || 'unknown';
              retrievalRefs.push(source);
              return `- ${source}: ${result.chunk.content}`;
            }).join('\n'),
            retrievalBudget * 4,
          );
        }
      } catch {
        retrievalBlock = '';
      }
    }

    const refs = Array.from(new Set([
      ...anchor.refs,
      ...workingRecords.map(record => record.source_ref),
      ...episodicRecords.map(record => record.source_ref),
      ...styleRecords.map(record => record.source_ref),
      ...retrievalRefs,
    ].filter(Boolean)));

    const usedByContext = estimateTokens([
      anchor.block,
      workingBlock,
      episodicBlock,
      retrievalBlock,
      styleBlock || '',
    ].join('\n\n'));

    return {
      anchorBlock: anchor.block,
      workingBlock,
      episodicBlock,
      retrievalBlock,
      styleBlock,
      tokenBudget: {
        total: totalBudget,
        reservedForResponse,
        usedByContext,
      },
      refs,
    };
  }

  async compactContext(options: CompactContextOptions = {}) {
    const workingRecords = contextStore.queryRecords({
      scope: options.sessionId ? 'session' : 'project',
      status: 'active',
      limit: 12,
    });
    const projectRecords = contextStore.queryRecords({
      scope: 'project',
      status: 'active',
      limit: 12,
    });
    const sessionEvents = options.sessionId
      ? contextStore.listSessionEvents(options.sessionId, 10)
      : [];

    const goals = projectRecords.filter(record => record.kind === 'goal').map(record => record.summary);
    const constraints = projectRecords
      .filter(record => record.kind === 'constraint' || record.kind === 'style')
      .map(record => record.summary);
    const decisions = projectRecords
      .filter(record => record.kind === 'decision' || record.kind === 'artifact' || record.kind === 'summary')
      .map(record => record.summary);
    const openQuestions = projectRecords
      .filter(record => record.kind === 'issue')
      .map(record => record.summary);
    const nextActions = projectRecords
      .filter(record => record.kind === 'next_step')
      .map(record => record.summary);

    const fallbackNextActions = workingRecords.slice(0, 3).map(record => record.summary);
    const evidenceRefs = Array.from(new Set([
      ...workingRecords.map(record => record.source_ref),
      ...projectRecords.map(record => record.source_ref),
    ].filter(Boolean))).slice(0, 10);

    const summaryBlock = [
      'goal:',
      goals.length ? goals.slice(0, 3).map(goal => `- ${goal}`).join('\n') : '- Continue the current EasyTerminal task without losing the project direction.',
      'immutable_constraints:',
      constraints.length ? constraints.slice(0, 5).map(item => `- ${item}`).join('\n') : '- Keep alignment with existing design documents and preserve current user intent.',
      'decisions:',
      decisions.length ? decisions.slice(0, 5).map(item => `- ${item}`).join('\n') : '- No stable decisions have been recorded yet.',
      'open_questions:',
      openQuestions.length ? openQuestions.slice(0, 5).map(item => `- ${item}`).join('\n') : '- None currently recorded.',
      'next_actions:',
      (nextActions.length ? nextActions : fallbackNextActions).slice(0, 5).map(item => `- ${item}`).join('\n') || '- Continue the next planned implementation step.',
      'style_guidance:',
      constraints.length ? constraints.slice(0, 3).map(item => `- ${item}`).join('\n') : '- Preserve the established product and writing style.',
      'evidence_refs:',
      evidenceRefs.length ? evidenceRefs.map(ref => `- ${ref}`).join('\n') : '- No evidence refs recorded yet.',
      sessionEvents.length ? 'recent_events:' : '',
      sessionEvents.length ? sessionEvents.slice(0, 3).map(event => `- ${event.event_type}: ${clampText(event.payload, 160)}`).join('\n') : '',
    ].filter(Boolean).join('\n');

    const existingSnapshots = contextStore.listSnapshots({
      sessionId: options.sessionId,
      taskId: options.taskId,
      limit: 1,
    });
    const version = (existingSnapshots[0]?.version || 0) + 1;
    const snapshot = contextStore.createSnapshot({
      session_id: options.sessionId || '',
      task_id: options.taskId || '',
      version,
      summary_block: summaryBlock,
      token_estimate: estimateTokens(summaryBlock),
      drift_score: 0,
      status: 'candidate',
    });
    const driftCheck: DriftCheckResult | null = this.deps.driftGuard
      ? this.deps.driftGuard.checkSummary(summaryBlock, {
          sessionId: options.sessionId,
          taskId: options.taskId,
        })
      : null;

    if (!driftCheck || driftCheck.aligned) {
      contextStore.updateSnapshot(snapshot.id, {
        drift_score: driftCheck?.score || 1,
        status: 'active',
      });
      contextStore.activateSnapshot(snapshot.id);
    } else {
      contextStore.updateSnapshot(snapshot.id, {
        drift_score: driftCheck.score,
        status: 'candidate',
      });
    }

    return {
      snapshot: contextStore.listSnapshots({
        sessionId: options.sessionId,
        taskId: options.taskId,
        limit: 1,
      })[0],
      driftCheck,
    };
  }
}

export function createContextOrchestrator(deps: ContextOrchestratorDependencies) {
  return new ContextOrchestrator(deps);
}
