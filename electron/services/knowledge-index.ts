export type KnowledgeIndexStatus =
  | 'parsing'
  | 'chunking'
  | 'embedding'
  | 'indexed'
  | 'failed'
  | 'needs_reindex'

export interface KnowledgeIndexIdentity {
  providerId: string
  modelId: string
  dimensions: number | null
  indexVersion: number
  contentHash: string
}

export interface KnowledgeIndexState extends KnowledgeIndexIdentity {
  collection: string
  status: KnowledgeIndexStatus
  totalChunks: number
  embeddedChunks: number
  failedChunks: number
  error: string | null
  updatedAt: string
}

export function createIndexState(
  collection: string,
  identity: Omit<KnowledgeIndexIdentity, 'indexVersion' | 'dimensions'> & { indexVersion?: number; dimensions?: number | null },
): KnowledgeIndexState {
  return {
    collection,
    providerId: identity.providerId,
    modelId: identity.modelId,
    dimensions: identity.dimensions ?? null,
    indexVersion: identity.indexVersion ?? 1,
    contentHash: identity.contentHash,
    status: 'parsing',
    totalChunks: 0,
    embeddedChunks: 0,
    failedChunks: 0,
    error: null,
    updatedAt: new Date().toISOString(),
  }
}

export function transitionIndexState(
  state: KnowledgeIndexState,
  status: KnowledgeIndexStatus,
  patch: Partial<Pick<KnowledgeIndexState, 'totalChunks' | 'embeddedChunks' | 'failedChunks' | 'dimensions' | 'contentHash' | 'error'>> = {},
): KnowledgeIndexState {
  return { ...state, ...patch, status, updatedAt: new Date().toISOString() }
}

export function isIndexCompatible(
  state: KnowledgeIndexState | undefined,
  request: Pick<KnowledgeIndexIdentity, 'providerId' | 'modelId' | 'dimensions'>,
): boolean {
  if (!state || state.status !== 'indexed') return false
  return state.providerId === request.providerId
    && state.modelId === request.modelId
    && (request.dimensions === null || state.dimensions === request.dimensions)
}

export function markNeedsReindex(state: KnowledgeIndexState, reason: string): KnowledgeIndexState {
  return transitionIndexState(state, 'needs_reindex', { error: reason })
}
