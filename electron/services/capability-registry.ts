import type {
  CapabilityDefinition,
  CapabilityInvokeResult,
  CapabilityKind,
  CapabilityListOptions,
} from '../../src/types/capability';
import type { ContextOverview, ContextSnapshot, MemoryRecord, SessionEvent, UIIntent } from '../../src/types/agent-extension';
import type { LLMConfig } from './llm-gateway';
import type { EmbeddingConfig } from './vector-store';

import * as promptManager from './prompt-manager';
import * as skillManager from './skill-manager';
import * as knowledgeBase from './knowledge-base';
import * as contextStore from './context-store';

interface CapabilityHandlerContext {
  getLLMConfig: (providerId?: string, model?: string) => LLMConfig | null;
  getEmbeddingConfig: () => EmbeddingConfig;
  listContextArtifacts: () => ContextOverview;
  saveContextSnippet: (content: string, source?: string) => { filePath: string; isSensitive: boolean } | null;
  queryContextRecords: (filters?: Record<string, unknown>) => MemoryRecord[];
  listContextSnapshots: (filters?: Record<string, unknown>) => ContextSnapshot[];
  listSessionEvents: (sessionId: string, limit?: number) => SessionEvent[];
  setUIIntent: (intent: UIIntent) => UIIntent;
  clearUIIntent: () => boolean;
  listWorkflowV2?: (query?: string) => unknown[];
  getWorkflowV2?: (workflowId: string) => unknown;
  executeWorkflowV2?: (workflowId: string, input: Record<string, unknown>) => Promise<unknown>;
}

type CapabilityHandler = (
  input: Record<string, unknown>,
  context: CapabilityHandlerContext,
) => Promise<unknown>;

interface RegisteredCapability {
  definition: CapabilityDefinition;
  invoke: CapabilityHandler;
}

const DEFAULT_MEMORY_POLICY: CapabilityDefinition['memoryPolicy'] = {
  captureInput: true,
  captureOutput: true,
  summarizeOutput: false,
  defaultScope: 'session',
};

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

function searchWorkflows(query: string, list: () => unknown[] = () => []) {
  const normalized = query.trim().toLowerCase();
  const workflows = list();
  if (!normalized) return workflows;
  return workflows.filter((workflow) => {
    if (!workflow || typeof workflow !== 'object') return false;
    const value = workflow as { name?: unknown; description?: unknown; tags?: unknown };
    const tags = Array.isArray(value.tags) ? value.tags.map(String) : [];
    return String(value.name ?? '').toLowerCase().includes(normalized)
      || String(value.description ?? '').toLowerCase().includes(normalized)
      || tags.some((tag) => tag.toLowerCase().includes(normalized));
  });
}

export class CapabilityRegistry {
  private readonly context: CapabilityHandlerContext;
  private readonly capabilities = new Map<string, RegisteredCapability>();

  constructor(context: CapabilityHandlerContext) {
    this.context = context;
  }

  register(definition: CapabilityDefinition, invoke: CapabilityHandler) {
    this.capabilities.set(definition.id, { definition, invoke });
  }

  list(options?: CapabilityListOptions): CapabilityDefinition[] {
    const query = options?.query?.trim().toLowerCase() || '';
    const allowedKinds = options?.kinds ? new Set<CapabilityKind>(options.kinds) : null;

    return Array.from(this.capabilities.values())
      .map(entry => entry.definition)
      .filter(definition => {
        if (allowedKinds && !allowedKinds.has(definition.kind)) return false;
        if (!query) return true;
        return (
          includesQuery(definition.id, query) ||
          includesQuery(definition.title, query) ||
          includesQuery(definition.description, query) ||
          definition.tags.some(tag => includesQuery(tag, query))
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  get(id: string): CapabilityDefinition | undefined {
    return this.capabilities.get(id)?.definition;
  }

  async invoke(id: string, input: Record<string, unknown>): Promise<CapabilityInvokeResult> {
    const capability = this.capabilities.get(id);
    if (!capability) {
      return { capabilityId: id, success: false, error: 'Capability not found' };
    }

    try {
      const data = await capability.invoke(input, this.context);
      return { capabilityId: id, success: true, data };
    } catch (error: unknown) {
      return {
        capabilityId: id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown capability error',
      };
    }
  }
}

export function createDefaultCapabilityRegistry(context: CapabilityHandlerContext) {
  const registry = new CapabilityRegistry(context);

  registry.register(
    {
      id: 'prompt.search',
      kind: 'prompt',
      title: 'Search Prompts',
      description: 'Search saved prompt templates by keyword, title, content, or tags.',
      tags: ['prompt', 'search', 'template'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: DEFAULT_MEMORY_POLICY,
      entrypoint: { type: 'local-js', target: 'promptManager.searchPrompts' },
    },
    async input => promptManager.searchPrompts(String(input.query || '')),
  );

  registry.register(
    {
      id: 'prompt.render',
      kind: 'prompt',
      title: 'Render Prompt',
      description: 'Render a saved prompt template using provided variables.',
      tags: ['prompt', 'render', 'template'],
      inputSchema: {
        type: 'object',
        properties: {
          promptId: { type: 'string' },
          values: { type: 'object' },
        },
        required: ['promptId'],
      },
      outputSchema: {
        type: 'string',
      },
      permissions: [],
      memoryPolicy: DEFAULT_MEMORY_POLICY,
      entrypoint: { type: 'local-js', target: 'promptManager.renderPrompt' },
    },
    async input => promptManager.renderPrompt(String(input.promptId || ''), (input.values || {}) as Record<string, string>),
  );

  registry.register(
    {
      id: 'prompt.optimize',
      kind: 'prompt',
      title: 'Optimize Prompt',
      description: 'Rewrite a draft prompt using the configured reasoning model.',
      tags: ['prompt', 'optimize', 'llm'],
      inputSchema: {
        type: 'object',
        properties: {
          draftPrompt: { type: 'string' },
          providerId: { type: 'string' },
          model: { type: 'string' },
        },
        required: ['draftPrompt'],
      },
      outputSchema: {
        type: 'string',
      },
      permissions: [],
      memoryPolicy: DEFAULT_MEMORY_POLICY,
      entrypoint: { type: 'local-js', target: 'promptManager.optimizePrompt' },
    },
    async (input, runtime) => {
      const llmConfig = runtime.getLLMConfig(
        typeof input.providerId === 'string' ? input.providerId : undefined,
        typeof input.model === 'string' ? input.model : undefined,
      );
      if (!llmConfig) throw new Error('No reasoning model configured');
      return promptManager.optimizePrompt(llmConfig, String(input.draftPrompt || ''));
    },
  );

  registry.register(
    {
      id: 'skill.search',
      kind: 'skill',
      title: 'Search Skills',
      description: 'Search indexed skills by semantic similarity using the configured embedding model.',
      tags: ['skill', 'search', 'embedding'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          topK: { type: 'number' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: DEFAULT_MEMORY_POLICY,
      entrypoint: { type: 'local-js', target: 'skillManager.searchSkills' },
    },
    async (input, runtime) => {
      const topK = typeof input.topK === 'number' ? input.topK : Number(input.topK || 5);
      return skillManager.searchSkills(String(input.query || ''), runtime.getEmbeddingConfig(), topK);
    },
  );

  registry.register(
    {
      id: 'skill.get',
      kind: 'skill',
      title: 'Get Skill',
      description: 'Get a skill definition and metadata by id.',
      tags: ['skill', 'metadata'],
      inputSchema: {
        type: 'object',
        properties: {
          skillId: { type: 'string' },
        },
        required: ['skillId'],
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: DEFAULT_MEMORY_POLICY,
      entrypoint: { type: 'local-js', target: 'skillManager.getSkill' },
    },
    async input => {
      const skill = skillManager.getSkill(String(input.skillId || ''));
      if (!skill) throw new Error('Skill not found');
      return skill;
    },
  );

  registry.register(
    {
      id: 'workflow.search',
      kind: 'workflow',
      title: 'Search Workflows',
      description: 'Search workflows by name, description, or tags.',
      tags: ['workflow', 'search', 'dag'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'workflowV2.listWorkflows' },
    },
    async (input, runtime) => searchWorkflows(String(input.query || ''), () => runtime.listWorkflowV2?.() ?? []),
  );

  registry.register(
    {
      id: 'workflow.get',
      kind: 'workflow',
      title: 'Get Workflow',
      description: 'Get workflow details by id.',
      tags: ['workflow', 'metadata', 'dag'],
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'workflowV2.getWorkflow' },
    },
    async (input, runtime) => {
      const workflow = runtime.getWorkflowV2?.(String(input.workflowId || ''));
      if (!workflow) throw new Error('Workflow not found');
      return workflow;
    },
  );

  registry.register(
    {
      id: 'workflow.execute',
      kind: 'workflow',
      title: 'Execute Workflow',
      description: 'Execute a workflow using the configured reasoning and embedding models.',
      tags: ['workflow', 'execute', 'dag'],
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
          variables: { type: 'object' },
          providerId: { type: 'string' },
          model: { type: 'string' },
        },
        required: ['workflowId'],
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'workflowV2.start' },
    },
    async (input, runtime) => {
      if (!runtime.executeWorkflowV2) throw new Error('Workflow V2 runtime is not ready');
      return runtime.executeWorkflowV2(String(input.workflowId || ''), (input.input || input.variables || {}) as Record<string, unknown>);
    },
  );

  registry.register(
    {
      id: 'knowledge.search',
      kind: 'knowledge',
      title: 'Search Knowledge Base',
      description: 'Retrieve the most relevant chunks from the local knowledge base.',
      tags: ['knowledge', 'rag', 'search'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          topK: { type: 'number' },
          collection: { type: 'string' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'knowledgeBase.retrieveContext' },
    },
    async (input, runtime) => {
      const topK = typeof input.topK === 'number' ? input.topK : Number(input.topK || 5);
      return knowledgeBase.retrieveContext(
        String(input.query || ''),
        runtime.getEmbeddingConfig(),
        topK,
        typeof input.collection === 'string' ? input.collection : undefined,
      );
    },
  );

  registry.register(
    {
      id: 'knowledge.build_context',
      kind: 'knowledge',
      title: 'Build Knowledge Context',
      description: 'Build a RAG-enhanced prompt from local knowledge base documents.',
      tags: ['knowledge', 'rag', 'prompt'],
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          topK: { type: 'number' },
          collection: { type: 'string' },
        },
        required: ['query'],
      },
      outputSchema: {
        type: 'string',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'knowledgeBase.buildRAGPrompt' },
    },
    async (input, runtime) => {
      const topK = typeof input.topK === 'number' ? input.topK : Number(input.topK || 5);
      return knowledgeBase.buildRAGPrompt(
        String(input.query || ''),
        runtime.getEmbeddingConfig(),
        topK,
        typeof input.collection === 'string' ? input.collection : undefined,
      );
    },
  );

  registry.register(
    {
      id: 'context.list',
      kind: 'context',
      title: 'List Context Artifacts',
      description: 'List saved session logs, snippets, and project context artifacts.',
      tags: ['context', 'vault', 'artifacts'],
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'contextManager.listArtifacts' },
    },
    async (_input, runtime) => runtime.listContextArtifacts(),
  );

  registry.register(
    {
      id: 'context.capture',
      kind: 'context',
      title: 'Capture Context Snippet',
      description: 'Save a snippet into the local context vault.',
      tags: ['context', 'vault', 'snippet'],
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['content'],
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'contextManager.saveContextSnippet' },
    },
    async (input, runtime) => runtime.saveContextSnippet(String(input.content || ''), typeof input.source === 'string' ? input.source : undefined),
  );

  registry.register(
    {
      id: 'context.records',
      kind: 'context',
      title: 'List Context Records',
      description: 'List structured context memory records by scope, kind, or query.',
      tags: ['context', 'records', 'memory'],
      inputSchema: {
        type: 'object',
        properties: {
          scope: { type: 'string' },
          kind: { type: 'string' },
          status: { type: 'string' },
          query: { type: 'string' },
          limit: { type: 'number' },
        },
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'contextStore.queryRecords' },
    },
    async (input, runtime) => runtime.queryContextRecords(input),
  );

  registry.register(
    {
      id: 'context.snapshots',
      kind: 'context',
      title: 'List Context Snapshots',
      description: 'List saved context snapshots by session, task, or status.',
      tags: ['context', 'snapshots', 'memory'],
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          taskId: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number' },
        },
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, summarizeOutput: true, defaultScope: 'project' },
      entrypoint: { type: 'local-js', target: 'contextStore.listSnapshots' },
    },
    async (input, runtime) => runtime.listContextSnapshots(input),
  );

  registry.register(
    {
      id: 'context.session_events',
      kind: 'context',
      title: 'List Session Events',
      description: 'List recent structured session events for a given session id.',
      tags: ['context', 'session', 'events'],
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['sessionId'],
      },
      outputSchema: {
        type: 'array',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, summarizeOutput: true, defaultScope: 'session' },
      entrypoint: { type: 'local-js', target: 'contextStore.listSessionEvents' },
    },
    async (input, runtime) => runtime.listSessionEvents(
      String(input.sessionId || ''),
      typeof input.limit === 'number' ? input.limit : Number(input.limit || 50),
    ),
  );

  registry.register(
    {
      id: 'ui.present_result',
      kind: 'ui',
      title: 'Present Result Panel',
      description: 'Render a result panel in the EasyTerminal UI using the UI intent channel.',
      tags: ['ui', 'intent', 'result'],
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          payload: { type: 'object' },
        },
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, captureOutput: false, summarizeOutput: false, defaultScope: 'session' },
      entrypoint: { type: 'ipc', target: 'ui:intent:set' },
    },
    async (input, runtime) => runtime.setUIIntent({
      id: `ui_intent_${Date.now()}`,
      type: 'show_result_panel',
      title: typeof input.title === 'string' ? input.title : 'Agent 返回',
      description: typeof input.description === 'string' ? input.description : '通过 UI Intent 渲染的结构化结果。',
      payload: (input.payload || {}) as Record<string, unknown>,
    }),
  );

  registry.register(
    {
      id: 'ui.show_context_snapshot',
      kind: 'ui',
      title: 'Show Context Snapshot',
      description: 'Render a context snapshot in the EasyTerminal UI using the UI intent channel.',
      tags: ['ui', 'intent', 'context', 'snapshot'],
      inputSchema: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['snapshotId'],
      },
      outputSchema: {
        type: 'object',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, captureOutput: false, summarizeOutput: false, defaultScope: 'session' },
      entrypoint: { type: 'ipc', target: 'ui:intent:set' },
    },
    async (input, runtime) => {
      const snapshotId = String(input.snapshotId || '');
      const snapshot = contextStore.listSnapshots({ limit: 200 }).find(item => item.id === snapshotId);
      if (!snapshot) throw new Error('Snapshot not found');
      return runtime.setUIIntent({
        id: `ui_snapshot_${snapshot.id}`,
        type: 'show_context_snapshot',
        title: typeof input.title === 'string' ? input.title : `上下文快照 v${snapshot.version}`,
        description: '通过 UI Intent 渲染的上下文快照。',
        payload: {
          snapshotId: snapshot.id,
          sessionId: snapshot.session_id,
          taskId: snapshot.task_id,
          status: snapshot.status,
          driftScore: snapshot.drift_score,
          summary: snapshot.summary_block,
        },
      });
    },
  );

  registry.register(
    {
      id: 'ui.clear_intent',
      kind: 'ui',
      title: 'Clear UI Intent',
      description: 'Clear the current UI intent panel.',
      tags: ['ui', 'intent', 'clear'],
      inputSchema: {
        type: 'object',
        properties: {},
      },
      outputSchema: {
        type: 'boolean',
      },
      permissions: [],
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY, captureInput: false, captureOutput: false, summarizeOutput: false, defaultScope: 'session' },
      entrypoint: { type: 'ipc', target: 'ui:intent:clear' },
    },
    async (_input, runtime) => runtime.clearUIIntent(),
  );

  return registry;
}
