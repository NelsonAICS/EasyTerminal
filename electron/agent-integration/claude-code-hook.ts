import fs from 'node:fs'
import path from 'node:path'
import { installHook, type HookInstallResult } from './hook-installer'

/**
 * Standalone command hook installed into Claude Code's settings.json.
 *
 * It deliberately has no EasyTerminal imports: Claude starts this file as a
 * separate process, including from a packaged asar application. The hook
 * inherits the four identity variables from the EasyTerminal PTY, sends the
 * official Claude PermissionRequest/PreToolUse input to HookServer, and blocks
 * until the Island response is returned.
 */
export const CLAUDE_CODE_HOOK_SCRIPT = String.raw`#!/usr/bin/env node
import crypto from 'node:crypto'
import net from 'node:net'

const hookTimeoutMs = 540000

const readStdin = () => new Promise((resolve, reject) => {
  let value = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', chunk => { value += String(chunk) })
  process.stdin.on('end', () => resolve(value))
  process.stdin.on('error', reject)
})

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value)
const asString = value => typeof value === 'string' ? value : ''
const writeNoDecision = () => { process.exitCode = 0 }

const openSocket = socketPath => new Promise((resolve, reject) => {
  const socket = net.createConnection(socketPath)
  let connected = false
  let buffer = ''
  const readers = []

  const failReaders = error => {
    while (readers.length > 0) readers.shift().reject(error)
  }

  const drain = () => {
    let newline = buffer.indexOf('\n')
    while (newline >= 0 && readers.length > 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
      if (!line) continue
      try { readers.shift().resolve(JSON.parse(line)) } catch (error) { failReaders(error) }
    }
  }

  socket.setEncoding('utf8')
  socket.on('data', chunk => { buffer += String(chunk); drain() })
  socket.on('error', error => {
    if (!connected) reject(error)
    else failReaders(error)
  })
  socket.on('close', () => failReaders(new Error('hook socket closed')))
  socket.once('connect', () => {
    connected = true
    resolve({ socket, nextMessage: () => new Promise((nextResolve, nextReject) => {
      readers.push({ resolve: nextResolve, reject: nextReject })
      drain()
    }) })
  })
})

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('hook response timeout')), timeoutMs)
  promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
})

const questionData = toolInput => {
  if (!isRecord(toolInput) || !Array.isArray(toolInput.questions)) return []
  return toolInput.questions.flatMap((rawQuestion, questionIndex) => {
    if (!isRecord(rawQuestion)) return []
    const question = asString(rawQuestion.question) || '未命名问题'
    const header = asString(rawQuestion.header)
    const options = Array.isArray(rawQuestion.options)
      ? rawQuestion.options.flatMap((rawOption, optionIndex) => {
          if (!isRecord(rawOption)) return []
          const label = asString(rawOption.label) || '选项 ' + (optionIndex + 1)
          return [{
            value: label,
            label,
            ...(asString(rawOption.description) ? { description: asString(rawOption.description) } : {}),
          }]
        })
      : []
    return [{
      question,
      ...(header ? { header } : {}),
      options,
      multiSelect: rawQuestion.multiSelect === true,
      questionIndex,
    }]
  })
}

const formatQuestions = (questions, includeOptions = true, includeHeaders = true) => questions.map((item, index) => {
  const title = includeHeaders && item.header ? '【' + item.header + '】' + item.question : item.question
  const options = includeOptions ? item.options.map((option, optionIndex) => {
    const description = option.description ? '：' + option.description : ''
    return '  ' + (optionIndex + 1) + '. ' + option.label + description
  }).join('\n') : ''
  return (questions.length > 1 ? (index + 1) + '. ' : '') + title + (options ? '\n' + options : '')
}).join('\n\n')

const toolDetail = toolInput => {
  if (!isRecord(toolInput)) return ''
  const command = asString(toolInput.command)
  if (command) return command
  const description = asString(toolInput.description)
  if (description) return description
  const pathValue = asString(toolInput.file_path || toolInput.path)
  if (pathValue) return pathValue
  const pattern = asString(toolInput.pattern || toolInput.query)
  if (pattern) return pattern
  return '工具参数已接收'
}

const main = async () => {
  let input
  try { input = JSON.parse(String(await readStdin())) } catch { return writeNoDecision() }
  if (!isRecord(input)) return writeNoDecision()
  const hookEventName = asString(input.hook_event_name)
  const toolName = asString(input.tool_name)
  const toolInput = isRecord(input.tool_input) ? input.tool_input : {}
  const isQuestionHook = hookEventName === 'PreToolUse' && toolName === 'AskUserQuestion'
  if (hookEventName !== 'PermissionRequest' && !isQuestionHook) return writeNoDecision()

  const terminalSessionId = asString(process.env.EASYTERMINAL_TERMINAL_SESSION_ID)
  const channelToken = asString(process.env.EASYTERMINAL_CHANNEL_TOKEN)
  const hookSocket = asString(process.env.EASYTERMINAL_HOOK_SOCKET)
  const instanceId = asString(process.env.EASYTERMINAL_INSTANCE_ID)
  const agentSessionId = asString(input.session_id)
  if (!terminalSessionId || !channelToken || !hookSocket || !instanceId || !agentSessionId) return writeNoDecision()

  const interactionId = 'claude-' + crypto.randomUUID()
  const occurredAt = Date.now()
  const suggestions = Array.isArray(input.permission_suggestions) ? input.permission_suggestions : []
  const questions = questionData(toolInput)
  const firstQuestion = questions[0]
  const isPermissionQuestion = hookEventName === 'PermissionRequest' && toolName === 'AskUserQuestion' && questions.length > 0
  const isStructuredQuestion = isQuestionHook && questions.length > 0
  const event = {
    schemaVersion: 1,
    eventId: 'claude-event-' + crypto.randomUUID(),
    eventType: isStructuredQuestion ? 'AskUserQuestion' : 'PermissionRequest',
    agentType: 'claude-code',
    source: 'hook',
    terminalSessionId,
    agentSessionId,
    instanceId,
    channelToken,
    interactionId,
    revision: 1,
    occurredAt,
    payload: {
      title: isStructuredQuestion
        ? 'Claude Code 需要回答' + (firstQuestion?.header ? '：' + firstQuestion.header : '')
        : 'Claude Code 请求权限：' + (toolName || '工具调用'),
      detail: isPermissionQuestion
        ? formatQuestions(questions)
        : isStructuredQuestion
          ? formatQuestions(questions, false, false)
          : toolDetail(toolInput),
      command: asString(toolInput.command),
      toolName,
      toolInput,
      options: isStructuredQuestion ? (firstQuestion?.options ?? []) : suggestions,
      ...(isStructuredQuestion ? { multiSelect: firstQuestion?.multiSelect === true } : {}),
      allowAlways: !isPermissionQuestion && suggestions.some(item => isRecord(item) && item.behavior === 'allow'),
      hookEventName,
      expiresAt: occurredAt + hookTimeoutMs,
    },
  }

  let connection
  try { connection = await openSocket(hookSocket) } catch { return writeNoDecision() }
  const { socket, nextMessage } = connection
  try {
    socket.write(JSON.stringify(event) + '\n')
    const accepted = await withTimeout(nextMessage(), hookTimeoutMs)
    if (!isRecord(accepted) || accepted.ok !== true || typeof accepted.interactionId !== 'string') return writeNoDecision()

    const response = await withTimeout(nextMessage(), hookTimeoutMs)
    const responsePayload = isRecord(response) && isRecord(response.payload) ? response.payload : {}
    const action = asString(responsePayload.action)
    if (action === 'jump_to_terminal') {
      const ack = {
        ...event,
        eventId: 'claude-ack-' + crypto.randomUUID(),
        eventType: 'interaction.ack',
        occurredAt: Date.now(),
        payload: { interactionId, revision: 1, accepted: false, reason: '用户选择返回终端处理' },
      }
      socket.write(JSON.stringify(ack) + '\n')
      await withTimeout(nextMessage(), hookTimeoutMs)
      return writeNoDecision()
    }
    const reason = asString(responsePayload.reason)
    const allowed = action === 'allow' || action === 'allow_always'
    const decision = isStructuredQuestion
      ? (() => {
          const answerValue = responsePayload.value
          const answer = Array.isArray(answerValue) ? answerValue.join(', ') : asString(answerValue)
          if (!answer) return null
          return {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'allow',
              updatedInput: {
                ...toolInput,
                answers: { [firstQuestion.question]: answer },
              },
            },
          }
        })()
      : {
          hookSpecificOutput: {
            hookEventName: 'PermissionRequest',
            decision: {
              behavior: allowed ? 'allow' : 'deny',
              ...(!allowed ? { message: reason || '用户在 EasyTerminal 灵动岛中拒绝了该操作' } : {}),
            },
          },
        }
    if (!decision) return writeNoDecision()
    process.stdout.write(JSON.stringify(decision))

    const ack = {
      ...event,
      eventId: 'claude-ack-' + crypto.randomUUID(),
      eventType: 'interaction.ack',
      occurredAt: Date.now(),
      payload: {
        interactionId,
        revision: 1,
        // The accepted flag describes whether Claude received a valid response. It
        // must not mirror the business decision: deny is still a successful
        // response and must not turn the Island card into a transport error.
        accepted: true,
        ...(!allowed && reason ? { reason } : {}),
      },
    }
    socket.write(JSON.stringify(ack) + '\n')
    await withTimeout(nextMessage(), hookTimeoutMs)
  } catch {
    // No stdout means Claude keeps its normal permission flow when the
    // EasyTerminal process is unavailable or the Island response times out.
  } finally {
    socket.end()
  }
}

main().catch(() => writeNoDecision())
`

export interface ClaudeHookSetupOptions {
  homePath: string
  userDataPath: string
  platform: NodeJS.Platform
  backupPath?: string
}

export interface ClaudeHookSetupResult extends HookInstallResult {
  scriptPath: string
  hookCommand: string
}

const quotePosix = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`
const quoteWindows = (value: string): string => `"${value.replaceAll('"', '\\"')}` + '"'

export function installClaudeCodeHook(options: ClaudeHookSetupOptions): ClaudeHookSetupResult {
  const scriptPath = path.join(options.userDataPath, 'agent-integration', 'claude-code-hook.mjs')
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true, mode: 0o700 })
  fs.writeFileSync(scriptPath, CLAUDE_CODE_HOOK_SCRIPT, { encoding: 'utf8', mode: 0o700 })
  if (options.platform !== 'win32') fs.chmodSync(scriptPath, 0o700)

  const hookCommand = options.platform === 'win32'
    ? `node ${quoteWindows(scriptPath)}`
    : quotePosix(scriptPath)
  const configPath = path.join(options.homePath, '.claude', 'settings.json')
  const permissionHook = installHook({
    configPath,
    hookCommand,
    hookEvent: 'PermissionRequest',
    matcher: '*',
    timeout: 600,
    ...(options.backupPath ? { backupPath: options.backupPath } : {}),
  })
  const questionHook = installHook({
    configPath,
    hookCommand,
    hookEvent: 'PreToolUse',
    matcher: 'AskUserQuestion',
    timeout: 600,
    ...(options.backupPath ? { backupPath: options.backupPath } : {}),
  })
  return {
    changed: permissionHook.changed || questionHook.changed,
    configPath,
    scriptPath,
    hookCommand,
    ...(questionHook.backupPath ?? permissionHook.backupPath ? { backupPath: questionHook.backupPath ?? permissionHook.backupPath } : {}),
  }
}
