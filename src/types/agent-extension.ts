export * from './capability';
export * from './ui-intent';

// Agent Extension Types — Shared types for UI components

// ── Prompts ───────────────────────────────────────────────────────
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

// ── Skills ────────────────────────────────────────────────────────
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
  enabled: number;
  created_at: string;
  updated_at: string;
}

// ── Knowledge Base ────────────────────────────────────────────────
export interface KnowledgeDoc {
  id: string;
  collection: string;
  filename: string;
  file_type: string;
  chunk_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RetrievalResult {
  chunk: { id: string; content: string; doc_id: string; metadata: Record<string, unknown> };
  doc?: { filename: string; collection: string };
  score: number;
}

// ── Workflows ─────────────────────────────────────────────────────
export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'llm' | 'skill' | 'knowledge' | 'prompt' | 'condition' | 'parallel' | 'code' | 'document' | 'context' | 'browser' | 'workflow';
  label: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
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

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: string;
  result: string;
  error: string;
  started_at: string;
  completed_at: string | null;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  mtime?: string;
  extension?: string;
}

export interface ContextArtifact {
  id: string;
  type: 'session' | 'snippet' | 'project';
  name: string;
  path: string;
  updatedAt: string;
  size: number;
  preview: string;
  tags: string[];
}

export interface ContextOverview {
  basePath: string;
  sessions: ContextArtifact[];
  snippets: ContextArtifact[];
  projects: ContextArtifact[];
}

export interface MemoryRecord {
  id: string;
  scope: 'global' | 'project' | 'task' | 'session';
  kind: 'goal' | 'constraint' | 'decision' | 'issue' | 'artifact' | 'style' | 'next_step' | 'summary';
  title: string;
  summary: string;
  details?: string;
  salience: number;
  status: 'active' | 'superseded' | 'archived';
  source_type: 'doc' | 'session' | 'tool' | 'workflow' | 'manual';
  source_ref: string;
  evidence_refs: string[];
  created_at: string;
  updated_at: string;
}

export interface ContextSnapshot {
  id: string;
  session_id: string;
  task_id: string;
  version: number;
  summary_block: string;
  token_estimate: number;
  drift_score: number;
  status: 'active' | 'candidate' | 'replaced';
  created_at: string;
  updated_at: string;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  event_type: 'session_start' | 'session_end' | 'user_prompt' | 'tool_call' | 'tool_result' | 'assistant_reply' | 'manual_capture';
  payload: string;
  token_estimate: number;
  created_at: string;
  updated_at: string;
}

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

// ── ReAct ─────────────────────────────────────────────────────────
export interface ReActStep {
  type: 'thought' | 'action' | 'observation';
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
}

export interface ReActResult {
  answer: string;
  iterations: number;
  steps: ReActStep[];
  usage: { input_tokens: number; output_tokens: number };
}

// ── Agent Migration ───────────────────────────────────────────────
export interface AgentMigrationArtifact {
  label: string;
  detail: string;
  count?: number;
}

export interface AgentMigrationWorkspace {
  label: string;
  path: string;
  trustLevel?: string;
}

export interface AgentMigrationSource {
  id: 'claude' | 'codex' | 'openclaw';
  label: string;
  detected: boolean;
  rootPath: string;
  apiConfigured: boolean;
  model?: string;
  reasoningEffort?: string;
  configFiles: string[];
  skills: string[];
  skillsCount: number;
  plugins: string[];
  pluginsCount: number;
  mcpServers: string[];
  mcpCount: number;
  workspaces: AgentMigrationWorkspace[];
  habitSignals: AgentMigrationArtifact[];
  memorySignals: AgentMigrationArtifact[];
  notes: string[];
}

export interface AgentMigrationScan {
  scannedAt: string;
  sources: AgentMigrationSource[];
}
