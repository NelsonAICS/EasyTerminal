import type { PortType } from './types'

const compatiblePortTypes: Readonly<Record<PortType, readonly PortType[]>> = {
  text: ['text'],
  number: ['number'],
  boolean: ['boolean'],
  json: ['json', 'table'],
  table: ['table'],
  messages: ['messages'],
  documents: ['documents'],
  artifact: ['artifact'],
  error: ['error'],
}

export function arePortTypesCompatible(source: PortType, target: PortType): boolean {
  return compatiblePortTypes[source].includes(target)
}

export function isPortType(value: unknown): value is PortType {
  return typeof value === 'string' && value in compatiblePortTypes
}
