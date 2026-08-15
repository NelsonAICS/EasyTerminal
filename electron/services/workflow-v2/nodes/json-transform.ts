import type { NodeExecutor, PublishedNodeDefinition } from '../node-definition'

export const jsonTransformDefinition: PublishedNodeDefinition = {
  type: 'json-transform',
  version: 1,
  status: 'published',
  executorKind: 'json-transform',
  inputPorts: [{ id: 'value', type: 'number', required: true }],
  outputPorts: [{ id: 'value', type: 'number' }],
  configSchema: { operation: 'multiply', factor: 'number' },
  risk: 'safe',
}

export const jsonTransformExecutor: NodeExecutor = async ({ inputs, config }) => {
  const value = inputs.value
  const factor = config.factor
  if (typeof value !== 'number' || typeof factor !== 'number') {
    throw new Error('json-transform multiply requires numeric value and factor')
  }
  return { value: value * factor }
}
