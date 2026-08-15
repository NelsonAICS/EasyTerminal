// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingInteraction } from '../../src/types/agent-interaction'

type Listener = (...args: unknown[]) => void

const interaction: PendingInteraction = {
  interactionId: 'island-shell-interaction',
  terminalSessionId: 'tab-A',
  terminalSessionName: 'tab-A',
  agentSessionId: 'agent-A',
  agentType: 'claude-code',
  kind: 'permission',
  revision: 1,
  status: 'pending',
  title: 'Claude Code 请求权限：Bash',
  detail: 'echo island-test',
  options: [],
  capabilities: ['allow_once', 'deny', 'jump_to_terminal'],
  responseMode: 'hook-response',
  createdAt: Date.now(),
  source: 'hook',
  agentCapabilities: {
    observeLifecycle: true,
    observeTools: true,
    approveOnce: true,
    approveAlways: false,
    answerChoice: false,
    answerText: false,
    answerMultiple: false,
    planFeedback: false,
    responseAck: true,
    sendMessage: false,
  },
}

function createIpc() {
  const listeners = new Map<string, Set<Listener>>()
  const ipc = {
    send: vi.fn(),
    invoke: vi.fn(async (channel: string) => channel === 'island:interaction-response' ? { ok: true } : { ok: true }),
    on: vi.fn((channel: string, listener: Listener) => {
      const current = listeners.get(channel) ?? new Set<Listener>()
      current.add(listener)
      listeners.set(channel, current)
    }),
    removeListener: vi.fn((channel: string, listener: Listener) => listeners.get(channel)?.delete(listener)),
    once: vi.fn(),
    emit(channel: string, payload: unknown) {
      for (const listener of listeners.get(channel) ?? []) listener({}, payload)
    },
  }
  return ipc
}

describe('Island shell lifecycle', () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderIsland() {
    const ipc = createIpc()
    Object.defineProperty(window, 'require', { configurable: true, value: () => ({ ipcRenderer: ipc }) })
    const { default: Island } = await import('../../src/Island')
    render(<Island />)
    return { ipc }
  }

  it('collapses and reopens without invoking the main terminal window', async () => {
    const { ipc } = await renderIsland()
    ipc.emit('island:interaction', interaction)

    fireEvent.click(await screen.findByRole('button', { name: '收起灵动岛' }))
    const expandButton = await screen.findByRole('button', { name: '展开灵动岛' })
    fireEvent.click(expandButton)

    expect(await screen.findByRole('button', { name: '收起灵动岛' })).toBeInTheDocument()
    expect(ipc.invoke).not.toHaveBeenCalledWith('island:jump-to-terminal', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: '收起灵动岛' }))
    expect(screen.getByRole('button', { name: '展开灵动岛' })).toBeInTheDocument()
  })

  it('can close the capsule even when no interaction is active', async () => {
    await renderIsland()
    fireEvent.click(screen.getByRole('button', { name: '关闭灵动岛' }))
    expect(screen.queryByRole('button', { name: '展开灵动岛' })).not.toBeInTheDocument()
  })

  it('closes a failed interaction and ignores stale failure updates afterwards', async () => {
    const { ipc } = await renderIsland()
    ipc.emit('island:interaction', interaction)
    fireEvent.click(await screen.findByRole('button', { name: '收起灵动岛' }))
    fireEvent.click(await screen.findByRole('button', { name: '展开灵动岛' }))

    const failed = { ...interaction, status: 'failed' as const, detail: `${interaction.detail}\nhook_connection_unavailable` }
    ipc.emit('island:interaction-state', failed)
    expect(await screen.findByText('发送失败，请重试或返回终端处理。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭灵动岛' }))
    await waitFor(() => expect(screen.queryByText('发送失败，请重试或返回终端处理。')).not.toBeInTheDocument())

    ipc.emit('island:interaction-state', failed)
    expect(screen.queryByText('发送失败，请重试或返回终端处理。')).not.toBeInTheDocument()
  })

  it('hides the expanded shell after the last interaction is acknowledged', async () => {
    const { ipc } = await renderIsland()
    ipc.emit('island:interaction', interaction)
    fireEvent.click(await screen.findByRole('button', { name: '仅本次允许' }))

    ipc.emit('island:interaction-state', { ...interaction, status: 'acknowledged' as const })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '关闭灵动岛' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '展开灵动岛' })).not.toBeInTheDocument()
    })
  })
})
