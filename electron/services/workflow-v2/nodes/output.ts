import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const outputDefinition: PublishedNodeDefinition = {
  type: 'output',
  version: 1,
  status: 'published',
  executorKind: 'output',
  inputPorts: [{ id: 'value', type: 'number', required: true, multiple: true }],
  outputPorts: [{ id: 'value', type: 'number' }],
  configSchema: {},
  risk: 'safe',
}

export const outputExecutor: NodeExecutor = async ({ inputs }) => ({
  value: inputs.value,
})
