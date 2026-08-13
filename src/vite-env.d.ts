/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

interface ElectronAPI {
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
