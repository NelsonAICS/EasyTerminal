import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const textOutputDefinition: PublishedNodeDefinition = {
  type: 'output.text',
  version: 1,
  status: 'published',
  executorKind: 'output.text',
  inputPorts: [{ id: 'value', type: 'text', required: true, multiple: true }],
  outputPorts: [{ id: 'value', type: 'text' }],
  configSchema: {},
  risk: 'safe',
}

export const textOutputExecutor: NodeExecutor = async ({ inputs }) => ({
  value: inputs.value,
})
