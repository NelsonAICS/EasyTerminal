import fs from 'node:fs'
import path from 'node:path'

const MANAGED_MARKER = 'easyterminal-managed-agent-hook-v1'

export interface HookInstallerOptions {
  configPath: string
  hookCommand: string
  backupPath?: string
  hookEvent?: string
  matcher?: string
  timeout?: number
}

export interface HookInstallResult {
  changed: boolean
  configPath: string
  backupPath?: string
}

type JsonDocument = Record<string, unknown>

const isRecord = (value: unknown): value is JsonDocument => typeof value === 'object' && value !== null && !Array.isArray(value)

function readDocument(configPath: string): JsonDocument {
  if (!fs.existsSync(configPath)) return {}
  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) throw new Error('hook config must be a JSON object')
  return parsed
}

function atomicWrite(configPath: string, document: JsonDocument) {
  const directory = path.dirname(configPath)
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  const temporaryPath = path.join(directory, `.${path.basename(configPath)}.${process.pid}.tmp`)
  fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temporaryPath, configPath)
}

const isHookHandler = (value: unknown): value is Record<string, unknown> => isRecord(value) && value.type === 'command' && typeof value.command === 'string'

const isMatcherGroup = (value: unknown): value is { matcher?: string; hooks: unknown[] } =>
  isRecord(value) && Array.isArray(value.hooks)

function managedHook(hookCommand: string, timeout?: number) {
  return {
    type: 'command',
    command: hookCommand,
    ...(timeout !== undefined ? { timeout } : {}),
  }
}

export function installHook(options: HookInstallerOptions): HookInstallResult {
  const document = readDocument(options.configPath)
  const hookEvent = options.hookEvent ?? 'PermissionRequest'
  const matcher = options.matcher ?? '*'
  const hooks = isRecord(document.hooks) ? { ...document.hooks } : {}
  const existingGroups = hooks[hookEvent]
  if (existingGroups !== undefined && !Array.isArray(existingGroups)) {
    throw new Error(`hooks.${hookEvent} must be an array`)
  }
  const groups = Array.isArray(existingGroups) ? [...existingGroups] : []
  const hasManagedHook = groups.some(group => isMatcherGroup(group) && group.hooks.some(handler => isHookHandler(handler) && handler.command === options.hookCommand))
  if (!hasManagedHook) groups.push({ matcher, hooks: [managedHook(options.hookCommand, options.timeout)] })
  const nextDocument: JsonDocument = { ...document, hooks: { ...hooks, [hookEvent]: groups } }
  const currentDocument = JSON.stringify(document)
  const nextSerialized = JSON.stringify(nextDocument)
  if (currentDocument === nextSerialized) {
    return { changed: false, configPath: options.configPath, ...(options.backupPath ? { backupPath: options.backupPath } : {}) }
  }

  const backupPath = options.backupPath ?? `${options.configPath}.easyterminal.bak`
  if (fs.existsSync(options.configPath) && !fs.existsSync(backupPath)) fs.copyFileSync(options.configPath, backupPath, fs.constants.COPYFILE_EXCL)
  atomicWrite(options.configPath, nextDocument)
  return { changed: true, configPath: options.configPath, backupPath }
}

export function uninstallHook(options: Pick<HookInstallerOptions, 'configPath' | 'hookCommand'>): HookInstallResult {
  const document = readDocument(options.configPath)
  if (!isRecord(document.hooks)) return { changed: false, configPath: options.configPath }

  const nextHooks: Record<string, unknown> = {}
  let changed = false
  for (const [event, value] of Object.entries(document.hooks)) {
    if (!Array.isArray(value)) {
      nextHooks[event] = value
      continue
    }
    const nextGroups = value.map(group => {
      if (!isMatcherGroup(group)) return group
      const nextHandlers = group.hooks.filter(handler => !(isHookHandler(handler) && handler.command === options.hookCommand))
      if (nextHandlers.length !== group.hooks.length) changed = true
      return { ...group, hooks: nextHandlers }
    }).filter(group => !isMatcherGroup(group) || group.hooks.length > 0)
    if (nextGroups.length > 0 || value.length === 0) nextHooks[event] = nextGroups
  }
  if (!changed) return { changed: false, configPath: options.configPath }
  const next = { ...document, hooks: nextHooks }
  if (Object.keys(nextHooks).length === 0) delete next.hooks
  atomicWrite(options.configPath, next)
  return { changed: true, configPath: options.configPath }
}

export function restoreHookBackup(configPath: string, backupPath = `${configPath}.easyterminal.bak`, hookCommand?: string): HookInstallResult {
  if (!fs.existsSync(backupPath)) return { changed: false, configPath }
  if (fs.existsSync(configPath)) {
    const current = readDocument(configPath)
    const legacyManaged = isRecord(current.easyTerminalHook) && current.easyTerminalHook.marker === MANAGED_MARKER
    const currentHooks = isRecord(current.hooks) ? current.hooks : {}
    const officialManaged = hookCommand !== undefined && Object.values(currentHooks).some(value =>
      Array.isArray(value) && value.some(group =>
        isMatcherGroup(group) && group.hooks.some(handler => isHookHandler(handler) && handler.command === hookCommand),
      ),
    )
    const managed = legacyManaged || officialManaged
    if (!managed) return { changed: false, configPath, backupPath }
  }
  fs.copyFileSync(backupPath, configPath)
  return { changed: true, configPath, backupPath }
}

export const hookInstallerMarker = MANAGED_MARKER
