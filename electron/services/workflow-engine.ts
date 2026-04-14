// Workflow Engine — DAG-based task execution engine
// Supports topological sort, parallel execution, and state passing between nodes

import { dbAll, dbGet, dbInsert, dbUpdate, dbDelete, dbRun, dbQuery, generateId } from './database';
import { chatCompletion, type LLMConfig } from './llm-gateway';
import { getPrompt, renderPrompt } from './prompt-manager';
import { getSkill } from './skill-manager';
import { buildRAGPrompt } from './knowledge-base';
import { type EmbeddingConfig } from './vector-store';
import * as fs from 'node:fs';
import { dirname } from 'node:path';

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'llm' | 'skill' | 'knowledge' | 'prompt' | 'condition' | 'parallel' | 'code' | 'document';
  label: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // For condition nodes: 'true' | 'false'
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, string>;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags?: string;
  nodes: string;
  edges: string;
  variables: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    ...row,
    category: row.category || 'general',
    tags: JSON.parse(row.tags || '[]'),
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    variables: JSON.parse(row.variables || '{}'),
  };
}

// ── CRUD ──────────────────────────────────────────────────────────

export function listWorkflows(): Workflow[] {
  return dbAll<WorkflowRow>('workflows').map(rowToWorkflow);
}

export function getWorkflow(id: string): Workflow | undefined {
  const row = dbGet<WorkflowRow>('workflows', id);
  return row ? rowToWorkflow(row) : undefined;
}

export function createWorkflow(data: { name: string; description?: string; category?: string; tags?: string[]; nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }): Workflow {
  const id = generateId();
  const record = {
    id,
    name: data.name,
    description: data.description || '',
    category: data.category || 'general',
    tags: JSON.stringify(data.tags || []),
    nodes: JSON.stringify(data.nodes || []),
    edges: JSON.stringify(data.edges || []),
    variables: JSON.stringify({}),
    enabled: 1,
  };
  dbInsert('workflows', record);
  return { ...record, tags: data.tags || [], nodes: data.nodes || [], edges: data.edges || [], variables: {} } as Workflow;
}

export function updateWorkflow(id: string, data: Partial<{ name: string; description: string; category: string; tags: string[]; nodes: WorkflowNode[]; edges: WorkflowEdge[]; variables: Record<string, string> }>) {
  const fields: Record<string, unknown> = {};
  if (data.name !== undefined) fields.name = data.name;
  if (data.description !== undefined) fields.description = data.description;
  if (data.category !== undefined) fields.category = data.category;
  if (data.tags !== undefined) fields.tags = JSON.stringify(data.tags);
  if (data.nodes !== undefined) fields.nodes = JSON.stringify(data.nodes);
  if (data.edges !== undefined) fields.edges = JSON.stringify(data.edges);
  if (data.variables !== undefined) fields.variables = JSON.stringify(data.variables);
  dbUpdate('workflows', id, fields);
}

export function deleteWorkflow(id: string) {
  dbRun('DELETE FROM workflow_runs WHERE workflow_id = ?', [id]);
  dbDelete('workflows', id);
}

// ── DAG Execution ─────────────────────────────────────────────────

export interface ExecutionContext {
  variables: Record<string, unknown>;
  results: Map<string, unknown>;
  logs: Array<{ nodeId: string; type: 'info' | 'error' | 'output'; message: string; timestamp: string }>;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  logs: ExecutionContext['logs'];
  executionTimeMs: number;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  result: string;
  error: string;
  started_at: string;
  completed_at: string | null;
}

// Topological sort using Kahn's algorithm
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle (not a valid DAG)');
  }

  return sorted;
}

// Execute a single node
async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  llmConfig: LLMConfig,
  embeddingConfig?: EmbeddingConfig,
): Promise<unknown> {
  const timestamp = new Date().toISOString();
  context.logs.push({ nodeId: node.id, type: 'info', message: `Executing node: ${node.label}`, timestamp });

  switch (node.type) {
    case 'start':
      return context.variables;

    case 'end':
      if (Array.isArray(node.config.sourceNodeIds) && node.config.sourceNodeIds.length > 0) {
        const sourceIds = (node.config.sourceNodeIds as string[]).filter(Boolean);
        return Object.fromEntries(sourceIds.map(sourceId => [sourceId, context.results.get(sourceId)]));
      }
      if (typeof node.config.inputNode === 'string' && node.config.inputNode) {
        return context.results.get(String(node.config.inputNode)) ?? Object.fromEntries(context.results);
      }
      return context.results.size > 0 ? Object.fromEntries(context.results) : context.variables;

    case 'llm': {
      const prompt = String(node.config.prompt || '');
      const systemPrompt = String(node.config.systemPrompt || '');
      const model = String(node.config.model || llmConfig.model);

      // Interpolate variables from context
      let renderedPrompt = prompt;
      for (const [key, val] of Object.entries(context.variables)) {
        renderedPrompt = renderedPrompt.replaceAll(`{{${key}}}`, String(val));
      }
      // Also interpolate previous node results
      for (const [nodeId, result] of context.results) {
        renderedPrompt = renderedPrompt.replaceAll(`{{result.${nodeId}}}`, String(result));
      }

      const response = await chatCompletion(
        { ...llmConfig, model },
        [{ role: 'user', content: renderedPrompt }],
        undefined,
        systemPrompt || undefined,
      );
      context.logs.push({ nodeId: node.id, type: 'output', message: response.content.substring(0, 200), timestamp });
      return response.content;
    }

    case 'prompt': {
      const promptId = String(node.config.promptId || '');
      if (promptId) {
        return renderPrompt(promptId, Object.fromEntries(
          Object.entries(context.variables).map(([key, value]) => [key, String(value)])
        ));
      }

      const inlinePrompt = String(node.config.content || node.config.prompt || '');
      let rendered = inlinePrompt;
      for (const [key, val] of Object.entries(context.variables)) {
        rendered = rendered.replaceAll(`{{${key}}}`, String(val));
      }
      return rendered;
    }

    case 'knowledge': {
      const queryTemplate = String(node.config.query || context.variables.query || '');
      let renderedQuery = queryTemplate;
      for (const [key, val] of Object.entries(context.variables)) {
        renderedQuery = renderedQuery.replaceAll(`{{${key}}}`, String(val));
      }

      if (!embeddingConfig || !renderedQuery.trim()) {
        return renderedQuery;
      }

      return buildRAGPrompt(
        renderedQuery,
        embeddingConfig,
        Number(node.config.topK || 5),
        typeof node.config.collection === 'string' ? node.config.collection : undefined,
      );
    }

    case 'skill': {
      const skillId = String(node.config.skillId || '');
      const skill = skillId ? getSkill(skillId) : undefined;
      if (!skill) {
        return String(node.config.instructions || 'No skill selected');
      }

      return [
        `Skill: ${skill.name}`,
        skill.description ? `Description: ${skill.description}` : '',
        skill.tags.length ? `Tags: ${skill.tags.join(', ')}` : '',
        Object.keys(skill.input_schema).length > 0 ? `Input Schema:\n${JSON.stringify(skill.input_schema, null, 2)}` : '',
        String(node.config.instructions || ''),
      ].filter(Boolean).join('\n\n');
    }

    case 'parallel': {
      const sourceIds = Array.isArray(node.config.sourceNodeIds)
        ? (node.config.sourceNodeIds as string[])
        : [];
      const outputs = sourceIds.map(sourceId => ({
        nodeId: sourceId,
        output: context.results.get(sourceId),
      }));
      return {
        mode: node.config.mode || 'collect',
        outputs,
      };
    }

    case 'document': {
      const inputNodeId = String(node.config.inputNode || '');
      const input = inputNodeId ? context.results.get(inputNodeId) : Array.from(context.results.values()).at(-1);
      const contentTemplate = String(node.config.contentTemplate || '');
      let content = contentTemplate || String(input ?? '');

      for (const [key, value] of Object.entries(context.variables)) {
        content = content.replaceAll(`{{${key}}}`, String(value));
      }
      for (const [resultNodeId, result] of context.results.entries()) {
        content = content.replaceAll(`{{result.${resultNodeId}}}`, String(result ?? ''));
      }

      const outputPath = String(node.config.outputPath || '').trim();
      if (outputPath) {
        fs.mkdirSync(dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, content, 'utf-8');
        context.logs.push({ nodeId: node.id, type: 'output', message: `Document written to ${outputPath}`, timestamp });
        return { path: outputPath, content };
      }

      context.logs.push({ nodeId: node.id, type: 'output', message: content.substring(0, 200), timestamp });
      return content;
    }

    case 'code': {
      // Execute a simple JS expression
      const code = String(node.config.code || 'return input;');
      const input = context.results.get(String(node.config.inputNode || '')) || context.variables;
      try {
        const fn = new Function('input', 'context', code);
        const result = fn(input, context.variables);
        return result;
      } catch (err: unknown) {
        context.logs.push({ nodeId: node.id, type: 'error', message: String(err), timestamp });
        throw err;
      }
    }

    case 'condition': {
      const condition = String(node.config.condition || 'true');
      const input = context.results.get(String(node.config.inputNode || '')) || context.variables;
      try {
        const fn = new Function('input', 'context', `return ${condition}`);
        return fn(input, context.variables);
      } catch {
        return false;
      }
    }

    default:
      return null;
  }
}

// ── Execute entire workflow ────────────────────────────────────────

export async function executeWorkflow(
  workflowId: string,
  llmConfig: LLMConfig,
  inputVariables?: Record<string, unknown>,
  embeddingConfig?: EmbeddingConfig,
): Promise<ExecutionResult> {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error('Workflow not found');

  const startTime = Date.now();
  const context: ExecutionContext = {
    variables: { ...workflow.variables, ...inputVariables },
    results: new Map(),
    logs: [],
  };

  const runId = generateId();
  dbInsert('workflow_runs', {
    id: runId,
    workflow_id: workflowId,
    status: 'running',
    result: '{}',
    error: '',
  });

  try {
    const order = topologicalSort(workflow.nodes, workflow.edges);
    const incomingEdges = new Map<string, WorkflowEdge[]>();
    const outgoingEdges = new Map<string, WorkflowEdge[]>();

    for (const edge of workflow.edges) {
      if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
      if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
      incomingEdges.get(edge.target)!.push(edge);
      outgoingEdges.get(edge.source)!.push(edge);
    }

    const activatedEdges = new Set<string>();
    const executedNodeIds: string[] = [];

    const shouldExecute = (nodeId: string) => {
      const incoming = incomingEdges.get(nodeId) || [];
      if (incoming.length === 0) return true;
      return incoming.some(edge => activatedEdges.has(edge.id));
    };

    const activateOutgoingEdges = (node: WorkflowNode, result: unknown) => {
      const outgoing = outgoingEdges.get(node.id) || [];
      if (outgoing.length === 0) return;

      if (node.type === 'condition') {
        const branch = Boolean(result);
        let activatedByHandle = false;

        for (const edge of outgoing) {
          if (edge.sourceHandle === 'true' && branch) {
            activatedEdges.add(edge.id);
            activatedByHandle = true;
          } else if (edge.sourceHandle === 'false' && !branch) {
            activatedEdges.add(edge.id);
            activatedByHandle = true;
          }
        }

        // Backward compatibility: legacy condition edges may not define sourceHandle.
        if (!activatedByHandle) {
          for (const edge of outgoing) {
            if (!edge.sourceHandle) {
              activatedEdges.add(edge.id);
            }
          }
        }
        return;
      }

      for (const edge of outgoing) {
        activatedEdges.add(edge.id);
      }
    };

    for (const nodeId of order) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      if (!shouldExecute(nodeId)) {
        context.logs.push({
          nodeId,
          type: 'info',
          message: `Skip node: ${node.label} (branch not activated)`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      const result = await executeNode(node, context, llmConfig, embeddingConfig);
      context.results.set(nodeId, result);
      executedNodeIds.push(nodeId);
      activateOutgoingEdges(node, result);
    }

    const endNodeId = workflow.nodes.find(node => node.type === 'end')?.id;
    const lastExecutedId = executedNodeIds.at(-1);
    const finalResult = (endNodeId && context.results.has(endNodeId))
      ? context.results.get(endNodeId)
      : (lastExecutedId ? context.results.get(lastExecutedId) : Object.fromEntries(context.results));
    const executionTime = Date.now() - startTime;

    dbUpdate('workflow_runs', runId, {
      status: 'completed',
      result: JSON.stringify(finalResult),
      completed_at: new Date().toISOString(),
    });

    return { success: true, output: finalResult, logs: context.logs, executionTimeMs: executionTime };
  } catch (err: unknown) {
    dbUpdate('workflow_runs', runId, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      completed_at: new Date().toISOString(),
    });

    return {
      success: false,
      output: null,
      logs: context.logs,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

export function listWorkflowRuns(workflowId?: string): WorkflowRun[] {
  if (workflowId) {
    return dbAll<WorkflowRun>('workflow_runs', 'workflow_id = ? ORDER BY started_at DESC', [workflowId]);
  }

  return dbQuery<WorkflowRun>('SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT 40');
}

export function buildWorkflowAgentPrompt(workflowId: string): string {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error('Workflow not found');

  const nodeLines = workflow.nodes.map((node, index) => {
    const summary = (() => {
      if (node.type === 'prompt') {
        const promptId = String(node.config.promptId || '');
        const prompt = promptId ? getPrompt(promptId) : undefined;
        return prompt ? `使用 Prompt 模板《${prompt.title}》` : String(node.config.content || node.config.prompt || '执行 Prompt 节点');
      }
      if (node.type === 'knowledge') {
        return `检索知识库，查询：${String(node.config.query || '{{query}}')}`;
      }
      if (node.type === 'skill') {
        const skill = node.config.skillId ? getSkill(String(node.config.skillId)) : undefined;
        return skill ? `调用 Skill《${skill.name}》的能力边界与要求` : '参考选定 Skill 的执行要求';
      }
      if (node.type === 'llm') {
        return String(node.config.prompt || '执行 LLM 推理任务');
      }
      if (node.type === 'code') {
        return '执行结构化转换或后处理';
      }
      if (node.type === 'parallel') {
        return '并行汇总多个上游结果';
      }
      if (node.type === 'document') {
        return `把结果写入文档：${String(node.config.outputPath || '未配置路径')}`;
      }
      if (node.type === 'condition') {
        return `按条件分支：${String(node.config.condition || 'custom condition')}`;
      }
      return node.label;
    })();

    return `${index + 1}. [${node.type}] ${node.label}\n${summary}`;
  });

  return [
    `你是 EasyTerminal 内置 Agent，现在需要严格按照工作流《${workflow.name}》执行任务。`,
    workflow.description ? `工作流说明：${workflow.description}` : '',
    `分类：${workflow.category}`,
    workflow.tags.length ? `标签：${workflow.tags.join('、')}` : '',
    '执行要求：',
    '1. 按照下列步骤顺序执行，必要时先输出阶段结果再继续。',
    '2. 如果某一步需要外部上下文或知识库内容，先显式说明使用了哪一步产物。',
    '3. 最终输出需要明确区分过程结论、可执行内容和后续建议。',
    '',
    '步骤列表：',
    ...nodeLines,
    '',
    '现在请基于用户当前输入，按这个工作流生成内容。',
  ].filter(Boolean).join('\n');
}
