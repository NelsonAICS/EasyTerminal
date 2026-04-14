// ReAct Engine — Thought → Action → Observation reasoning loop
// Based on the ReAct paradigm: the LLM thinks, decides which tool to call,
// observes the result, and loops until the task is complete.

import { chatCompletion, type LLMConfig, type LLMMessage, type LLMTool, type LLMToolCall } from './llm-gateway';

export interface ReActTool extends LLMTool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (args: Record<string, any>) => Promise<string>;
}

export interface ReActCallbacks {
  onThought?: (thought: string) => void;
  onAction?: (toolName: string, args: Record<string, unknown>) => void;
  onObservation?: (result: string) => void;
  onComplete?: (finalAnswer: string) => void;
  onError?: (error: string) => void;
}

export interface ReActResult {
  answer: string;
  iterations: number;
  steps: ReActStep[];
  usage: { input_tokens: number; output_tokens: number };
}

export interface ReActStep {
  type: 'thought' | 'action' | 'observation';
  content: string;
  tool?: string;
  args?: Record<string, unknown>;
}

const REACT_SYSTEM_PROMPT = `You are an intelligent AI assistant following the ReAct (Reasoning + Acting) paradigm.

For each user request, you will:
1. THINK: Analyze the current situation and decide what to do next
2. ACT: Call the appropriate tool if needed (use the provided tools)
3. OBSERVE: Process the tool's output

Rules:
- Always think before acting
- Use tools when you need information or need to perform actions
- If you have enough information to answer, respond directly without calling tools
- Be concise but thorough
- If a tool call fails, try an alternative approach
- Maximum reasoning depth: 10 iterations

Available tools will be provided separately. Use them wisely.`;

export async function runReActLoop(
  llmConfig: LLMConfig,
  userQuery: string,
  tools: ReActTool[],
  callbacks?: ReActCallbacks,
  maxIterations: number = 10,
  context?: string,
): Promise<ReActResult> {
  const messages: LLMMessage[] = [];
  const steps: ReActStep[] = [];
  let totalUsage = { input_tokens: 0, output_tokens: 0 };

  // Build system prompt with available tools description
  let systemPrompt = REACT_SYSTEM_PROMPT;
  if (context) {
    systemPrompt += `\n\nAdditional context:\n${context}`;
  }

  // Add user query
  messages.push({ role: 'user', content: userQuery });

  // Prepare tool definitions for LLM
  const toolDefs: LLMTool[] = tools.map(t => ({
    type: 'function',
    function: t.function,
  }));

  // Build tool executor map
  const toolMap = new Map<string, ReActTool>();
  for (const tool of tools) {
    toolMap.set(tool.function.name, tool);
  }

  for (let i = 0; i < maxIterations; i++) {
    let response;
    try {
      response = await chatCompletion(llmConfig, messages, toolDefs, systemPrompt);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'LLM call failed';
      callbacks?.onError?.(errMsg);
      return {
        answer: steps.length > 0 ? steps[steps.length - 1].content : errMsg,
        iterations: i + 1,
        steps,
        usage: totalUsage,
      };
    }

    if (response.usage) {
      totalUsage.input_tokens += response.usage.input_tokens;
      totalUsage.output_tokens += response.usage.output_tokens;
    }

    // If no tool calls, the LLM is done — return the answer
    if (!response.tool_calls || response.tool_calls.length === 0) {
      steps.push({ type: 'thought', content: response.content });
      callbacks?.onComplete?.(response.content);
      return { answer: response.content, iterations: i + 1, steps, usage: totalUsage };
    }

    // Process the assistant's response and tool calls
    messages.push({
      role: 'assistant',
      content: response.content,
      tool_calls: response.tool_calls,
    });

    if (response.content) {
      steps.push({ type: 'thought', content: response.content });
      callbacks?.onThought?.(response.content);
    }

    // Execute each tool call
    for (const tc of response.tool_calls) {
      const toolName = tc.function.name;
      const toolRef = toolMap.get(toolName);
      let args: Record<string, unknown> = {};

      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      steps.push({ type: 'action', content: `Calling ${toolName}`, tool: toolName, args });
      callbacks?.onAction?.(toolName, args);

      let result: string;
      if (toolRef) {
        try {
          result = await toolRef.execute(args);
        } catch (err: unknown) {
          result = `Error executing ${toolName}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      } else {
        result = `Error: Tool "${toolName}" not found.`;
      }

      steps.push({ type: 'observation', content: result });
      callbacks?.onObservation?.(result);

      // Feed the observation back as a tool result
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: tc.id,
      });
    }
  }

  // Max iterations reached — force one more call to get a summary
  const summaryResponse = await chatCompletion(llmConfig, messages, undefined, systemPrompt);
  callbacks?.onComplete?.(summaryResponse.content);

  return { answer: summaryResponse.content, iterations: maxIterations, steps, usage: totalUsage };
}
