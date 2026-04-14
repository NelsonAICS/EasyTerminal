// Embedding Service — Generate embeddings via local Ollama or remote API

export interface EmbeddingConfig {
  source: 'local' | 'provider' | 'custom';
  localUrl?: string;
  providerBaseUrl?: string;
  providerApiKey?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  model: string;
}

// Generate a single embedding vector
export async function generateEmbedding(config: EmbeddingConfig, text: string): Promise<number[]> {
  if (config.source === 'local') {
    return generateLocalEmbedding(config.localUrl || 'http://localhost:11434', config.model, text);
  }

  // Remote API (provider or custom)
  const baseUrl = config.providerBaseUrl || config.customBaseUrl || '';
  const apiKey = config.providerApiKey || config.customApiKey || '';

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model: config.model, input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err.substring(0, 200)}`);
  }

  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

// Generate embeddings in batch
export async function generateEmbeddings(config: EmbeddingConfig, texts: string[]): Promise<number[][]> {
  // Process in batches of 10 to avoid timeout
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += 10) {
    const batch = texts.slice(i, i + 10);
    const batchResults = await Promise.all(batch.map(t => generateEmbedding(config, t)));
    results.push(...batchResults);
  }
  return results;
}

// Local Ollama embedding
async function generateLocalEmbedding(baseUrl: string, model: string, text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama embedding error (${res.status}): ${err.substring(0, 200)}`);
  }

  const data = await res.json() as { embedding: number[] };
  return data.embedding;
}

// ── Vector Store — Cosine similarity search ────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

export interface VectorEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private entries: VectorEntry[] = [];

  add(entry: VectorEntry) {
    const existing = this.entries.findIndex(e => e.id === entry.id);
    if (existing >= 0) {
      this.entries[existing] = entry;
    } else {
      this.entries.push(entry);
    }
  }

  remove(id: string) {
    this.entries = this.entries.filter(e => e.id !== id);
  }

  clear() {
    this.entries = [];
  }

  search(queryEmbedding: number[], topK: number = 5): Array<{ entry: VectorEntry; score: number }> {
    const scored = this.entries.map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  get size(): number {
    return this.entries.length;
  }
}

// ── Serialize / Deserialize embeddings for SQLite BLOB storage ────

export function serializeEmbedding(vec: number[]): Buffer {
  const buf = Buffer.alloc(vec.length * 4);
  for (let i = 0; i < vec.length; i++) {
    buf.writeFloatLE(vec[i], i * 4);
  }
  return buf;
}

export function deserializeEmbedding(buf: Buffer): number[] {
  const vec: number[] = [];
  for (let i = 0; i < buf.length; i += 4) {
    vec.push(buf.readFloatLE(i));
  }
  return vec;
}
