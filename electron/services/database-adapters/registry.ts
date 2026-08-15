import type { DatabaseAdapter } from './types'

export class DatabaseAdapterRegistry {
  private readonly adapters = new Map<string, DatabaseAdapter>()

  register(databaseId: string, adapter: DatabaseAdapter): void {
    if (!databaseId.trim()) throw new Error('Database id is required')
    if (this.adapters.has(databaseId)) throw new Error(`Database adapter already registered: ${databaseId}`)
    this.adapters.set(databaseId, adapter)
  }

  get(databaseId: string): DatabaseAdapter {
    const adapter = this.adapters.get(databaseId)
    if (!adapter) throw new Error(`Database adapter not found: ${databaseId}`)
    return adapter
  }

  list(): string[] {
    return [...this.adapters.keys()]
  }
}
