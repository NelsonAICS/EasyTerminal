import * as contextStore from './context-store';

export interface DriftConflict {
  type: 'goal' | 'constraint' | 'style' | 'scope';
  message: string;
  anchorRef?: string;
}

export interface DriftCheckResult {
  aligned: boolean;
  score: number;
  conflicts: DriftConflict[];
}

interface DriftCheckOptions {
  sessionId?: string;
  taskId?: string;
}

function parseSection(summaryBlock: string, sectionName: string): string[] {
  const lines = summaryBlock.split('\n');
  const startIndex = lines.findIndex(line => line.trim() === `${sectionName}:`);
  if (startIndex === -1) return [];

  const values: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (!line.startsWith('- ') && line.endsWith(':')) break;
    if (line.startsWith('- ')) values.push(line.slice(2).trim());
  }
  return values;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function buildNeedles(text: string) {
  const normalized = normalize(text);
  if (!normalized) return [];
  const words = normalized.split(' ').filter(word => word.length >= 4).slice(0, 4);
  if (words.length > 0) return words;
  return [normalized.slice(0, 8)];
}

function containsNeedle(haystack: string, source: string) {
  const normalizedHaystack = normalize(haystack);
  return buildNeedles(source).some(needle => normalizedHaystack.includes(needle));
}

export class DriftGuard {
  checkSummary(summaryBlock: string, options: DriftCheckOptions = {}): DriftCheckResult {
    const conflicts: DriftConflict[] = [];

    const goals = parseSection(summaryBlock, 'goal');
    const constraints = parseSection(summaryBlock, 'immutable_constraints');
    const styles = parseSection(summaryBlock, 'style_guidance');
    const evidenceRefs = parseSection(summaryBlock, 'evidence_refs');

    const activeGoals = contextStore.queryRecords({ kind: 'goal', status: 'active', limit: 20 });
    const activeConstraints = contextStore.queryRecords({ kind: 'constraint', status: 'active', limit: 20 });
    const activeStyles = contextStore.queryRecords({ kind: 'style', status: 'active', limit: 20 });

    const goalText = goals.join('\n');
    const constraintText = constraints.join('\n');
    const styleText = styles.join('\n');

    for (const goal of activeGoals) {
      if (!containsNeedle(goalText, goal.summary)) {
        conflicts.push({
          type: 'goal',
          message: `Summary no longer clearly reflects active goal: ${goal.title}`,
          anchorRef: goal.source_ref,
        });
      }
    }

    for (const constraint of activeConstraints) {
      if (!containsNeedle(constraintText, constraint.summary) && !containsNeedle(styleText, constraint.summary)) {
        conflicts.push({
          type: 'constraint',
          message: `Immutable constraint appears missing: ${constraint.title}`,
          anchorRef: constraint.source_ref,
        });
      }
    }

    for (const style of activeStyles) {
      if (!containsNeedle(styleText, style.summary)) {
        conflicts.push({
          type: 'style',
          message: `Style guidance appears missing: ${style.title}`,
          anchorRef: style.source_ref,
        });
      }
    }

    if (evidenceRefs.length === 0) {
      conflicts.push({
        type: 'scope',
        message: 'Summary is missing evidence refs.',
      });
    }

    if (!options.sessionId && !options.taskId && goals.length === 0) {
      conflicts.push({
        type: 'scope',
        message: 'Summary is missing a goal section for the current task context.',
      });
    }

    const score = Math.max(0, 1 - conflicts.length * 0.2);
    return {
      aligned: conflicts.length === 0,
      score,
      conflicts,
    };
  }
}

export function createDriftGuard() {
  return new DriftGuard();
}
