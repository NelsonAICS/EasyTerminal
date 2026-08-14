import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installHook, uninstallHook, restoreHookBackup } from '../../electron/agent-integration/hook-installer'

const temporaryDirectories: string[] = []
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'easy-terminal-hook-'))
  temporaryDirectories.push(directory)
  return { configPath: path.join(directory, 'agent.json'), backupPath: path.join(directory, 'agent.json.bak') }
}

describe('Hook installer', () => {
  it('ISL-SEC-008 preserves custom configuration and writes a managed entry', () => {
    const paths = fixture()
    fs.writeFileSync(paths.configPath, JSON.stringify({ userHooks: [{ command: 'custom-hook' }], permissions: { safe: true } }))
    const result = installHook({ ...paths, hookCommand: '/Applications/EasyTerminal/hook.js' })
    const document = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as Record<string, unknown>

    expect(result.changed).toBe(true)
    expect(document.userHooks).toEqual([{ command: 'custom-hook' }])
    expect(document.permissions).toEqual({ safe: true })
    expect(document.easyTerminalHook).toMatchObject({ command: '/Applications/EasyTerminal/hook.js' })
    expect(fs.existsSync(paths.backupPath)).toBe(true)
  })

  it('ISL-SEC-009 refuses to modify malformed JSON', () => {
    const paths = fixture()
    fs.writeFileSync(paths.configPath, '{not-json')
    expect(() => installHook({ ...paths, hookCommand: 'hook' })).toThrow()
    expect(fs.readFileSync(paths.configPath, 'utf8')).toBe('{not-json')
  })

  it('removes and restores only the EasyTerminal-managed entry', () => {
    const paths = fixture()
    fs.writeFileSync(paths.configPath, JSON.stringify({ user: 'keep' }))
    installHook({ ...paths, hookCommand: 'hook' })
    expect(uninstallHook(paths).changed).toBe(true)
    expect(JSON.parse(fs.readFileSync(paths.configPath, 'utf8'))).toEqual({ user: 'keep' })
    installHook({ ...paths, hookCommand: 'hook-v2' })
    expect(restoreHookBackup(paths.configPath, paths.backupPath).changed).toBe(true)
    expect(JSON.parse(fs.readFileSync(paths.configPath, 'utf8'))).toEqual({ user: 'keep' })
  })
})
