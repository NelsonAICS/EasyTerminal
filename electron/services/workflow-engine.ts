// Workflow Engine — DAG-based task execution engine
// Supports topological sort, parallel execution, and state passing between nodes

import { dbAll, dbGet, dbInsert, dbUpdate, dbDelete, dbRun, dbQuery, generateId } from './database';
import { chatCompletion, type LLMConfig } from './llm-gateway';
import { getPrompt, renderPrompt } from './prompt-manager';
import { getSkill } from './skill-manager';
import { buildRAGPrompt } from './knowledge-base';
import { type EmbeddingConfig } from './vector-store';
import { BrowserWindow } from 'electron'
import * as contextStore from './context-store';
import * as fs from 'node:fs';
import { dirname } from 'node:path';

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'llm' | 'skill' | 'knowledge' | 'prompt' | 'condition' | 'parallel' | 'code' | 'document' | 'workflow' | 'context' | 'browser';
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

// ── Browser Execution (shared helper) ──────────────────────────────

export async function executeBrowserScript(options: {
  url: string;
  script: string;
  timeout?: number;
}): Promise<string> {
  const { url, script, timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const bw = new BrowserWindow({
      width: 1024,
      height: 768,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'workflow-browser',
      },
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { bw.destroy(); } catch { /* ignore */ }
        reject(new Error('Browser execution timed out'));
      }
    }, timeout);

    const cleanup = () => {
      clearTimeout(timer);
      try { bw.destroy(); } catch { /* ignore */ }
    };

    const onLoad = () => {
      if (settled) return;
      bw.webContents.executeJavaScript(script).then(result => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(String(result ?? ''));
        }
      }).catch(err => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`Script error: ${String(err)}`));
        }
      });
    };

    const onFail = (_e: Electron.Event, _code: number, desc: string) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`Failed to load: ${desc}`));
      }
    };

    bw.webContents.once('did-finish-load', onLoad);
    bw.webContents.once('did-fail-load', onFail);
    bw.loadURL(url).catch(err => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`Navigation error: ${String(err)}`));
      }
    });
  });
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
  /** Tracks nesting depth for nested workflow calls, prevents infinite recursion */
  nestedDepth: number;
}

export interface ExecutionResult {
  success: boolean;
  output: unknown;
  logs: ExecutionContext['logs'];
  executionTimeMs: number;
}

/** Real-time execution status callback */
export interface ExecutionStatusCallback {
  onNodeStart?: (node: WorkflowNode) => void;
  onNodeComplete?: (node: WorkflowNode, result: unknown) => void;
  onLog?: (log: { nodeId: string; type: 'info' | 'error' | 'output'; message: string; timestamp: string }) => void;
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
  nestedDepth = 0,
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

    case 'context': {
      // Retrieve context records as workflow input
      const query = String(node.config.query || '');
      const limit = Math.max(1, Math.min(Number(node.config.limit) || 10, 100));
      const kind = typeof node.config.kind === 'string' ? node.config.kind : undefined;
      const sourceType = typeof node.config.sourceType === 'string' ? node.config.sourceType : undefined;

      // Interpolate variables into query
      let renderedQuery = query;
      for (const [key, val] of Object.entries(context.variables)) {
        renderedQuery = renderedQuery.replaceAll(`{{${key}}}`, String(val));
      }

      const records = contextStore.queryRecords({
        query: renderedQuery || undefined,
        kind,
        source_type: sourceType,
        limit,
      });

      if (records.length === 0) {
        return 'No context records found.';
      }

      const formatted = records.map(r =>
        `[${r.kind}] ${r.title}\n${r.summary}`
      ).join('\n\n---\n\n');

      context.logs.push({ nodeId: node.id, type: 'output', message: `Retrieved ${records.length} context record(s)`, timestamp });
      return formatted;
    }

    case 'workflow': {
      const MAX_NESTED_DEPTH = 5;
      const subWorkflowId = String(node.config.workflowId || '');
      if (!subWorkflowId) {
        return 'No workflow selected for nested execution.';
      }
      if (nestedDepth >= MAX_NESTED_DEPTH) {
        const msg = `Nested workflow depth limit (${MAX_NESTED_DEPTH}) exceeded. Aborting nested execution of "${subWorkflowId}".`;
        context.logs.push({ nodeId: node.id, type: 'error', message: msg, timestamp });
        throw new Error(msg);
      }

      // Build sub-workflow input variables from context.variables
      const subVariables: Record<string, unknown> = { ...context.variables };
      const extraVars = node.config.variables as Record<string, unknown> | undefined;
      if (extraVars) {
        for (const [key, val] of Object.entries(extraVars)) {
          const rendered = typeof val === 'string'
            ? String(val).replace(/\{\{(\w+)\}\}/g, (_, vk) => String(subVariables[vk] ?? `{{${vk}}}`))
            : val;
          subVariables[key] = rendered;
        }
      }

      const subContext: ExecutionContext = {
        variables: subVariables,
        results: new Map(),
        logs: [],
        nestedDepth: nestedDepth + 1,
      };

      context.logs.push({ nodeId: node.id, type: 'info', message: `Executing nested workflow: ${subWorkflowId} (depth ${nestedDepth + 1})`, timestamp });

      const subResult = await executeWorkflow(subWorkflowId, llmConfig, subVariables, embeddingConfig);
      if (!subResult.success) {
        throw new Error(`Nested workflow "${subWorkflowId}" failed: ${subResult.output}`);
      }

      context.logs.push({
        nodeId: node.id,
        type: 'output',
        message: `Nested workflow "${subWorkflowId}" completed in ${subResult.executionTimeMs}ms`,
        timestamp,
      });

      // Forward sub-workflow output, also copy sub logs into parent context
      for (const log of subResult.logs) {
        if (log.nodeId) {
          context.logs.push({
            ...log,
            nodeId: `${node.id} > ${log.nodeId}`,
          });
        }
      }

      return subResult.output;
    }

    case 'browser': {
      // Execute a script in a browser (via BrowserPanel's webview or dedicated window)
      const url = String(node.config.url || '');
      const script = String(node.config.script || '');
      const selector = String(node.config.selector || '');
      const action = String(node.config.action || 'extract');
      const timeoutMs = Math.max(1000, Math.min(Number(node.config.timeout) || 30000, 60000));

      // Build the extraction script
      let execScript: string;
      if (action === 'extract' && selector) {
        execScript = `
(function() {
  var els = document.querySelectorAll('${selector.replace(/'/g, "\\'")}');
  return Array.from(els).map(function(el) { return el.textContent || el.innerText || ''; }).filter(Boolean).join('\\n');
})()`;
      } else if (action === 'html' && selector) {
        execScript = `
(function() {
  var el = document.querySelector('${selector.replace(/'/g, "\\'")}');
  return el ? el.innerHTML : '';
})()`;
      } else if (script) {
        execScript = script;
      } else {
        execScript = `document.body ? document.body.innerText.substring(0, 5000) : ''`;
      }

      try {
        const result = await executeBrowserScript({ url, script: execScript, timeout: timeoutMs });
        context.logs.push({ nodeId: node.id, type: 'output', message: `Extracted ${result.length} chars`, timestamp });
        return result;
      } catch (err: unknown) {
        const msg = `Browser extraction failed: ${String(err)}`;
        context.logs.push({ nodeId: node.id, type: 'error', message: msg, timestamp });
        return `Error: ${String(err)}`;
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
  statusCallback?: ExecutionStatusCallback,
): Promise<ExecutionResult> {
  const workflow = getWorkflow(workflowId);
  if (!workflow) throw new Error('Workflow not found');

  const startTime = Date.now();
  const context: ExecutionContext = {
    variables: { ...workflow.variables, ...inputVariables },
    results: new Map(),
    logs: [],
    nestedDepth: 0,
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
        statusCallback?.onLog?.({
          nodeId,
          type: 'info',
          message: `Skip node: ${node.label} (branch not activated)`,
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Notify node start
      statusCallback?.onNodeStart?.(node);
      statusCallback?.onLog?.({
        nodeId,
        type: 'info',
        message: `Starting: ${node.label}`,
        timestamp: new Date().toISOString(),
      });

      const result = await executeNode(node, context, llmConfig, embeddingConfig, context.nestedDepth);
      context.results.set(nodeId, result);
      executedNodeIds.push(nodeId);
      activateOutgoingEdges(node, result);

      // Invoke callbacks for real-time status
      statusCallback?.onNodeComplete?.(node, result);
      statusCallback?.onLog?.({
        nodeId,
        type: 'output',
        message: `Completed: ${node.label}`,
        timestamp: new Date().toISOString(),
      });
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

    // Store workflow result to context store
    try {
      const resultStr = typeof finalResult === 'string'
        ? finalResult
        : JSON.stringify(finalResult, null, 2);
      const summary = resultStr.length > 2000 ? resultStr.substring(0, 2000) + '...' : resultStr;
      contextStore.createRecord({
        scope: 'project',
        kind: 'summary',
        title: `[Workflow] ${workflow.name}`,
        summary,
        salience: 0.7,
        status: 'active',
        source_type: 'workflow',
        source_ref: workflowId,
        evidence_refs: [],
      });
    } catch {
      // Non-critical: don't fail workflow execution if context storage fails
    }

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
      if (node.type === 'context') {
        return `从上下文存储检索：${String(node.config.query || '未指定查询')}，类型：${String(node.config.kind || '全部')}`;
      }
      if (node.type === 'browser') {
        return `从网页提取内容：${String(node.config.url || '未指定 URL')}，动作：${String(node.config.action || 'extract')}`;
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
