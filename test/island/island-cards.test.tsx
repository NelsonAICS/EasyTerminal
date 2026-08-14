// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PermissionCard } from '../../src/components/island/PermissionCard'
import { QuestionCard } from '../../src/components/island/QuestionCard'
import type { PendingInteraction } from '../../src/types/agent-interaction'

import { afterEach } from 'vitest'
afterEach(cleanup)

const base: PendingInteraction = {
  interactionId: 'i-1', terminalSessionId: 'tab-A', agentSessionId: 'agent-A', agentType: 'fake-agent', kind: 'permission', revision: 1,
  status: 'pending', title: '请求执行命令', detail: 'npm test', options: [], capabilities: ['allow_once', 'deny', 'jump_to_terminal'], responseMode: 'hook-response', createdAt: Date.now(), source: 'hook',
  agentCapabilities: { observeLifecycle: true, observeTools: true, approveOnce: true, approveAlways: false, answerChoice: false, answerText: false, answerMultiple: false, planFeedback: false, responseAck: true, sendMessage: false },
}

describe('typed island cards', () => {
  it('ISL-UI-030 does not render allow_always when capability is absent', () => {
    render(<PermissionCard interaction={base} ipc={null} onAction={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /始终允许/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '仅本次允许' })).toBeInTheDocument()
  })

  it('ISL-UI-031/032 separates deny reason from immediate deny', async () => {
    const onAction = vi.fn()
    render(<PermissionCard interaction={base} ipc={null} onAction={onAction} />)
    expect(screen.queryByPlaceholderText(/拒绝原因/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '拒绝并说明' }))
    await waitFor(() => expect(screen.getByPlaceholderText(/拒绝原因/)).toBeInTheDocument())
    screen.getByRole('button', { name: '确认拒绝' }).click()
    expect(onAction).toHaveBeenCalledWith('deny', '')
  })

  it('ISL-UI-008 prevents empty multi-select submission', () => {
    const question: PendingInteraction = { ...base, kind: 'question', title: '选择策略', options: [{ value: 'compat', label: '保持兼容' }, { value: 'refactor', label: '重构协议' }], capabilities: ['answer_options', 'answer_multiple', 'jump_to_terminal'] }
    render(<QuestionCard interaction={question} ipc={null} onAction={vi.fn()} />)
    expect(screen.getByRole('button', { name: '确认选择' })).toBeDisabled()
  })
})
