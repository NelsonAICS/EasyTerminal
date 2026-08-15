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
  return { configPath: path.join(directory, 'settings.json'), backupPath: path.join(directory, 'settings.json.bak') }
}

describe('Hook installer', () => {
  it('ISL-SEC-008 preserves custom configuration and writes an official Claude hook', () => {
    const paths = fixture()
    fs.writeFileSync(paths.configPath, JSON.stringify({ userHooks: [{ command: 'custom-hook' }], permissions: { safe: true }, hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'format' }] }] } }))
    const result = installHook({ ...paths, hookCommand: '/Applications/EasyTerminal/hook.js', hookEvent: 'PermissionRequest' })
    const document = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as Record<string, unknown>

    expect(result.changed).toBe(true)
    expect(document.userHooks).toEqual([{ command: 'custom-hook' }])
    expect(document.permissions).toEqual({ safe: true })
    expect(document.hooks).toMatchObject({
      PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'format' }] }],
      PermissionRequest: [{ matcher: '*', hooks: [{ type: 'command', command: '/Applications/EasyTerminal/hook.js' }] }],
    })
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
    installHook({ ...paths, hookCommand: 'hook', hookEvent: 'PermissionRequest' })
    expect(uninstallHook({ ...paths, hookCommand: 'hook' }).changed).toBe(true)
    expect(JSON.parse(fs.readFileSync(paths.configPath, 'utf8'))).toEqual({ user: 'keep' })
    installHook({ ...paths, hookCommand: 'hook-v2', hookEvent: 'PermissionRequest' })
    expect(restoreHookBackup(paths.configPath, paths.backupPath, 'hook-v2').changed).toBe(true)
    expect(JSON.parse(fs.readFileSync(paths.configPath, 'utf8'))).toEqual({ user: 'keep' })
  })
})
