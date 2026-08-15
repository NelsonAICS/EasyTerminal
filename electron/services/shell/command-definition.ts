export type CommandArgumentType = 'string' | 'number' | 'boolean'

export interface CommandArgumentDefinition {
  name: string
  type: CommandArgumentType
  required?: boolean
  pattern?: string
  maxLength?: number
}

export interface CommandDefinition {
  id: string
  name: string
  executable: string
  arguments?: CommandArgumentDefinition[]
  allowedCwdRoots?: string[]
  allowedEnv?: string[]
  maxOutputBytes?: number
  timeoutMs?: number
  status: 'draft' | 'published'
}
