// LLM Gateway — Unified multi-vendor LLM API calling layer
// Supports: Anthropic, OpenAI (compatible), Gemini, Ollama

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: LLMToolCall[];
  usage?: { input_tokens: number; output_tokens: number };
  stop_reason?: string;
}

export interface LLMConfig {
  provider: string;       // 'anthropic' | 'openai' | 'gemini' | 'ollama' | provider id
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat?: 'anthropic' | 'openai_chat' | 'openai_responses';
  maxTokens?: number;
  temperature?: number;
}

// ── Unified chat completion ──────────────────────────────────────

export async function chatCompletion(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: LLMTool[],
  systemPrompt?: string,
): Promise<LLMResponse> {
  const format = config.apiFormat || detectFormat(config.provider);

  switch (format) {
    case 'anthropic':
      return callAnthropic(config, messages, tools, systemPrompt);
    case 'openai_chat':
    default:
      return callOpenAI(config, messages, tools, systemPrompt);
  }
}

// ── Format detection ──────────────────────────────────────────────

function detectFormat(provider: string): 'anthropic' | 'openai_chat' {
  if (provider === 'anthropic' || provider === 'minimax' || provider === 'doubao') return 'anthropic';
  if (provider === 'gemini') return 'openai_chat'; // Gemini via OpenAI-compatible endpoint
  return 'openai_chat';
}

// ── Anthropic API ─────────────────────────────────────────────────

async function callAnthropic(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: LLMTool[],
  systemPrompt?: string,
): Promise<LLMResponse> {
  const url = `${config.baseUrl}/v1/messages`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  };

  // Separate system prompt
  const sysParts: string[] = [];
  if (systemPrompt) sysParts.push(systemPrompt);

  // Convert messages to Anthropic format
  const anthropicMsgs: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      sysParts.push(msg.content);
    } else if (msg.role === 'tool') {
      anthropicMsgs.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.tool_call_id, content: msg.content }] });
    } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
      const content: Array<Record<string, unknown>> = msg.tool_calls.map(tc => ({
        type: 'tool_use',
        id: tc.id,
        name: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }));
      if (msg.content) content.unshift({ type: 'text', text: msg.content });
      anthropicMsgs.push({ role: 'assistant', content });
    } else {
      anthropicMsgs.push({ role: msg.role, content: msg.content });
    }
  }

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens || 4096,
    messages: anthropicMsgs,
  };
  if (sysParts.length > 0) body.system = sysParts.join('\n\n');
  if (config.temperature !== undefined) body.temperature = config.temperature;

  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${err.substring(0, 300)}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
    stop_reason: string;
    usage: { input_tokens: number; output_tokens: number };
  };

  let textContent = '';
  const toolCalls: LLMToolCall[] = [];

  for (const block of data.content) {
    if (block.type === 'text' && block.text) {
      textContent += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id || '',
        type: 'function',
        function: { name: block.name || '', arguments: JSON.stringify(block.input || {}) },
      });
    }
  }

  return {
    content: textContent,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: data.usage,
    stop_reason: data.stop_reason,
  };
}

// ── OpenAI-compatible API ─────────────────────────────────────────

async function callOpenAI(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: LLMTool[],
  systemPrompt?: string,
): Promise<LLMResponse> {
  const url = `${config.baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  const openaiMsgs: Array<Record<string, unknown>> = [];
  if (systemPrompt) openaiMsgs.push({ role: 'system', content: systemPrompt });

  for (const msg of messages) {
    if (msg.role === 'tool') {
      openaiMsgs.push({ role: 'tool', tool_call_id: msg.tool_call_id, content: msg.content });
    } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
      openaiMsgs.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls });
    } else {
      openaiMsgs.push({ role: msg.role, content: msg.content });
    }
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: openaiMsgs,
    max_tokens: config.maxTokens || 4096,
  };
  if (config.temperature !== undefined) body.temperature = config.temperature;
  if (tools && tools.length > 0) body.tools = tools;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err.substring(0, 300)}`);
  }

  const data = await res.json() as {
    choices: Array<{
      message: { content: string | null; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> };
      finish_reason: string;
    }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const choice = data.choices?.[0];
  if (!choice) throw new Error('No response from API');

  return {
    content: choice.message.content || '',
    tool_calls: choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    })),
    usage: { input_tokens: data.usage?.prompt_tokens || 0, output_tokens: data.usage?.completion_tokens || 0 },
    stop_reason: choice.finish_reason,
  };
}

// ── Streaming chat (for real-time ReAct status) ───────────────────

export type StreamCallback = (chunk: { type: 'text' | 'tool_call' | 'done'; content: string; tool_call?: LLMToolCall }) => void;

export async function chatCompletionStream(
  config: LLMConfig,
  messages: LLMMessage[],
  onChunk: StreamCallback,
  tools?: LLMTool[],
  systemPrompt?: string,
): Promise<LLMResponse> {
  // For now, use non-streaming and call the callback with the full response
  // True SSE streaming can be added later for better UX
  const response = await chatCompletion(config, messages, tools, systemPrompt);

  if (response.content) {
    onChunk({ type: 'text', content: response.content });
  }
  if (response.tool_calls) {
    for (const tc of response.tool_calls) {
      onChunk({ type: 'tool_call', content: tc.function.name, tool_call: tc });
    }
  }
  onChunk({ type: 'done', content: '' });

  return response;
}

// ── Simple text generation (no tools) ─────────────────────────────

export async function simpleCompletion(
  config: LLMConfig,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const messages: LLMMessage[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const response = await chatCompletion(config, messages);
  return response.content;
}
