const KNOWN_FINAL_ENDPOINT_PATTERNS = [
  /\/v1\/messages(?:[/?#]|$)/i,
  /\/chat\/completions(?:[/?#]|$)/i,
  /\/embeddings(?:[/?#]|$)/i,
  /\/api\/embeddings(?:[/?#]|$)/i,
  /\/chat(?:[/?#]|$)/i,
  /\/models\/[^/?#]+:generateContent(?:[?#]|$)/i,
];

function splitUrl(url: string): { path: string; query: string; hash: string } {
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  return { path, query, hash };
}

function trimTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '');
}

function joinPath(baseUrl: string, suffix: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return suffix;

  const { path, query, hash } = splitUrl(trimmed);
  const normalizedPath = trimTrailingSlash(path);
  const normalizedSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${normalizedPath}${normalizedSuffix}${query}${hash}`;
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function resolveExplicitEndpoint(baseUrl: string, endpointOverride?: string): string | null {
  const trimmed = endpointOverride?.trim();
  if (!trimmed) return null;
  return isAbsoluteUrl(trimmed) ? trimmed : joinPath(baseUrl, trimmed);
}

export function hasKnownFinalEndpoint(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return KNOWN_FINAL_ENDPOINT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function resolveAnthropicMessagesEndpoint(baseUrl: string, endpointOverride?: string): string {
  const explicit = resolveExplicitEndpoint(baseUrl, endpointOverride);
  if (explicit) return explicit;
  return hasKnownFinalEndpoint(baseUrl) ? baseUrl.trim() : joinPath(baseUrl, '/v1/messages');
}

export function resolveOpenAIChatEndpoint(baseUrl: string, endpointOverride?: string): string {
  const explicit = resolveExplicitEndpoint(baseUrl, endpointOverride);
  if (explicit) return explicit;
  return hasKnownFinalEndpoint(baseUrl) ? baseUrl.trim() : joinPath(baseUrl, '/chat/completions');
}

export function resolveOllamaChatEndpoint(baseUrl: string, endpointOverride?: string): string {
  const explicit = resolveExplicitEndpoint(baseUrl, endpointOverride);
  if (explicit) return explicit;
  return hasKnownFinalEndpoint(baseUrl) ? baseUrl.trim() : joinPath(baseUrl, '/chat');
}

export function resolveEmbeddingEndpoint(baseUrl: string, endpointOverride?: string): string {
  const explicit = resolveExplicitEndpoint(baseUrl, endpointOverride);
  if (explicit) return explicit;
  return hasKnownFinalEndpoint(baseUrl) ? baseUrl.trim() : joinPath(baseUrl, '/embeddings');
}

export function resolveGeminiGenerateContentEndpoint(baseUrl: string, model: string, apiKey?: string, endpointOverride?: string): string {
  const explicit = resolveExplicitEndpoint(baseUrl, endpointOverride);
  const trimmed = baseUrl.trim();
  const baseEndpoint = explicit || (
    hasKnownFinalEndpoint(trimmed)
      ? trimmed
      : joinPath(trimmed, `/models/${model}:generateContent`)
  );

  if (!apiKey) {
    return baseEndpoint;
  }

  if (/[?&]key=/.test(baseEndpoint)) {
    return baseEndpoint;
  }

  return `${baseEndpoint}${baseEndpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
}
