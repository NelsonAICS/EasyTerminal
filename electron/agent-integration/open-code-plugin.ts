import fs from 'node:fs'
import path from 'node:path'

/**
 * OpenCode loads local plugins from ~/.config/opencode/plugins at startup.
 * The plugin observes the official permission.asked event, forwards it to
 * EasyTerminal's authenticated HookServer, waits for the Island decision, and
 * calls OpenCode's official permission reply API.
 */
export const OPENCODE_PLUGIN_SCRIPT = String.raw`import crypto from 'node:crypto'
import net from 'node:net'

const hookTimeoutMs = 540000

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value)
const asString = value => typeof value === 'string' ? value : ''

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('hook response timeout')), timeoutMs)
  promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
})

const connectHookServer = socketPath => new Promise((resolve, reject) => {
  const socket = net.createConnection(socketPath)
  let connected = false
  let buffer = ''
  const readers = []
  const failReaders = error => { while (readers.length > 0) readers.shift().reject(error) }
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
  socket.on('error', error => { if (!connected) reject(error); else failReaders(error) })
  socket.on('close', () => failReaders(new Error('hook socket closed')))
  socket.once('connect', () => {
    connected = true
    resolve({ socket, nextMessage: () => new Promise((nextResolve, nextReject) => { readers.push({ resolve: nextResolve, reject: nextReject }); drain() }) })
  })
})

const sendEnvelope = async (event, socketPath) => {
  const connection = await connectHookServer(socketPath)
  const { socket, nextMessage } = connection
  socket.write(JSON.stringify(event) + '\n')
  const accepted = await withTimeout(nextMessage(), hookTimeoutMs)
  if (!isRecord(accepted) || accepted.ok !== true || typeof accepted.interactionId !== 'string') {
    socket.end()
    return null
  }
  return { socket, nextMessage }
}

const readToolInput = properties => {
  const tool = isRecord(properties.tool) ? properties.tool : {}
  const metadata = isRecord(properties.metadata) ? properties.metadata : {}
  const input = isRecord(metadata.input) ? metadata.input : isRecord(properties.input) ? properties.input : {}
  return { tool, input }
}

const toolDetail = (permission, patterns, input) => {
  const command = asString(input.command)
  if (command) return command
  if (patterns.length > 0) return patterns.join('\n')
  return permission
}

const replyPermission = async (client, sessionId, permissionId, response) => {
  const responder = client?.postSessionIdPermissionsPermissionId
    ?? client?.postSessionByIdPermissionsByPermissionId
    ?? client?.permission?.reply
  if (typeof responder !== 'function') throw new Error('OpenCode permission reply API is unavailable')
  const result = await responder.call(client, {
    path: { id: sessionId, permissionID: permissionId },
    body: { response },
  })
  if (isRecord(result) && result.error) throw new Error('OpenCode rejected permission response')
  return result === false ? false : true
}

const handlePermission = async (properties, client) => {
  if (!isRecord(properties)) return
  const terminalSessionId = asString(process.env.EASYTERMINAL_TERMINAL_SESSION_ID)
  const channelToken = asString(process.env.EASYTERMINAL_CHANNEL_TOKEN)
  const hookSocket = asString(process.env.EASYTERMINAL_HOOK_SOCKET)
  const instanceId = asString(process.env.EASYTERMINAL_INSTANCE_ID)
  const agentSessionId = asString(properties.sessionID)
  const permissionId = asString(properties.id ?? properties.requestID)
  if (!terminalSessionId || !channelToken || !hookSocket || !instanceId || !agentSessionId || !permissionId) return

  const permission = asString(properties.permission) || 'tool'
  const patterns = Array.isArray(properties.patterns) ? properties.patterns.filter(item => typeof item === 'string') : []
  const always = Array.isArray(properties.always) ? properties.always.filter(item => typeof item === 'string') : []
  const { tool, input } = readToolInput(properties)
  const interactionId = 'opencode-' + permissionId
  const event = {
    schemaVersion: 1,
    eventId: 'opencode-event-' + crypto.randomUUID(),
    eventType: 'PermissionRequest',
    agentType: 'opencode',
    source: 'plugin',
    terminalSessionId,
    agentSessionId,
    instanceId,
    channelToken,
    interactionId,
    revision: 1,
    occurredAt: Date.now(),
    payload: {
      title: 'OpenCode 请求权限：' + permission,
      detail: toolDetail(permission, patterns, input),
      command: asString(input.command),
      toolName: asString(tool.name ?? properties.toolName) || permission,
      toolInput: input,
      options: [
        { value: 'allow_once', label: '仅本次允许' },
        ...(always.length > 0 ? [{ value: 'allow_always', label: '对此规则始终允许' }] : []),
        { value: 'deny', label: '拒绝' },
      ],
      allowAlways: always.length > 0,
      expiresAt: Date.now() + hookTimeoutMs,
    },
  }

  let connection
  try {
    connection = await sendEnvelope(event, hookSocket)
    if (!connection) return
    const { socket, nextMessage } = connection
    const response = await withTimeout(nextMessage(), hookTimeoutMs)
    const responsePayload = isRecord(response) && isRecord(response.payload) ? response.payload : {}
    const action = asString(responsePayload.action)
    if (action === 'jump_to_terminal') {
      const ack = {
        ...event,
        eventId: 'opencode-ack-' + crypto.randomUUID(),
        eventType: 'interaction.ack',
        occurredAt: Date.now(),
        payload: { interactionId, revision: 1, accepted: false, reason: '用户选择返回终端处理' },
      }
      socket.write(JSON.stringify(ack) + '\n')
      await withTimeout(nextMessage(), hookTimeoutMs)
      return
    }

    const opencodeResponse = action === 'allow_once' ? 'once' : action === 'allow_always' ? 'always' : action === 'deny' ? 'reject' : ''
    if (!opencodeResponse) return
    let accepted = false
    let reason = asString(responsePayload.reason)
    try {
      accepted = await replyPermission(client, agentSessionId, permissionId, opencodeResponse)
      if (!accepted) reason = reason || 'OpenCode 未接受权限响应'
    } catch (error) {
      reason = error instanceof Error ? error.message : 'OpenCode 权限响应失败'
    }
    const ack = {
      ...event,
      eventId: 'opencode-ack-' + crypto.randomUUID(),
      eventType: 'interaction.ack',
      occurredAt: Date.now(),
      payload: { interactionId, revision: 1, accepted, ...(reason ? { reason } : {}) },
    }
    socket.write(JSON.stringify(ack) + '\n')
    await withTimeout(nextMessage(), hookTimeoutMs)
  } catch {
    // Fail open: OpenCode keeps its native permission UI if the bridge is down.
  } finally {
    connection?.socket.end()
  }
}

export const EasyTerminalOpenCodePlugin = async ({ client }) => ({
  event: async ({ event }) => {
    if (!isRecord(event) || event.type !== 'permission.asked') return
    const properties = isRecord(event.properties) ? event.properties : {}
    await handlePermission(properties, client)
  },
})

export default EasyTerminalOpenCodePlugin
`

export interface OpenCodePluginSetupOptions {
  homePath: string
  backupPath?: string
}

export interface OpenCodePluginSetupResult {
  changed: boolean
  pluginPath: string
  backupPath?: string
}

export function installOpenCodePlugin(options: OpenCodePluginSetupOptions): OpenCodePluginSetupResult {
  const pluginPath = path.join(options.homePath, '.config', 'opencode', 'plugins', 'easyterminal-agent-bridge.mjs')
  const directory = path.dirname(pluginPath)
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const existing = fs.existsSync(pluginPath) ? fs.readFileSync(pluginPath, 'utf8') : undefined
  if (existing === OPENCODE_PLUGIN_SCRIPT) return { changed: false, pluginPath }

  const backupPath = options.backupPath ?? `${pluginPath}.easyterminal.bak`
  if (existing !== undefined && !fs.existsSync(backupPath)) fs.copyFileSync(pluginPath, backupPath, fs.constants.COPYFILE_EXCL)
  const temporaryPath = `${pluginPath}.${process.pid}.tmp`
  fs.writeFileSync(temporaryPath, OPENCODE_PLUGIN_SCRIPT, { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temporaryPath, pluginPath)
  return { changed: true, pluginPath, ...(existing === undefined ? {} : { backupPath }) }
}
