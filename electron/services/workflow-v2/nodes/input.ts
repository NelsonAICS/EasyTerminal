import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const inputDefinition: PublishedNodeDefinition = {
  type: 'input',
  version: 1,
  status: 'published',
  executorKind: 'input',
  inputPorts: [],
  outputPorts: [{ id: 'value', type: 'number', required: true }],
  configSchema: {},
  risk: 'safe',
}

export const inputExecutor: NodeExecutor = async ({ inputs }) => ({
  value: inputs.value,
})

export const textInputDefinition: PublishedNodeDefinition = {
  type: 'input.text',
  version: 1,
  status: 'published',
  executorKind: 'input.text',
  inputPorts: [],
  outputPorts: [{ id: 'query', type: 'text', required: true }],
  configSchema: {},
  risk: 'safe',
}

export const textInputExecutor: NodeExecutor = async ({ inputs }) => ({
  query: inputs.query,
})

export const jsonInputDefinition: PublishedNodeDefinition = {
  type: 'input.json',
  version: 1,
  status: 'published',
  executorKind: 'input.json',
  inputPorts: [],
  outputPorts: [{ id: 'value', type: 'json', required: true }],
  configSchema: {},
  risk: 'safe',
}

export const jsonInputExecutor: NodeExecutor = async ({ inputs }) => ({
  value: inputs.value,
})
