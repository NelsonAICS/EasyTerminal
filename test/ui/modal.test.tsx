// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UIModal } from '../../src/components/ui/modal'

describe('UIModal', () => {
  it('does not close when content is clicked, including the top bar', () => {
    const onClose = vi.fn()
    render(<UIModal open onClose={onClose}><button>顶部操作</button></UIModal>)

    fireEvent.click(screen.getByRole('button', { name: '顶部操作' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes only when the backdrop itself is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<UIModal open onClose={onClose}><div>内容</div></UIModal>)
    const backdrop = container.firstElementChild

    if (!backdrop) throw new Error('modal backdrop not rendered')
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
