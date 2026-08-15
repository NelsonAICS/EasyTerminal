// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn(async (channel: string) => {
  if (channel === 'provider-v2:list') return [{
    id: 'fake',
    name: 'Fake Provider',
    kind: 'openai_compatible',
    baseUrl: 'https://fake.test/v1',
    models: [{ id: 'fake-chat', capabilities: ['chat'], source: 'discovered' }],
    capabilities: ['chat'],
    hasCredential: true,
    health: 'connected',
    updatedAt: new Date().toISOString(),
  }]
  if (channel === 'provider-v2:defaults:get') return { defaultLlmModelRef: null, defaultEmbeddingModelRef: null }
  return true
})

Object.defineProperty(window, 'require', { value: () => ({ ipcRenderer: { invoke } }), configurable: true })
const { ProviderManager } = await import('../../src/features/providers/ProviderManager')

describe('ProviderManager', () => {
  it('loads safe summaries and refreshes a provider model catalog through IPC', async () => {
    render(<ProviderManager />)
    expect(await screen.findByText('Fake Provider')).toBeInTheDocument()
    expect(screen.getByText('fake-chat')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('min-h-0', 'overflow-y-auto')
    expect(screen.getByText('应用默认模型')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /刷新/ }))
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('provider-v2:discover-models', 'fake'))
  })
})
