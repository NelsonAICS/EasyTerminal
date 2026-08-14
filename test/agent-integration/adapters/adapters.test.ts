import { describe, expect, it } from 'vitest'
import { ClaudeCodeAdapter } from '../../../electron/agent-integration/adapters/claude-code-adapter'
import { CodexAdapter } from '../../../electron/agent-integration/adapters/codex-adapter'
import { GeminiAdapter } from '../../../electron/agent-integration/adapters/gemini-adapter'
import { OpenCodeAdapter } from '../../../electron/agent-integration/adapters/opencode-adapter'
import { TerminalFallbackAdapter } from '../../../electron/agent-integration/adapters/terminal-fallback-adapter'

const event = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  eventId: `event-${Math.random()}`,
  eventType: 'PermissionRequest',
  agentType: 'claude-code',
  source: 'hook' as const,
  terminalSessionId: 'tab-A',
  agentSessionId: 'agent-A',
  instanceId: 'instance-A',
  channelToken: 'token-A',
  interactionId: 'interaction-A',
  toolCallId: 'tool-A',
  revision: 1,
  occurredAt: Date.now(),
  payload: { title: '执行命令', command: 'npm test', options: [{ value: 'safe', label: '安全执行' }] },
  ...overrides,
})

describe('Agent adapters', () => {
  it('ISL-CLAUDE-003 parses PermissionRequest without guessing from prose', () => {
    const parsed = new ClaudeCodeAdapter().parseEvent(event())
    expect(parsed).toMatchObject({ kind: 'permission', interactionId: 'interaction-A', toolCallId: 'tool-A', detail: 'npm test' })
    expect(parsed?.capabilities).toContain('allow_once')
  })

  it('ISL-CLAUDE-004 parses structured AskUserQuestion options and multiple capability', () => {
    const parsed = new ClaudeCodeAdapter().parseEvent(event({ eventType: 'AskUserQuestion', payload: { title: '选择策略', multiSelect: true, options: [{ value: 'compat', label: '保持兼容' }, { value: 'refactor', label: '重构协议' }] } }))
    expect(parsed).toMatchObject({ kind: 'question' })
    expect(parsed?.options.map(option => option.value)).toEqual(['compat', 'refactor'])
    expect(parsed?.capabilities).toContain('answer_multiple')
  })

  it('ISL-CLAUDE-008 removes allow_always when the event does not explicitly support it', () => {
    const parsed = new ClaudeCodeAdapter().parseEvent(event({ payload: { title: '执行命令', allowAlways: false } }))
    expect(parsed?.capabilities).not.toContain('allow_always')
  })

  it('ISL-CODEX-003 parses request_user_input and retains callId', () => {
    const parsed = new CodexAdapter().parseEvent(event({ agentType: 'codex-cli', eventType: 'request_user_input', toolCallId: undefined, payload: { callId: 'call-42', questions: [{ id: 'q1', label: '选择', value: 'a' }] } }))
    expect(parsed).toMatchObject({ kind: 'question', toolCallId: 'call-42' })
  })

  it('ISL-CODEX-006 does not parse ordinary approval prose as an interaction', () => {
    const parsed = new CodexAdapter().parseEvent(event({ agentType: 'codex-cli', eventType: 'text', interactionId: undefined, payload: { text: 'Do you want to continue?' } }))
    expect(parsed).toBeNull()
  })

  it('ISL-ADAPTER-001/002 supports Gemini BeforeTool only', () => {
    const adapter = new GeminiAdapter()
    expect(adapter.parseEvent(event({ agentType: 'gemini-cli', eventType: 'BeforeTool' }))).toMatchObject({ kind: 'permission' })
    expect(adapter.parseEvent(event({ agentType: 'gemini-cli', eventType: 'AfterTool' }))).toBeNull()
  })

  it('ISL-ADAPTER-003/004 supports OpenCode permission and question events', () => {
    const adapter = new OpenCodeAdapter()
    expect(adapter.parseEvent(event({ agentType: 'opencode', eventType: 'PermissionRequest' }))).toMatchObject({ kind: 'permission' })
    expect(adapter.parseEvent(event({ agentType: 'opencode', eventType: 'AskUserQuestion', payload: { options: [{ value: 'one', label: '一' }] } }))).toMatchObject({ kind: 'question' })
  })

  it('ISL-ADAPTER-005 rejects mismatched agent types', () => {
    expect(new ClaudeCodeAdapter().canHandle(event({ agentType: 'codex-cli' }))).toBe(false)
    expect(new CodexAdapter().canHandle(event({ agentType: 'claude-code' }))).toBe(false)
  })

  it('ISL-ADAPTER-006 turns fallback into view-only instead of approval', () => {
    const parsed = new TerminalFallbackAdapter().parseEvent(event({ agentType: 'terminal-fallback', source: 'terminal-fallback', eventType: 'interaction.notification', payload: { title: '终端提示' } }))
    expect(parsed).toMatchObject({ kind: 'notification', responseMode: 'view-only', capabilities: ['jump_to_terminal'] })
  })
})
