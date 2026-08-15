// Knowledge Base — Document management, chunking, embedding, and RAG retrieval

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { dbAll, dbGet, dbInsert, dbDelete, dbQuery, dbRun, generateId } from './database';
import { generateEmbedding, type EmbeddingConfig, serializeEmbedding, deserializeEmbedding, cosineSimilarity } from './vector-store';
import { parseDocument } from './document-parser';
import {
  createIndexState,
  isIndexCompatible,
  markNeedsReindex,
  transitionIndexState,
  type KnowledgeIndexState,
} from './knowledge-index';

export interface KnowledgeDoc {
  id: string;
  collection: string;
  filename: string;
  file_type: string;
  content: string;
  chunk_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface KnowledgeDocRow {
  id: string;
  collection: string;
  filename: string;
  file_type: string;
  content: string;
  chunk_count: number;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeChunkRow {
  id: string;
  doc_id: string;
  content: string;
  chunk_index: number;
  embedding: Buffer | null;
  metadata: string;
}

interface KnowledgeIndexRow {
  collection: string;
  provider_id: string;
  model_id: string;
  dimensions: number | null;
  index_version: number;
  content_hash: string;
  status: KnowledgeIndexState['status'];
  total_chunks: number;
  embedded_chunks: number;
  failed_chunks: number;
  error: string | null;
  updated_at: string;
}

export interface RetrievalResult {
  chunk: { id: string; content: string; doc_id: string; metadata: Record<string, unknown> };
  doc?: { filename: string; collection: string };
  score: number;
}

export interface WorkflowRetrievalResult {
  query: string;
  contextText: string;
  chunks: Array<{
    id: string;
    documentId: string;
    content: string;
    score: number;
    source: string;
    metadata: Record<string, unknown>;
  }>;
  citations: Array<{ chunkId: string; documentId: string; source: string; score: number }>;
  truncated: boolean;
}

function indexIdentity(config: EmbeddingConfig) {
  return {
    providerId: config.providerId || config.source,
    modelId: config.model,
  };
}

function contentHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function rowToIndex(row: KnowledgeIndexRow): KnowledgeIndexState {
  return {
    collection: row.collection,
    providerId: row.provider_id,
    modelId: row.model_id,
    dimensions: row.dimensions,
    indexVersion: row.index_version,
    contentHash: row.content_hash,
    status: row.status,
    totalChunks: row.total_chunks,
    embeddedChunks: row.embedded_chunks,
    failedChunks: row.failed_chunks,
    error: row.error,
    updatedAt: row.updated_at,
  };
}

function getIndexState(collection: string): KnowledgeIndexState | undefined {
  const row = dbQuery<KnowledgeIndexRow>('SELECT * FROM knowledge_index_states WHERE collection = ?', [collection])[0];
  return row ? rowToIndex(row) : undefined;
}

function saveIndexState(state: KnowledgeIndexState): void {
  dbRun(`
    INSERT INTO knowledge_index_states
      (collection, provider_id, model_id, dimensions, index_version, content_hash,
       status, total_chunks, embedded_chunks, failed_chunks, error, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(collection) DO UPDATE SET
      provider_id = excluded.provider_id,
      model_id = excluded.model_id,
      dimensions = excluded.dimensions,
      index_version = excluded.index_version,
      content_hash = excluded.content_hash,
      status = excluded.status,
      total_chunks = excluded.total_chunks,
      embedded_chunks = excluded.embedded_chunks,
      failed_chunks = excluded.failed_chunks,
      error = excluded.error,
      updated_at = excluded.updated_at
  `, [
    state.collection,
    state.providerId,
    state.modelId,
    state.dimensions,
    state.indexVersion,
    state.contentHash,
    state.status,
    state.totalChunks,
    state.embeddedChunks,
    state.failedChunks,
    state.error,
  ]);
}

function assertIndexCompatible(collection: string, config: EmbeddingConfig, dimensions: number | null = null): KnowledgeIndexState | undefined {
  const state = getIndexState(collection);
  if (!state) return undefined;
  const identity = indexIdentity(config);
  if (!isIndexCompatible(state, { ...identity, dimensions })) {
    throw new Error(`Knowledge index for ${collection} requires reindexing for ${identity.providerId}/${identity.modelId}`);
  }
  return state;
}

function rowToDoc(row: KnowledgeDocRow): KnowledgeDoc {
  return {
    ...row,
    metadata: JSON.parse(row.metadata || '{}'),
  };
}

// ── Add a document to the knowledge base ──────────────────────────

export async function addDocument(
  filePath: string,
  embeddingConfig: EmbeddingConfig,
  collection: string = 'default',
): Promise<KnowledgeDoc> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const docId = generateId();

  const identity = indexIdentity(embeddingConfig);
  const existingIndex = getIndexState(collection);
  if (existingIndex && (existingIndex.providerId !== identity.providerId || existingIndex.modelId !== identity.modelId)) {
    const needsReindex = markNeedsReindex(existingIndex, 'Embedding provider/model changed; rebuild the collection before adding documents');
    saveIndexState(needsReindex);
    throw new Error(needsReindex.error || 'Knowledge index requires reindexing');
  }
  let indexState = existingIndex ?? createIndexState(collection, {
    ...identity,
    contentHash: '',
  });
  saveIndexState(indexState);

  // Parse and chunk the document
  const chunks = parseDocument(filename, content);
  indexState = transitionIndexState(indexState, 'chunking', { totalChunks: chunks.length, contentHash: contentHash(`${collection}:${filename}:${content}`) });
  saveIndexState(indexState);

  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.content);
  indexState = transitionIndexState(indexState, 'embedding');
  saveIndexState(indexState);
  const embeddings: Array<number[] | null> = await Promise.all(texts.map(async (text) => {
    try { return await generateEmbedding(embeddingConfig, text); } catch { return null; }
  }));
  const successful = embeddings.filter((embedding): embedding is number[] => Boolean(embedding?.length));
  const dimensions = successful[0]?.length ?? null;
  const inconsistentDimensions = successful.some((embedding) => embedding.length !== dimensions);
  if (inconsistentDimensions) {
    indexState = transitionIndexState(indexState, 'failed', {
      dimensions,
      embeddedChunks: 0,
      failedChunks: chunks.length,
      error: 'Embedding dimensions changed within one index build',
    });
    saveIndexState(indexState);
  }

  // Insert document record
  const doc = {
    id: docId,
    collection,
    filename,
    file_type: ext,
    content,
    chunk_count: chunks.length,
    metadata: JSON.stringify({ path: filePath, size: content.length }),
  };
  dbInsert('knowledge_docs', doc);

  // Insert chunks with embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunkId = generateId();
    const embedding = embeddings[i] && embeddings[i]!.length > 0 && !inconsistentDimensions
      ? serializeEmbedding(embeddings[i]!)
      : null;

    dbInsert('knowledge_chunks', {
      id: chunkId,
      doc_id: docId,
      content: chunks[i].content,
      chunk_index: chunks[i].index,
      embedding,
      metadata: JSON.stringify(chunks[i].metadata),
    });
  }

  if (!inconsistentDimensions) {
    const failedChunks = embeddings.filter((embedding) => !embedding?.length).length;
    indexState = transitionIndexState(indexState, failedChunks ? 'failed' : 'indexed', {
      dimensions,
      embeddedChunks: chunks.length - failedChunks,
      failedChunks,
      error: failedChunks ? `${failedChunks} chunk(s) failed to embed` : null,
    });
    saveIndexState(indexState);
  }

  return rowToDoc({ ...doc, metadata: doc.metadata } as KnowledgeDocRow);
}

// ── RAG retrieval (semantic search + context injection) ───────────

export async function retrieveContext(
  query: string,
  embeddingConfig: EmbeddingConfig,
  topK: number = 5,
  collection?: string,
): Promise<RetrievalResult[]> {
  const indexState = assertIndexCompatible(collection || 'default', embeddingConfig);
  // Generate query embedding
  const queryVec = await generateEmbedding(embeddingConfig, query);
  if (indexState && indexState.dimensions !== null && indexState.dimensions !== queryVec.length) {
    const needsReindex = markNeedsReindex(indexState, 'Query embedding dimensions do not match the indexed model');
    saveIndexState(needsReindex);
    throw new Error(needsReindex.error || 'Knowledge index requires reindexing');
  }

  // Get all chunks with embeddings (optionally filtered by collection)
  let rows: KnowledgeChunkRow[];
  if (collection) {
    rows = dbQuery<KnowledgeChunkRow>(
      `SELECT kc.* FROM knowledge_chunks kc
       JOIN knowledge_docs kd ON kc.doc_id = kd.id
       WHERE kc.embedding IS NOT NULL AND kd.collection = ?`,
      [collection]
    );
  } else {
    rows = dbQuery<KnowledgeChunkRow>(
      'SELECT * FROM knowledge_chunks WHERE embedding IS NOT NULL'
    );
  }

  // Compute similarity scores
  const scored = rows.map(row => {
    const embedding = deserializeEmbedding(row.embedding!);
    return {
      row,
      score: cosineSimilarity(queryVec, embedding),
    };
  });

  // Sort by score, take top K
  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, topK);

  // Enrich with document metadata
  return topResults.map(({ row, score }) => {
    const doc = dbGet<KnowledgeDocRow>('knowledge_docs', row.doc_id);
    return {
      chunk: {
        id: row.id,
        content: row.content,
        doc_id: row.doc_id,
        metadata: JSON.parse(row.metadata || '{}'),
      },
      doc: doc ? { filename: doc.filename, collection: doc.collection } : undefined,
      score,
    };
  });
}

export async function retrieveWorkflowContext(
  query: string,
  embeddingConfig: EmbeddingConfig,
  topK = 5,
  collection?: string,
): Promise<WorkflowRetrievalResult> {
  const results = await retrieveContext(query, embeddingConfig, topK, collection);
  const chunks = results.map((result) => ({
    id: result.chunk.id,
    documentId: result.chunk.doc_id,
    content: result.chunk.content,
    score: result.score,
    source: result.doc?.filename || 'unknown',
    metadata: result.chunk.metadata,
  }));
  return {
    query,
    contextText: chunks.map((chunk, index) => `[${index + 1}] ${chunk.source}\n${chunk.content}`).join('\n\n---\n\n'),
    chunks,
    citations: chunks.map((chunk) => ({ chunkId: chunk.id, documentId: chunk.documentId, source: chunk.source, score: chunk.score })),
    truncated: false,
  };
}

// ── Build RAG-enhanced prompt ─────────────────────────────────────

export async function buildRAGPrompt(
  query: string,
  embeddingConfig: EmbeddingConfig,
  topK: number = 5,
  collection?: string,
): Promise<string> {
  const results = await retrieveContext(query, embeddingConfig, topK, collection);

  if (results.length === 0) return query;

  const contextBlock = results
    .map((r, i) => `[${i + 1}] (Source: ${r.doc?.filename || 'unknown'}, relevance: ${(r.score * 100).toFixed(1)}%)\n${r.chunk.content}`)
    .join('\n\n---\n\n');

  return `Based on the following context documents:\n\n${contextBlock}\n\n---\n\nQuestion: ${query}\n\nPlease answer based on the provided context. If the context doesn't contain relevant information, say so.`;
}

// ── CRUD ──────────────────────────────────────────────────────────

export function listDocuments(collection?: string): KnowledgeDoc[] {
  const rows = collection
    ? dbAll<KnowledgeDocRow>('knowledge_docs', 'collection = ?', [collection])
    : dbAll<KnowledgeDocRow>('knowledge_docs');
  return rows.map(rowToDoc);
}

export function getDocument(id: string): KnowledgeDoc | undefined {
  const row = dbGet<KnowledgeDocRow>('knowledge_docs', id);
  return row ? rowToDoc(row) : undefined;
}

export function deleteDocument(id: string) {
  // Delete chunks first
  dbRun('DELETE FROM knowledge_chunks WHERE doc_id = ?', [id]);
  dbDelete('knowledge_docs', id);
}

export function getCollections(): string[] {
  const rows = dbQuery<{ collection: string }>('SELECT DISTINCT collection FROM knowledge_docs');
  return rows.map(r => r.collection);
}
