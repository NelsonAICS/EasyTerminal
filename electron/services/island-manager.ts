/**
 * Compatibility state for the EasyTerminal island.
 *
 * Actionable Agent interactions are owned by agent-integration/HookServer and
 * SessionStore. This service intentionally does not infer approvals from
 * terminal text; its legacy detect() endpoint is diagnostics-only.
 */
import Store from 'electron-store'

export interface TUIDetectionResult {
  isRealPrompt: false
  confidence: 0
  menuType: 'none'
  question: ''
  options: never[]
  selectedIndex: -1
}

export interface TUIDetectionConfig {
  sensitivity: number
  smartDetection: boolean
  ignorePatterns: string[]
  minOptions: number
  maxOptions: number
}

interface IslandState {
  agentState: 'idle' | 'thinking' | 'working' | 'waiting' | 'error'
  taskProgress: { current: number; total: number; label: string }
  lastMessage: string
}

const diagnosticResult = (): TUIDetectionResult => ({
  isRealPrompt: false,
  confidence: 0,
  menuType: 'none',
  question: '',
  options: [],
  selectedIndex: -1,
})

export class IslandManager {
  private readonly store: Store
  private config: TUIDetectionConfig
  private state: IslandState = {
    agentState: 'idle',
    taskProgress: { current: 0, total: 0, label: '' },
    lastMessage: '',
  }

  constructor() {
    this.store = new Store({ name: 'island-config' })
    this.config = {
      sensitivity: this.store.get('island.sensitivity', 0.75) as number,
      smartDetection: this.store.get('island.smartDetection', true) as boolean,
      ignorePatterns: this.store.get('island.ignorePatterns', []) as string[],
      minOptions: this.store.get('island.minOptions', 2) as number,
      maxOptions: this.store.get('island.maxOptions', 8) as number,
    }
  }

  getConfig(): TUIDetectionConfig {
    return { ...this.config, ignorePatterns: [...this.config.ignorePatterns] }
  }

  updateConfig(updates: Partial<TUIDetectionConfig>): TUIDetectionConfig {
    this.config = { ...this.config, ...updates }
    for (const [key, value] of Object.entries(updates)) this.store.set(`island.${key}`, value)
    return this.getConfig()
  }

  /** Never promotes ordinary terminal text to an actionable interaction. */
  detect(lines: string[], text: string): TUIDetectionResult {
    void lines
    void text
    return diagnosticResult()
  }

  getState(): IslandState {
    return {
      ...this.state,
      taskProgress: { ...this.state.taskProgress },
    }
  }

  setAgentState(state: IslandState['agentState']): void {
    this.state.agentState = state
  }

  setTaskProgress(current: number, total: number, label: string): void {
    this.state.taskProgress = { current, total, label }
  }

  setLastMessage(message: string): void {
    this.state.lastMessage = message
  }
}

let islandManagerInstance: IslandManager | null = null

export function getIslandManager(): IslandManager {
  if (!islandManagerInstance) islandManagerInstance = new IslandManager()
  return islandManagerInstance
}
