// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProviderForm } from '../../src/features/providers/ProviderForm'
import type { ProviderSummary } from '../../src/types/model-provider'

const provider: ProviderSummary = {
  id: 'deepseek',
  name: 'DeepSeek',
  kind: 'openai_compatible',
  baseUrl: 'https://api.deepseek.com',
  chatEndpoint: '/chat/completions',
  embeddingEndpoint: '/embeddings',
  models: [],
  capabilities: ['chat'],
  hasCredential: true,
  health: 'connected',
  updatedAt: new Date().toISOString(),
}

describe('ProviderForm', () => {
  it('blocks testing unsaved edits and explains the save-first flow', async () => {
    const onTest = vi.fn(async () => undefined)

    render(<ProviderForm provider={provider} onSave={vi.fn(async () => undefined)} onTest={onTest} isTesting={false} />)

    fireEvent.change(screen.getByLabelText('API 地址'), { target: { value: 'https://api.deepseek.com/v1' } })
    fireEvent.click(screen.getByRole('button', { name: '先保存后测试' }))

    expect(onTest).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('请先点击“保存 Provider”')
  })

  it('tests the saved provider when there are no unsaved edits', async () => {
    const onTest = vi.fn(async () => undefined)

    render(<ProviderForm provider={provider} onSave={vi.fn(async () => undefined)} onTest={onTest} isTesting={false} />)

    fireEvent.click(screen.getByRole('button', { name: '测试连接' }))

    await waitFor(() => expect(onTest).toHaveBeenCalledTimes(1))
  })
})
