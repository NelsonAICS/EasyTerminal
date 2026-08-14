import type { AgentAdapter } from './agent-adapter'
import { ClaudeCodeAdapter } from './claude-code-adapter'
import { CodexAdapter } from './codex-adapter'
import { FakeAgentAdapter } from './fake-agent-adapter'
import { GeminiAdapter } from './gemini-adapter'
import { OpenCodeAdapter } from './opencode-adapter'
import { TerminalFallbackAdapter } from './terminal-fallback-adapter'

export const createDefaultAdapters = (): AgentAdapter[] => [
  new FakeAgentAdapter(),
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
  new OpenCodeAdapter(),
  new TerminalFallbackAdapter(),
]

export type { AgentAdapter } from './agent-adapter'
