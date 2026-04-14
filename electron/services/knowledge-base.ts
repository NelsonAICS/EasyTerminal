// Knowledge Base — Document management, chunking, embedding, and RAG retrieval

import * as fs from 'node:fs';
import * as path from 'node:path';
import { dbAll, dbGet, dbInsert, dbDelete, dbUpdate, dbQuery, dbRun, generateId } from './database';
import { generateEmbedding, type EmbeddingConfig, serializeEmbedding, deserializeEmbedding, cosineSimilarity } from './vector-store';
import { parseDocument, type Chunk } from './document-parser';

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

export interface RetrievalResult {
  chunk: { id: string; content: string; doc_id: string; metadata: Record<string, unknown> };
  doc?: { filename: string; collection: string };
  score: number;
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

  // Parse and chunk the document
  const chunks = parseDocument(filename, content);

  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.content);
  let embeddings: number[][] = [];
  try {
    embeddings = await Promise.all(texts.map(t => generateEmbedding(embeddingConfig, t)));
  } catch {
    // If embedding fails, store chunks without vectors
    embeddings = texts.map(() => []);
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
    const embedding = embeddings[i] && embeddings[i].length > 0
      ? serializeEmbedding(embeddings[i])
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

  return rowToDoc({ ...doc, metadata: doc.metadata } as KnowledgeDocRow);
}

// ── RAG retrieval (semantic search + context injection) ───────────

export async function retrieveContext(
  query: string,
  embeddingConfig: EmbeddingConfig,
  topK: number = 5,
  collection?: string,
): Promise<RetrievalResult[]> {
  // Generate query embedding
  const queryVec = await generateEmbedding(embeddingConfig, query);

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
