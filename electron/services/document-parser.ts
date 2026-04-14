// Document Parser — Text splitting and chunking for RAG
// Supports Markdown, code files, and plain text

export interface Chunk {
  content: string;
  index: number;
  metadata: Record<string, unknown>;
}

// ── Markdown splitting (by headers) ───────────────────────────────

export function splitMarkdown(text: string, maxChunkSize: number = 1000, overlap: number = 100): Chunk[] {
  const lines = text.split('\n');
  const chunks: Chunk[] = [];
  let currentHeader = '';
  let currentContent: string[] = [];
  let index = 0;

  const flush = () => {
    const content = currentContent.join('\n').trim();
    if (content.length === 0) return;

    if (content.length <= maxChunkSize) {
      chunks.push({ content, index: index++, metadata: { header: currentHeader, type: 'markdown' } });
    } else {
      // Split large sections further
      const subChunks = splitText(content, maxChunkSize, overlap);
      for (const sc of subChunks) {
        chunks.push({ ...sc, index: index++, metadata: { header: currentHeader, type: 'markdown' } });
      }
    }
    currentContent = [];
  };

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      flush();
      currentHeader = line.replace(/^#{1,6}\s+/, '').trim();
      currentContent.push(line);
    } else {
      currentContent.push(line);
    }
  }
  flush();

  return chunks;
}

// ── Code splitting (by functions/classes) ──────────────────────────

export function splitCode(text: string, maxChunkSize: number = 1000, overlap: number = 50): Chunk[] {
  const lines = text.split('\n');
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  let index = 0;
  let currentFunction = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function/class boundaries
    const funcMatch = line.match(/^(export\s+)?(function|class|const|let|var|interface|type|enum)\s+(\w+)/);
    if (funcMatch && currentSize > 0) {
      // Flush current chunk
      const content = currentChunk.join('\n').trim();
      if (content.length > 0) {
        chunks.push({ content, index: index++, metadata: { type: 'code', function: currentFunction } });
      }
      currentChunk = [];
      currentSize = 0;
      currentFunction = funcMatch[3];
    }

    if (!currentFunction && funcMatch) {
      currentFunction = funcMatch[3];
    }

    currentChunk.push(line);
    currentSize += line.length + 1;

    if (currentSize >= maxChunkSize) {
      const content = currentChunk.join('\n').trim();
      if (content.length > 0) {
        chunks.push({ content, index: index++, metadata: { type: 'code', function: currentFunction } });
      }
      // Keep overlap lines
      const overlapLines = currentChunk.slice(-Math.ceil(overlap / 40));
      currentChunk = [...overlapLines];
      currentSize = currentChunk.join('\n').length;
    }
  }

  // Flush remaining
  const content = currentChunk.join('\n').trim();
  if (content.length > 0) {
    chunks.push({ content, index: index++, metadata: { type: 'code', function: currentFunction } });
  }

  return chunks;
}

// ── Plain text splitting (recursive character splitter) ────────────

export function splitText(text: string, maxChunkSize: number = 1000, overlap: number = 100): Chunk[] {
  const chunks: Chunk[] = [];
  const separators = ['\n\n', '\n', '. ', ' ', ''];
  let index = 0;

  function splitRecursive(text: string, sepIdx: number): string[] {
    if (text.length <= maxChunkSize) return [text];
    if (sepIdx >= separators.length) {
      // Hard split by character
      const parts: string[] = [];
      for (let i = 0; i < text.length; i += maxChunkSize - overlap) {
        parts.push(text.substring(i, i + maxChunkSize));
      }
      return parts;
    }

    const sep = separators[sepIdx];
    const parts = text.split(sep);
    const result: string[] = [];
    let current = '';

    for (const part of parts) {
      if (current.length + part.length + sep.length > maxChunkSize && current.length > 0) {
        result.push(current.trim());
        // Keep overlap from end of current
        const words = current.split(' ');
        const overlapText = words.slice(-Math.ceil(overlap / 10)).join(' ');
        current = overlapText + sep + part;
      } else {
        current = current.length > 0 ? current + sep + part : part;
      }
    }
    if (current.trim()) result.push(current.trim());

    // If any chunk is still too large, recurse with next separator
    const needsRecursion = result.some(r => r.length > maxChunkSize);
    if (needsRecursion) {
      return result.flatMap(r =>
        r.length > maxChunkSize ? splitRecursive(r, sepIdx + 1) : [r]
      );
    }
    return result;
  }

  const parts = splitRecursive(text, 0);
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].trim()) {
      chunks.push({ content: parts[i].trim(), index: index++, metadata: { type: 'text' } });
    }
  }

  return chunks;
}

// ── Auto-detect file type and split ────────────────────────────────

export function parseDocument(filename: string, content: string, maxChunkSize: number = 1000, overlap: number = 100): Chunk[] {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['md', 'markdown'].includes(ext)) {
    return splitMarkdown(content, maxChunkSize, overlap);
  }
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'sh'].includes(ext)) {
    return splitCode(content, maxChunkSize, overlap);
  }
  return splitText(content, maxChunkSize, overlap);
}
