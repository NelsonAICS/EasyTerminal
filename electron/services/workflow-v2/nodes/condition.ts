import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const conditionDefinition: PublishedNodeDefinition = {
  type: 'condition',
  version: 1,
  status: 'published',
  executorKind: 'condition',
  inputPorts: [{ id: 'value', type: 'number', required: true }],
  outputPorts: [
    { id: 'true', type: 'number' },
    { id: 'false', type: 'number' },
  ],
  configSchema: { operator: 'greaterThan', threshold: 'number' },
  risk: 'safe',
}

export const conditionExecutor: NodeExecutor = async ({ inputs, config }) => {
  const value = inputs.value
  const threshold = config.threshold
  if (typeof value !== 'number' || typeof threshold !== 'number') {
    throw new Error('condition greaterThan requires numeric value and threshold')
  }
  const branch = value > threshold ? 'true' : 'false'
  return { true: value, false: value, branch }
}
