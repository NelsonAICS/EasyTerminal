import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const promptDefinition: PublishedNodeDefinition = {
  type: 'prompt',
  version: 1,
  status: 'published',
  executorKind: 'prompt',
  inputPorts: [
    { id: 'query', type: 'text', required: true },
    { id: 'context', type: 'text' },
    { id: 'variables', type: 'json' },
  ],
  outputPorts: [{ id: 'text', type: 'text' }],
  configSchema: { template: 'string' },
  risk: 'safe',
}

export function renderPromptTemplate(template: string, inputs: Record<string, unknown>): string {
  if (/\{\{\s*(?:result|node)\s*\./i.test(template)) {
    throw new Error('Prompt template cannot reference hidden node results; connect a typed input port instead')
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => {
    const value = key.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[part]
    }, inputs)
    return value === undefined || value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value)
  })
}

export const promptExecutor: NodeExecutor = async ({ inputs, config }) => {
  const template = typeof config.template === 'string' ? config.template : '{{query}}'
  const variables = inputs.variables && typeof inputs.variables === 'object' ? inputs.variables : {}
  return {
    text: renderPromptTemplate(template, { ...variables, ...inputs }),
  }
}
