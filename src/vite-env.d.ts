/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ElectronAPI {
  agentRespond: (response: InteractionResponseRequest) => Promise<InteractionResponseResult>
  setIslandInteractive: (request: IslandInteractiveRequest) => Promise<{ ok: boolean; focused?: boolean; code?: string }>
  jumpToTerminal: (terminalSessionId: string) => Promise<{ ok: boolean; code?: string }>
  // Preference learning
  'preference:learn-prompt': (prompt: string) => Promise<void>
  'preference:learn-skill': (skillId: string, skillName: string) => Promise<void>
  'preference:learn-language': (language: string) => Promise<void>
  'preference:get': (scope?: string) => Promise<PreferenceRecord[]>
  'preference:build-block': () => Promise<string>
  // Capability registry
  'capability:list': (query?: string, kinds?: string[]) => Promise<CapabilityRecord[]>
  'capability:get': (id: string) => Promise<unknown>
  'capability:invoke': (id: string, input?: Record<string, unknown>) => Promise<CapabilityInvokeResult>
  // Browser
  'browser:send-to-terminal': (text: string) => Promise<boolean>
  'browser:save-history': (data: BrowserHistoryEntry) => Promise<boolean>
  'browser:get-history': (limit?: number) => Promise<BrowserHistoryEntry[]>
  // Unified Search
  'search:unified': (query: string, modules?: string[], topK?: number) => Promise<UnifiedSearchResponse>
  // Workflow Browser
  'workflow:browser-execute': (options: { url: string; script: string; timeout?: number }) => Promise<string>
  workflowV2: {
    list: () => Promise<Array<{ id: string; name: string; description: string; latestRevision: number; status: string; createdAt: string; updatedAt: string }>>
    get: (workflowId: string, revision?: number) => Promise<unknown>
    saveRevision: (definition: unknown) => Promise<unknown>
    execute: (request: unknown) => Promise<{ runId: string; workflowId: string; revision: number }>
    cancel: (runId: string) => Promise<unknown>
    resumeConfirmation: (confirmationId: string, approved: boolean) => Promise<unknown>
    getRun: (runId: string) => Promise<unknown>
    listRuns: (workflowId?: string, limit?: number) => Promise<unknown>
    getPendingConfirmation: (runId: string) => Promise<unknown>
    listDefinitions: () => Promise<unknown>
    onEvent: (handler: (event: unknown) => void) => () => void
    shellCommands: {
      list: () => Promise<unknown>
      saveDraft: (input: unknown) => Promise<unknown>
      test: (input: unknown) => Promise<unknown>
      publish: (input: unknown) => Promise<unknown>
    }
  }
}

interface InteractionResponseRequest {
  interactionId: string
  terminalSessionId: string
  revision: number
  action: string
  value?: string | string[]
  reason?: string
}

interface InteractionResponseResult {
  ok: boolean
  code?: string
  message?: string
}

interface IslandInteractiveRequest {
  interactionId: string
  interactive: boolean
  reason: 'composer-focus' | 'composer-blur' | 'action-complete'
}

interface PreferenceRecord {
  id: string; scope: string; dimension: string; value: string;
  weight: number; sample_count: number; created_at: string; updated_at: string;
}

interface CapabilityRecord {
  id: string; kind: string; title: string; description: string; tags: string[];
  inputSchema: Record<string, unknown>; outputSchema: Record<string, unknown>;
  permissions: string[]; memoryPolicy: MemoryPolicy; entrypoint: EntrypointRef;
}

interface MemoryPolicy {
  captureInput: boolean; captureOutput: boolean; summarizeOutput: boolean; defaultScope: string;
}

interface EntrypointRef {
  type: string; target: string;
}

interface CapabilityInvokeResult {
  capabilityId: string; success: boolean; data?: unknown; error?: string;
}

interface BrowserHistoryEntry {
  id: string; session_id?: string; url: string; title: string; content: string; created_at: string;
}

interface UnifiedSearchResult {
  source: string; id: string; title: string; description: string;
  score: number; metadata: Record<string, unknown>; url?: string;
}

interface UnifiedSearchResponse {
  results: UnifiedSearchResult[];
  totalCount: number; moduleCounts: Record<string, number>;
  query: string; took: number;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export type {}
