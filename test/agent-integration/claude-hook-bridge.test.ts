import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHookServer } from '../../electron/agent-integration/hook-server'
import { ClaudeCodeAdapter } from '../../electron/agent-integration/adapters/claude-code-adapter'
import { createSessionStore } from '../../electron/agent-integration/session-store'
import { createTerminalSessionRegistry } from '../../electron/agent-integration/terminal-session-registry'
import { CLAUDE_CODE_HOOK_SCRIPT, installClaudeCodeHook } from '../../electron/agent-integration/claude-code-hook'
import { createInteractionCoordinator } from '../../electron/agent-integration/interaction-coordinator'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe('Claude Code Hook bridge', () => {
  it('installs the executable bridge into the official Claude settings file', () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-claude-hook-install-'))
    temporaryDirectories.push(directory)
    const result = installClaudeCodeHook({
      homePath: path.join(directory, 'home'),
      userDataPath: path.join(directory, 'user-data'),
      platform: 'darwin',
    })
    const settings = JSON.parse(fs.readFileSync(path.join(directory, 'home', '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>
    const mode = fs.statSync(result.scriptPath).mode & 0o777

    expect(mode & 0o111).toBeTruthy()
    expect(settings.hooks).toMatchObject({
      PermissionRequest: [{ matcher: '*', hooks: [{ type: 'command', command: result.hookCommand, timeout: 600 }] }],
      PreToolUse: [{ matcher: 'AskUserQuestion', hooks: [{ type: 'command', command: result.hookCommand, timeout: 600 }] }],
    })
  })

  it('ISL-E2E-CLAUDE-002 forwards PermissionRequest and returns the Island decision', async () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-claude-hook-'))
    temporaryDirectories.push(directory)
    const scriptPath = path.join(directory, 'claude-hook.mjs')
    const socketPath = path.join(directory, 'hook.sock')
    fs.writeFileSync(scriptPath, CLAUDE_CODE_HOOK_SCRIPT, { mode: 0o700 })

    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-A', instanceId: 'instance-A' })
    const store = createSessionStore()
    let interactionId = ''
    const adapter = new ClaudeCodeAdapter()
    const coordinator = createInteractionCoordinator({
      store,
      registry,
      adapters: [adapter],
      transport: {
        sendHook: (payload, interaction) => server.sendResponse(payload, interaction),
        writePty: vi.fn(),
      },
    })
    const server = createHookServer({
      socketPath,
      registry,
      store,
      adapters: [adapter],
      onInteraction: receivedInteractionId => {
        interactionId = receivedInteractionId
        const interaction = store.getInteraction(receivedInteractionId)
        if (interaction) setTimeout(() => void coordinator.submit({
          interactionId: receivedInteractionId,
          terminalSessionId: interaction.terminalSessionId,
          revision: interaction.revision,
          action: 'allow_once',
        }), 0)
      },
      onAck: event => coordinator.handleAck(event),
    })
    await server.start()

    const child = (await import('node:child_process')).spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        EASYTERMINAL_TERMINAL_SESSION_ID: registration.terminalSessionId,
        EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
        EASYTERMINAL_HOOK_SOCKET: socketPath,
        EASYTERMINAL_INSTANCE_ID: registration.instanceId,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const stdout = new Promise<string>((resolve, reject) => {
      let value = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { value += String(chunk) })
      child.once('error', reject)
      child.once('close', () => resolve(value))
    })
    child.stdin.end(JSON.stringify({
      session_id: 'claude-session-A',
      cwd: '/tmp/project',
      hook_event_name: 'PermissionRequest',
      tool_name: 'Bash',
      tool_input: { command: 'npm test', description: 'run tests' },
      permission_suggestions: [{ behavior: 'allow', type: 'addRules', rules: [{ toolName: 'Bash', ruleContent: 'npm test' }] }],
    }))

    const output = await stdout
    await server.stop()

    expect(JSON.parse(output)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'allow' },
      },
    })
    expect(interactionId).toMatch(/^claude-/)
    expect(store.getInteraction(interactionId)?.status).toBe('acknowledged')
  })

  it('ISL-E2E-CLAUDE-003 treats a successful deny as an acknowledged Agent decision', async () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-claude-hook-deny-'))
    temporaryDirectories.push(directory)
    const scriptPath = path.join(directory, 'claude-hook.mjs')
    const socketPath = path.join(directory, 'hook.sock')
    fs.writeFileSync(scriptPath, CLAUDE_CODE_HOOK_SCRIPT, { mode: 0o700 })

    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-deny', instanceId: 'instance-deny' })
    const store = createSessionStore()
    let interactionId = ''
    const adapter = new ClaudeCodeAdapter()
    const coordinator = createInteractionCoordinator({
      store,
      registry,
      adapters: [adapter],
      transport: {
        sendHook: (payload, interaction) => server.sendResponse(payload, interaction),
        writePty: vi.fn(),
      },
    })
    const server = createHookServer({
      socketPath,
      registry,
      store,
      adapters: [adapter],
      onInteraction: receivedInteractionId => {
        interactionId = receivedInteractionId
        const interaction = store.getInteraction(receivedInteractionId)
        expect(interaction?.detail).toContain('请选择是否继续')
        expect(interaction?.detail).not.toContain('"questions"')
        if (interaction) setTimeout(() => void coordinator.submit({
          interactionId: receivedInteractionId,
          terminalSessionId: interaction.terminalSessionId,
          revision: interaction.revision,
          action: 'deny',
          reason: '用户确认拒绝该操作',
        }), 0)
      },
      onAck: event => coordinator.handleAck(event),
    })
    await server.start()

    const child = (await import('node:child_process')).spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        EASYTERMINAL_TERMINAL_SESSION_ID: registration.terminalSessionId,
        EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
        EASYTERMINAL_HOOK_SOCKET: socketPath,
        EASYTERMINAL_INSTANCE_ID: registration.instanceId,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const stdout = new Promise<string>((resolve, reject) => {
      let value = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { value += String(chunk) })
      child.once('error', reject)
      child.once('close', () => resolve(value))
    })
    child.stdin.end(JSON.stringify({
      session_id: 'claude-session-deny',
      hook_event_name: 'PermissionRequest',
      tool_name: 'AskUserQuestion',
      tool_input: {
        questions: [{
          question: '请选择是否继续',
          header: '测试审批',
          options: [{ label: '继续' }, { label: '拒绝' }],
          multiSelect: false,
        }],
      },
    }))

    const output = await stdout
    await server.stop()

    expect(JSON.parse(output)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: { behavior: 'deny', message: '用户确认拒绝该操作' },
      },
    })
    expect(interactionId).toMatch(/^claude-/)
    expect(store.getInteraction(interactionId)?.status).toBe('acknowledged')
  })

  it('ISL-E2E-CLAUDE-004 renders AskUserQuestion cleanly and returns updatedInput answers', async () => {
    const directory = fs.mkdtempSync(path.join('/private/tmp', 'easy-terminal-claude-question-'))
    temporaryDirectories.push(directory)
    const scriptPath = path.join(directory, 'claude-hook.mjs')
    const socketPath = path.join(directory, 'hook.sock')
    fs.writeFileSync(scriptPath, CLAUDE_CODE_HOOK_SCRIPT, { mode: 0o700 })

    const registry = createTerminalSessionRegistry()
    const registration = registry.register({ terminalSessionId: 'tab-question', instanceId: 'instance-question' })
    const store = createSessionStore()
    let interactionId = ''
    const adapter = new ClaudeCodeAdapter()
    const coordinator = createInteractionCoordinator({
      store,
      registry,
      adapters: [adapter],
      transport: {
        sendHook: (payload, interaction) => server.sendResponse(payload, interaction),
        writePty: vi.fn(),
      },
    })
    const server = createHookServer({
      socketPath,
      registry,
      store,
      adapters: [adapter],
      onInteraction: receivedInteractionId => {
        interactionId = receivedInteractionId
        const interaction = store.getInteraction(receivedInteractionId)
        expect(interaction?.kind).toBe('question')
        expect(interaction?.detail).toContain('请选择执行策略')
        expect(interaction?.detail).not.toContain('"questions"')
        expect(interaction?.detail).not.toContain('【执行策略】')
        expect(interaction?.detail).not.toContain('继续执行')
        expect(interaction?.options.map(option => option.value)).toEqual(['继续执行', '稍后执行'])
        if (interaction) setTimeout(() => void coordinator.submit({
          interactionId: receivedInteractionId,
          terminalSessionId: interaction.terminalSessionId,
          revision: interaction.revision,
          action: 'answer_options',
          value: '继续执行',
        }), 0)
      },
      onAck: event => coordinator.handleAck(event),
    })
    await server.start()

    const child = (await import('node:child_process')).spawn(process.execPath, [scriptPath], {
      env: {
        ...process.env,
        EASYTERMINAL_TERMINAL_SESSION_ID: registration.terminalSessionId,
        EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
        EASYTERMINAL_HOOK_SOCKET: socketPath,
        EASYTERMINAL_INSTANCE_ID: registration.instanceId,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const stdout = new Promise<string>((resolve, reject) => {
      let value = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { value += String(chunk) })
      child.once('error', reject)
      child.once('close', () => resolve(value))
    })
    child.stdin.end(JSON.stringify({
      session_id: 'claude-session-question',
      hook_event_name: 'PreToolUse',
      tool_name: 'AskUserQuestion',
      tool_input: {
        questions: [{
          question: '请选择执行策略',
          header: '执行策略',
          options: [
            { label: '继续执行', description: '继续当前任务' },
            { label: '稍后执行', description: '稍后再处理' },
          ],
          multiSelect: false,
        }],
      },
    }))

    const output = await stdout
    await server.stop()

    const parsed = JSON.parse(output) as { hookSpecificOutput?: { hookEventName?: string; permissionDecision?: string; updatedInput?: { answers?: Record<string, string> } } }
    expect(parsed).toMatchObject({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        updatedInput: { answers: { '请选择执行策略': '继续执行' } },
      },
    })
    expect(interactionId).toMatch(/^claude-/)
    expect(store.getInteraction(interactionId)?.status).toBe('acknowledged')
  })
})
