// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReplyComposer } from '../../src/components/island/ReplyComposer'

import { afterEach } from 'vitest'
afterEach(cleanup)

const ipc = { invoke: vi.fn(() => Promise.resolve({ ok: true })), send: vi.fn(), on: vi.fn(), removeListener: vi.fn(), once: vi.fn() }

describe('ReplyComposer', () => {
  it('ISL-UI-024 does not send Enter while IME composition is active', () => {
    const onSubmit = vi.fn()
    render(<ReplyComposer interactionId="i-1" ipc={ipc} onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '请补充回滚方案' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', nativeEvent: { isComposing: true } })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('请补充回滚方案')
  })

  it('ISL-UI-025 uses Shift+Enter for a newline and Enter for submit', () => {
    const onSubmit = vi.fn()
    render(<ReplyComposer interactionId="i-1" ipc={ipc} onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '第一行' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledWith('第一行')
  })

  it('ISL-UI-028 preserves content when submit handler reports failure', () => {
    const onSubmit = vi.fn()
    render(<ReplyComposer interactionId="i-1" ipc={ipc} onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '保留这段草稿' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(onSubmit).toHaveBeenCalledWith('保留这段草稿')
    expect(input.value).toBe('保留这段草稿')
  })

  it('ISL-UI-022 requests interactive focus when the composer focuses', () => {
    render(<ReplyComposer interactionId="i-focus" ipc={ipc} onSubmit={vi.fn()} />)
    fireEvent.focus(screen.getByRole('textbox'))
    expect(ipc.invoke).toHaveBeenCalledWith('island:set-interactive', expect.objectContaining({ interactionId: 'i-focus', interactive: true, reason: 'composer-focus' }))
  })
})
