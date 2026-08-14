import fs from 'node:fs'
import path from 'node:path'

const MANAGED_MARKER = 'easyterminal-managed-agent-hook-v1'

export interface HookInstallerOptions {
  configPath: string
  hookCommand: string
  backupPath?: string
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
  const temporaryPath = path.join(directory, `.${path.basename(configPath)}.${process.pid}.tmp`)
  fs.writeFileSync(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temporaryPath, configPath)
}

function managedHook(hookCommand: string) {
  return { marker: MANAGED_MARKER, command: hookCommand }
}

export function installHook(options: HookInstallerOptions): HookInstallResult {
  const document = readDocument(options.configPath)
  const existing = isRecord(document.easyTerminalHook) ? document.easyTerminalHook : undefined
  const next = managedHook(options.hookCommand)
  if (existing?.marker === MANAGED_MARKER && existing.command === options.hookCommand) {
    return { changed: false, configPath: options.configPath, ...(options.backupPath ? { backupPath: options.backupPath } : {}) }
  }

  const backupPath = options.backupPath ?? `${options.configPath}.easyterminal.bak`
  if (fs.existsSync(options.configPath) && !fs.existsSync(backupPath)) fs.copyFileSync(options.configPath, backupPath, fs.constants.COPYFILE_EXCL)
  atomicWrite(options.configPath, { ...document, easyTerminalHook: next })
  return { changed: true, configPath: options.configPath, backupPath }
}

export function uninstallHook(options: Pick<HookInstallerOptions, 'configPath'>): HookInstallResult {
  const document = readDocument(options.configPath)
  const existing = isRecord(document.easyTerminalHook) ? document.easyTerminalHook : undefined
  if (!existing || existing.marker !== MANAGED_MARKER) return { changed: false, configPath: options.configPath }
  const next = { ...document }
  delete next.easyTerminalHook
  atomicWrite(options.configPath, next)
  return { changed: true, configPath: options.configPath }
}

export function restoreHookBackup(configPath: string, backupPath = `${configPath}.easyterminal.bak`): HookInstallResult {
  if (!fs.existsSync(backupPath)) return { changed: false, configPath }
  if (fs.existsSync(configPath)) {
    const current = readDocument(configPath)
    const managed = isRecord(current.easyTerminalHook) && current.easyTerminalHook.marker === MANAGED_MARKER
    if (!managed) return { changed: false, configPath, backupPath }
  }
  fs.copyFileSync(backupPath, configPath)
  return { changed: true, configPath, backupPath }
}

export const hookInstallerMarker = MANAGED_MARKER
