export type CapabilityKind =
  | 'prompt'
  | 'skill'
  | 'workflow'
  | 'knowledge'
  | 'context'
  | 'ui';

export interface CapabilityMemoryPolicy {
  captureInput: boolean;
  captureOutput: boolean;
  summarizeOutput: boolean;
  defaultScope: 'session' | 'task' | 'project' | 'global';
}

export interface CapabilityEntrypoint {
  type: 'ipc' | 'local-js' | 'http' | 'mcp';
  target: string;
}

export interface CapabilityDefinition {
  id: string;
  kind: CapabilityKind;
  title: string;
  description: string;
  tags: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  permissions: string[];
  memoryPolicy: CapabilityMemoryPolicy;
  entrypoint: CapabilityEntrypoint;
}

export interface CapabilityListOptions {
  query?: string;
  kinds?: CapabilityKind[];
}

export interface CapabilityInvokeResult<T = unknown> {
  capabilityId: string;
  success: boolean;
  data?: T;
  error?: string;
}
