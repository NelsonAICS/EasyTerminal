process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

import { app, BrowserWindow, ipcMain, nativeTheme, Menu, screen, dialog, nativeImage, globalShortcut, clipboard, shell, safeStorage } from 'electron'
import { join, dirname, basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as os from 'node:os'
import * as pty from 'node-pty'
import { exec, execSync, execFileSync, spawn } from 'child_process'
import * as fs from 'node:fs'
import { contextManager } from './context-manager'
import Store from 'electron-store'
import { getDatabase, dbQuery, dbRun, dbGet, dbDelete } from './services/database'
import * as promptManager from './services/prompt-manager'
import * as skillManager from './services/skill-manager'
import * as contextStore from './services/context-store'
import * as preferenceLearner from './services/preference-learner'
import { createContextOrchestrator } from './services/context-orchestrator'
import { createDriftGuard } from './services/drift-guard'
import { createDefaultCapabilityRegistry } from './services/capability-registry'
import { chatCompletion, simpleCompletion, type LLMConfig } from './services/llm-gateway'
import { ProviderRepository } from './services/providers/provider-repository'
import { ProviderRegistry, createDefaultProviderAdapters } from './services/providers/provider-registry'
import type { ProviderKeyValueStore, ProviderSecretVault } from './services/providers/provider-types'
import type { ApplicationModelDefaults, ModelRef, ProviderInput } from '../src/types/model-provider'
import { NodeDefinitionService } from './services/workflow-v2/node-definition-service'
import type { NodeDefinitionStore } from './services/workflow-v2/node-definition-service'
import type { PublishedNodeDefinition } from './services/workflow-v2/node-definition'
import { WorkflowRepository } from './services/workflow-v2/repository'
import { WorkflowRunRepository } from './services/workflow-v2/run-repository'
import { WorkflowRunManager } from './services/workflow-v2/run-manager'
import { createCoreWorkflowRegistries } from './services/workflow-v2/runtime'
import { parseWorkflowCancelRequest, parseWorkflowExecuteRequest, parseWorkflowResumeConfirmationRequest, workflowSaveRevisionRequestSchema } from './services/workflow-v2/ipc-controller'
import { DatabaseAdapterRegistry } from './services/database-adapters/registry'
import { SqliteAdapter } from './services/database-adapters/sqlite-adapter'
import { CommandRegistry } from './services/shell/command-registry'
import { ControlledShellRunner } from './services/shell/controlled-shell-runner'
import { CommandDefinitionService } from './services/shell/command-definition-service'
import type { CommandDefinitionStore } from './services/shell/command-definition-service'
import { createShellService } from './services/workflow-v2/nodes/shell'
import { createSqlService } from './services/workflow-v2/nodes/sql'
import type { SqliteDatabase } from './services/workflow-v2/sqlite'
import { type EmbeddingConfig } from './services/vector-store'
import { getIslandManager } from './services/island-manager'
import * as unifiedSearch from './services/unified-search'
import { executeBrowserScript } from './services/browser-script'
import type { CapabilityKind } from '../src/types/capability'
import type { UIIntent } from '../src/types/ui-intent'
import type { PendingInteraction } from '../src/types/agent-interaction'
import type { FileTreeEntry, ListDirectoryRequest, ListDirectoryResult } from '../src/types/agent-extension'
import { createInstanceId, createTerminalSessionRegistry } from './agent-integration/terminal-session-registry'
import { buildAgentEnvironment, buildAgentHookSocketPath, getTmuxSessionName, resolveTerminalShell } from './agent-integration/pty-environment'
import { createSessionStore } from './agent-integration/session-store'
import { createHookServer, type HookServer } from './agent-integration/hook-server'
import { createInteractionCoordinator, type InteractionCoordinator } from './agent-integration/interaction-coordinator'
import { createDefaultAdapters } from './agent-integration/adapters'
import { installClaudeCodeHook } from './agent-integration/claude-code-hook'
import { installOpenCodePlugin } from './agent-integration/open-code-plugin'
import {
  resolveAnthropicMessagesEndpoint,
  resolveGeminiGenerateContentEndpoint,
  resolveOllamaChatEndpoint,
  resolveOpenAIChatEndpoint,
} from '../src/shared/api-endpoints'

const store = new Store()

class ElectronProviderSecretVault implements ProviderSecretVault {
  private key(providerId: string): string {
    return `workflow_v2_provider_secret:${providerId}`
  }

  get(providerId: string): string | undefined {
    const encrypted = store.get<string | null>(this.key(providerId), null)
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return undefined
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      return undefined
    }
  }

  set(providerId: string, value: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储暂不可用，请稍后重试')
    }
    const encrypted = safeStorage.encryptString(value).toString('base64')
    store.set(this.key(providerId), encrypted)
  }

  delete(providerId: string): void {
    store.delete(this.key(providerId))
  }
}

const providerRepository = new ProviderRepository(
  store as unknown as ProviderKeyValueStore,
  new ElectronProviderSecretVault(),
)
const providerRegistry = new ProviderRegistry({
  repository: providerRepository,
  adapters: createDefaultProviderAdapters(),
})
const nodeDefinitionService = new NodeDefinitionService(store as unknown as NodeDefinitionStore)
const commandDefinitionService = new CommandDefinitionService(store as unknown as CommandDefinitionStore)
let workflowV2Manager: WorkflowRunManager | null = null
let workflowV2Repository: WorkflowRepository | null = null
let workflowV2CommandRegistry: CommandRegistry | null = null

function requireWorkflowV2Manager(): WorkflowRunManager {
  if (!workflowV2Manager) throw new Error('Workflow V2 runtime is not ready')
  return workflowV2Manager
}

function requireWorkflowV2Repository(): WorkflowRepository {
  if (!workflowV2Repository) throw new Error('Workflow V2 repository is not ready')
  return workflowV2Repository
}

function initializeWorkflowV2Runtime(): void {
  const database = getDatabase() as unknown as SqliteDatabase
  workflowV2Repository = new WorkflowRepository(database)
  const runRepository = new WorkflowRunRepository(database, workflowV2Repository)
  const databaseAdapters = new DatabaseAdapterRegistry()
  databaseAdapters.register('default', new SqliteAdapter(database))
  const commandRegistry = new CommandRegistry()
  workflowV2CommandRegistry = commandRegistry
  for (const definition of commandDefinitionService.list()) {
    if (definition.status === 'published') commandRegistry.register({ ...definition, status: 'published' })
  }
  const shellRunner = new ControlledShellRunner(commandRegistry)
  const defaults = () => providerRepository.getDefaults()
  const registries = createCoreWorkflowRegistries({
    llm: {
      chat: (modelRef, messages, tools, systemPrompt) => providerRegistry.chat(modelRef, messages, tools, systemPrompt),
      getDefaultModelRef: () => defaults().defaultLlmModelRef,
    },
    retriever: {
      retrieve: async (query, options) => {
        const modelRef = options.modelRef ?? defaults().defaultEmbeddingModelRef
        if (!modelRef) throw new Error('No default embedding model is configured')
        const connection = providerRepository.getConnection(modelRef.providerId)
        const embeddingConfig: EmbeddingConfig = connection.kind === 'ollama'
          ? { source: 'local', providerId: connection.id, localUrl: connection.baseUrl.replace(/\/v1\/?$/i, ''), model: modelRef.modelId }
          : { source: 'provider', providerId: connection.id, providerBaseUrl: connection.baseUrl, providerEmbeddingEndpoint: connection.embeddingEndpoint, providerApiKey: connection.apiKey, model: modelRef.modelId }
        const knowledgeBase = await import('./services/knowledge-base')
        return knowledgeBase.retrieveWorkflowContext(query, embeddingConfig, options.topK, options.collection)
      },
    },
    sql: createSqlService(databaseAdapters),
    shell: createShellService(shellRunner),
  })
  for (const definition of nodeDefinitionService.list()) {
    if (definition.status === 'published' && !registries.nodes.get(definition.type, definition.version)) {
      registries.nodes.register({ ...definition, status: 'published' })
    }
  }
  workflowV2Manager = new WorkflowRunManager(database, workflowV2Repository, runRepository, registries)
}

// 注入 Store 的 IPC 通信
ipcMain.handle('store:get', (_event, key: string, defaultValue?: unknown) => {
  return store.get(key, defaultValue)
})
ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  store.set(key, value)
  return true
})
ipcMain.handle('store:delete', (_event, key: string) => {
  store.delete(key)
  return true
})

// Workflow V2 Provider API. Renderer receives summaries only; credentials are
// written through Electron safeStorage and are never returned by these DTOs.
ipcMain.handle('provider-v2:list', () => providerRegistry.list())
ipcMain.handle('provider-v2:save', (_event, payload: { provider: ProviderInput; apiKey?: string }) => {
  return providerRegistry.save(payload.provider, payload.apiKey)
})
ipcMain.handle('provider-v2:delete', (_event, providerId: string) => {
  providerRegistry.remove(providerId)
  return true
})
ipcMain.handle('provider-v2:test', async (_event, providerId: string) => providerRegistry.test(providerId))
ipcMain.handle('provider-v2:discover-models', async (_event, providerId: string) => providerRegistry.discoverModels(providerId))
ipcMain.handle('provider-v2:defaults:get', () => providerRegistry.getDefaults())
ipcMain.handle('provider-v2:defaults:set', (_event, defaults: ApplicationModelDefaults) => providerRegistry.setDefaults(defaults))
ipcMain.handle('provider-v2:chat', async (_event, payload: {
  modelRef: ModelRef
  messages: Parameters<typeof chatCompletion>[1]
  systemPrompt?: string
}) => providerRegistry.chat(payload.modelRef, payload.messages, undefined, payload.systemPrompt))
ipcMain.handle('provider-v2:embed', async (_event, payload: { modelRef: ModelRef; input: string | string[] }) => {
  return providerRegistry.embed(payload.modelRef, payload.input)
})

ipcMain.handle('workflow-v2:node-definitions:list', () => nodeDefinitionService.list())
ipcMain.handle('workflow-v2:node-definitions:published', () => {
  const definitions = new Map<string, PublishedNodeDefinition>()
  createCoreWorkflowRegistries().nodes.listPublished().forEach((definition) => definitions.set(`${definition.type}@${definition.version}`, definition))
  nodeDefinitionService.list().filter((definition) => definition.status === 'published').forEach((definition) => {
    definitions.set(`${definition.type}@${definition.version}`, { ...definition, status: 'published' })
  })
  return [...definitions.values()]
})
ipcMain.handle('workflow-v2:node-definitions:save-draft', (_event, input: Parameters<NodeDefinitionService['saveDraft']>[0]) => nodeDefinitionService.saveDraft(input))
ipcMain.handle('workflow-v2:node-definitions:test', (_event, input: { type: string; version: number; values: Record<string, unknown> }) => nodeDefinitionService.test(input.type, input.version, input.values))
ipcMain.handle('workflow-v2:node-definitions:publish', (_event, input: { type: string; version: number }) => {
  const published = nodeDefinitionService.publish(input.type, input.version)
  workflowV2Manager?.registerNodeDefinition(published)
  return published
})
ipcMain.handle('workflow-v2:shell-commands:list', () => commandDefinitionService.list())
ipcMain.handle('workflow-v2:shell-commands:save-draft', (_event, input: Parameters<CommandDefinitionService['saveDraft']>[0]) => commandDefinitionService.saveDraft(input))
ipcMain.handle('workflow-v2:shell-commands:test', (_event, input: { id: string; args: string[] }) => commandDefinitionService.test(input.id, input.args))
ipcMain.handle('workflow-v2:shell-commands:publish', (_event, input: { id: string }) => {
  const published = commandDefinitionService.publish(input.id)
  workflowV2CommandRegistry?.register(published)
  return published
})

ipcMain.handle('workflow-v2:list', () => requireWorkflowV2Repository().listWorkflows())
ipcMain.handle('workflow-v2:get', (_event, workflowId: string, revision?: number) => requireWorkflowV2Repository().requireRevision(workflowId, revision).definition)
ipcMain.handle('workflow-v2:save-revision', (_event, raw: unknown) => {
  const definition = workflowSaveRevisionRequestSchema.parse(raw)
  const repository = requireWorkflowV2Repository()
  return repository.getWorkflow(definition.id)
    ? repository.createRevision(definition).definition
    : repository.createWorkflow(definition).definition
})
ipcMain.handle('workflow-v2:execute', async (event, raw: unknown) => {
  const request = parseWorkflowExecuteRequest(raw)
  return requireWorkflowV2Manager().start(request, (workflowEvent) => {
    if (!event.sender.isDestroyed()) event.sender.send('workflow-v2:event', workflowEvent)
  })
})
ipcMain.handle('workflow-v2:cancel', (_event, raw: unknown) => {
  const request = parseWorkflowCancelRequest(raw)
  return requireWorkflowV2Manager().cancel(request.runId)
})
ipcMain.handle('workflow-v2:resume-confirmation', async (event, raw: unknown) => {
  const request = parseWorkflowResumeConfirmationRequest(raw)
  return requireWorkflowV2Manager().resumeConfirmation(request.confirmationId, request.approved, (workflowEvent) => {
    if (!event.sender.isDestroyed()) event.sender.send('workflow-v2:event', workflowEvent)
  })
})
ipcMain.handle('workflow-v2:get-run', (_event, runId: string) => requireWorkflowV2Manager().getRun(runId))
ipcMain.handle('workflow-v2:get-pending-confirmation', (_event, runId: string) => requireWorkflowV2Manager().getPendingConfirmation(runId))
ipcMain.handle('workflow-v2:runs', (_event, workflowId?: string, limit?: number) => {
  const repository = requireWorkflowV2Repository()
  const database = getDatabase() as unknown as SqliteDatabase
  return new WorkflowRunRepository(database, repository).listRuns(workflowId, limit)
})

ipcMain.handle('theme:set', (_event, source: 'light' | 'dark' | 'system') => {
  nativeTheme.themeSource = source
  return nativeTheme.themeSource
})

// 检测 Ollama 运行状态并列出本地 Embedding 模型
ipcMain.handle('ollama:check', async (_event, baseUrl?: string) => {
  const url = baseUrl || 'http://localhost:11434'
  try {
    // 检测 Ollama 是否运行
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { running: false, models: [] }
    const data = await res.json() as { models: Array<{ name: string; size?: number; modified_at?: string }> }
    // 过滤出 embedding 类模型（常见名称关键词）
    const embeddingKeywords = ['embed', 'bge', 'e5', 'nomic-embed', 'mxbai-embed', 'snowflake-arctic-embed']
    const allModels = (data.models || []).map(m => ({ name: m.name, size: m.size, modified_at: m.modified_at }))
    const embeddingModels = allModels.filter(m =>
      embeddingKeywords.some(kw => m.name.toLowerCase().includes(kw))
    )
    return { running: true, models: allModels, embeddingModels }
  } catch {
    return { running: false, models: [] }
  }
})

// 测试本地 Ollama Embedding
ipcMain.handle('ollama:test-embedding', async (_event, baseUrl: string, model: string) => {
  try {
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: 'test' }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `HTTP ${res.status}: ${errText.substring(0, 150)}` }
    }
    const data = await res.json() as { embedding: number[] }
    if (data.embedding && data.embedding.length > 0) {
      return { success: true, dimensions: data.embedding.length }
    }
    return { success: false, error: '返回数据中没有 embedding 向量' }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : '连接失败' }
  }
})

// 扫描本地 API 配置文件 (如 ~/.claude.json 等)
ipcMain.handle('system:scan-api-keys', () => {
  const keys: Record<string, string> = {}
  const homeDir = os.homedir()

  // ========== Agent 专用配置 ==========

  // 1. Claude Code 配置扫描
  // 1.1 扫描 ~/.claude.json (primaryApiKey)
  try {
    const claudeJsonPath = join(homeDir, '.claude.json')
    if (fs.existsSync(claudeJsonPath)) {
      const content = fs.readFileSync(claudeJsonPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.primaryApiKey) {
        keys['claude_code'] = parsed.primaryApiKey
      }
    }
  } catch (e) {
    console.error('Failed to read ~/.claude.json', e)
  }

  // 1.2 扫描 ~/.claude/settings.json (ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY)
  try {
    const claudeSettingsPath = join(homeDir, '.claude', 'settings.json')
    if (fs.existsSync(claudeSettingsPath)) {
      const content = fs.readFileSync(claudeSettingsPath, 'utf-8')
      const parsed = JSON.parse(content)
      // Claude Code settings.json 结构: { env: { ANTHROPIC_AUTH_TOKEN?, ANTHROPIC_API_KEY? } }
      if (parsed.env) {
        if (parsed.env.ANTHROPIC_AUTH_TOKEN) {
          keys['claude_code'] = parsed.env.ANTHROPIC_AUTH_TOKEN
        } else if (parsed.env.ANTHROPIC_API_KEY) {
          keys['claude_code'] = parsed.env.ANTHROPIC_API_KEY
        }
      }
    }
  } catch (e) {
    console.error('Failed to read ~/.claude/settings.json', e)
  }

  // 2. Codex 配置扫描
  try {
    const codexAuthPath = join(homeDir, '.codex', 'auth.json')
    if (fs.existsSync(codexAuthPath)) {
      const content = fs.readFileSync(codexAuthPath, 'utf-8')
      const parsed = JSON.parse(content)
      // Codex auth.json 结构: { OPENAI_API_KEY }
      if (parsed.OPENAI_API_KEY) {
        keys['codex'] = parsed.OPENAI_API_KEY
      }
    }
  } catch (e) {
    console.error('Failed to read ~/.codex/auth.json', e)
  }

  // 3. GitHub Copilot 配置扫描
  try {
    const copilotPath = join(homeDir, '.config', 'github-copilot', 'config.json')
    if (fs.existsSync(copilotPath)) {
      const content = fs.readFileSync(copilotPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.githubToken || parsed.token) {
        keys['github_copilot'] = parsed.githubToken || parsed.token
      }
    }
  } catch (e) {
    console.error('Failed to read GitHub Copilot config', e)
  }

  // 4. OpenClaw 配置扫描
  try {
    const openclawPath = join(homeDir, '.openclaw', 'config.json')
    if (fs.existsSync(openclawPath)) {
      const content = fs.readFileSync(openclawPath, 'utf-8')
      const parsed = JSON.parse(content)
      // OpenClaw 可能使用多种 API key 格式
      if (parsed.apiKey) {
        keys['openclaw'] = parsed.apiKey
      } else if (parsed.anthropicApiKey) {
        keys['openclaw'] = parsed.anthropicApiKey
      } else if (parsed.env && (parsed.env.ANTHROPIC_API_KEY || parsed.env.ANTHROPIC_AUTH_TOKEN)) {
        keys['openclaw'] = parsed.env.ANTHROPIC_API_KEY || parsed.env.ANTHROPIC_AUTH_TOKEN
      }
    }
  } catch (e) {
    console.error('Failed to read ~/.openclaw/config.json', e)
  }

  // ========== 通用 LLM API 配置 ==========

  // 5. cc-switch 配置扫描
  try {
    const ccPath = join(homeDir, '.cc-switch', 'config.json')
    if (fs.existsSync(ccPath)) {
      const content = fs.readFileSync(ccPath, 'utf-8')
      const parsed = JSON.parse(content)
      if (parsed.providers) {
        for (const [pid, config] of Object.entries<Record<string, unknown>>(parsed.providers)) {
          const configRecord = config as Record<string, unknown>
          if (configRecord.apiKey) {
            // 映射 cc-switch provider ID 到我们的 ID
            if (pid === 'anthropic' && !keys['claude_code']) {
              keys['anthropic'] = String(configRecord.apiKey)
            } else if (pid === 'openai' && !keys['codex']) {
              keys['openai'] = String(configRecord.apiKey)
            } else if (pid === 'gemini') {
              keys['gemini'] = String(configRecord.apiKey)
            } else if (pid === 'deepseek') {
              keys['deepseek'] = String(configRecord.apiKey)
            } else if (pid === 'zhipu') {
              keys['zhipu'] = String(configRecord.apiKey)
            } else if (pid === 'minimax') {
              keys['minimax'] = String(configRecord.apiKey)
            } else if (pid === 'kimi') {
              keys['kimi'] = String(configRecord.apiKey)
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to read ~/.cc-switch/config.json', e)
  }

  // 6. 环境变量 (作为最后兜底)
  if (!keys['codex'] && process.env.OPENAI_API_KEY) keys['openai'] = process.env.OPENAI_API_KEY
  if (!keys['claude_code'] && !keys['anthropic']) {
    if (process.env.ANTHROPIC_AUTH_TOKEN) {
      keys['anthropic'] = process.env.ANTHROPIC_AUTH_TOKEN
    } else if (process.env.ANTHROPIC_API_KEY) {
      keys['anthropic'] = process.env.ANTHROPIC_API_KEY
      keys['claude_code'] = process.env.ANTHROPIC_API_KEY
    }
  }
  if (!keys['gemini'] && process.env.GEMINI_API_KEY) keys['gemini'] = process.env.GEMINI_API_KEY

  return keys
})

const safeReadText = (filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return null
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

const safeReadJson = (filePath: string): Record<string, unknown> | null => {
  try {
    const content = safeReadText(filePath)
    if (!content) return null
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

const readDirEntries = (dirPath: string) => {
  try {
    if (!fs.existsSync(dirPath)) return []
    return fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }
}

const listDirectoryNames = (dirPath: string, limit = 24) => {
  return readDirEntries(dirPath)
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit)
}

const countDirectoryEntries = (dirPath: string, type: 'file' | 'dir' | 'any' = 'any') => {
  return readDirEntries(dirPath).filter(entry => {
    if (type === 'file') return entry.isFile()
    if (type === 'dir') return entry.isDirectory()
    return true
  }).length
}

const countNonEmptyLines = (filePath: string) => {
  const content = safeReadText(filePath)
  if (!content) return 0
  return content.split('\n').filter(line => line.trim()).length
}

const uniqueValues = (values: string[], limit = 24) => {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).slice(0, limit)
}

const readRecord = (value: unknown) => {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

const readStringArray = (value: unknown) => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

const decodeClaudeProjectPath = (value: string) => {
  if (!value.startsWith('-')) return value
  return value.replace(/^-/, '/').replace(/-/g, '/')
}

const buildClaudeHabits = (settingsLocal: Record<string, unknown> | null) => {
  const permissions = readRecord(settingsLocal?.permissions)
  const allowRules = readStringArray(permissions?.allow)
  const toolCounts: Record<string, number> = {}
  const bashCommands: Record<string, number> = {}
  const mcpHints = new Set<string>()

  for (const rule of allowRules) {
    const toolMatch = rule.match(/^([A-Za-z][A-Za-z0-9_-]*)/)
    if (toolMatch) {
      const tool = toolMatch[1]
      toolCounts[tool] = (toolCounts[tool] || 0) + 1
    }

    const bashMatch = rule.match(/^Bash\((?:[A-Z0-9_]+=[^ )]+\s+)*([A-Za-z0-9._-]+)/)
    if (bashMatch) {
      const command = bashMatch[1]
      bashCommands[command] = (bashCommands[command] || 0) + 1
    }

    const lowerRule = rule.toLowerCase()
    if (lowerRule.includes('mcporter')) mcpHints.add('mcporter')
    const inlineMatches = rule.match(/[A-Za-z0-9._-]*mcp[A-Za-z0-9._-]*/gi) || []
    inlineMatches.forEach(match => mcpHints.add(match))
  }

  const topCommands = Object.entries(bashCommands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([command]) => command)

  const habits = []
  if (toolCounts.Bash) {
    habits.push({
      label: '命令执行偏好',
      detail: `放行 ${toolCounts.Bash} 条 Bash 权限，常见命令包括 ${topCommands.join('、') || 'bash'}。`,
      count: toolCounts.Bash,
    })
  }
  if (toolCounts.WebFetch) {
    habits.push({
      label: '网页抓取习惯',
      detail: `记录到 ${toolCounts.WebFetch} 条 WebFetch 权限，偏向边抓取边处理资料。`,
      count: toolCounts.WebFetch,
    })
  }
  if (toolCounts.WebSearch) {
    habits.push({
      label: '联网检索习惯',
      detail: `存在 ${toolCounts.WebSearch} 条 WebSearch 权限。`,
      count: toolCounts.WebSearch,
    })
  }
  if (mcpHints.size > 0) {
    habits.push({
      label: 'MCP / 工具桥接习惯',
      detail: `检测到 ${mcpHints.size} 个 MCP 相关线索，说明用户有跨工具调用习惯。`,
      count: mcpHints.size,
    })
  }

  return {
    habits,
    mcpHints: uniqueValues(Array.from(mcpHints), 18),
    allowRuleCount: allowRules.length,
  }
}

const parseCodexToml = (content: string) => {
  const result: {
    model?: string
    reasoningEffort?: string
    projects: Array<{ path: string; trustLevel?: string }>
    plugins: string[]
  } = {
    projects: [],
    plugins: [],
  }

  let activeProjectPath: string | null = null
  let activePluginName: string | null = null
  const enabledPlugins = new Set<string>()

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const modelMatch = line.match(/^model\s*=\s*"([^"]+)"/)
    if (modelMatch) {
      result.model = modelMatch[1]
      continue
    }

    const reasoningMatch = line.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/)
    if (reasoningMatch) {
      result.reasoningEffort = reasoningMatch[1]
      continue
    }

    const projectHeaderMatch = line.match(/^\[projects\."(.+)"\]$/)
    if (projectHeaderMatch) {
      activeProjectPath = projectHeaderMatch[1]
      activePluginName = null
      result.projects.push({ path: activeProjectPath })
      continue
    }

    const pluginHeaderMatch = line.match(/^\[plugins\."(.+)"\]$/)
    if (pluginHeaderMatch) {
      activePluginName = pluginHeaderMatch[1]
      activeProjectPath = null
      result.plugins.push(activePluginName)
      continue
    }

    const trustMatch = line.match(/^trust_level\s*=\s*"([^"]+)"/)
    if (trustMatch && activeProjectPath) {
      const project = result.projects.find(item => item.path === activeProjectPath)
      if (project) project.trustLevel = trustMatch[1]
      continue
    }

    const enabledMatch = line.match(/^enabled\s*=\s*(true|false)/)
    if (enabledMatch && activePluginName && enabledMatch[1] === 'true') {
      enabledPlugins.add(activePluginName)
    }
  }

  result.plugins = uniqueValues(Array.from(enabledPlugins.size > 0 ? enabledPlugins : new Set(result.plugins)), 24)
  return result
}

const parseOpenClawConfig = (config: Record<string, unknown> | null) => {
  const projectValues = []
  const workspaces = readStringArray(config?.workspaces)
  const projects = readStringArray(config?.projects)
  const trustedPaths = readStringArray(config?.trustedPaths)
  const workspaceRecord = readRecord(config?.workspaces)
  const mcpRecord = readRecord(config?.mcpServers) || readRecord(config?.mcp) || readRecord(config?.mcp_servers)
  const pluginsValue = config?.plugins

  for (const item of [...workspaces, ...projects, ...trustedPaths]) {
    projectValues.push({ label: basename(item) || item, path: item })
  }

  if (workspaceRecord) {
    for (const key of Object.keys(workspaceRecord)) {
      projectValues.push({ label: basename(key) || key, path: key })
    }
  }

  const pluginNames = Array.isArray(pluginsValue)
    ? pluginsValue.filter((item): item is string => typeof item === 'string')
    : Object.keys(readRecord(pluginsValue) || {})

  return {
    model: typeof config?.model === 'string' ? config.model : typeof config?.modelName === 'string' ? config.modelName : undefined,
    reasoningEffort: typeof config?.reasoningEffort === 'string' ? config.reasoningEffort : typeof config?.reasoning === 'string' ? config.reasoning : undefined,
    workspaces: uniqueValues(projectValues.map(item => `${item.label}|||${item.path}`), 18).map(value => {
      const [label, path] = value.split('|||')
      return { label, path }
    }),
    plugins: uniqueValues(pluginNames, 18),
    mcpServers: uniqueValues(Object.keys(mcpRecord || {}), 18),
    apiConfigured: Boolean(
      config?.apiKey ||
      config?.anthropicApiKey ||
      config?.openaiApiKey ||
      (readRecord(config?.env)?.ANTHROPIC_API_KEY) ||
      (readRecord(config?.env)?.OPENAI_API_KEY)
    ),
  }
}

ipcMain.handle('agent:migration-scan', () => {
  const homeDir = os.homedir()

  const claudeRoot = join(homeDir, '.claude')
  const claudeSettingsPath = join(claudeRoot, 'settings.json')
  const claudeSettingsLocalPath = join(claudeRoot, 'settings.local.json')
  const claudePluginsPath = join(claudeRoot, 'plugins', 'installed_plugins.json')
  const claudeSettings = safeReadJson(claudeSettingsPath)
  const claudeSettingsLocal = safeReadJson(claudeSettingsLocalPath)
  const claudePlugins = safeReadJson(claudePluginsPath)
  const claudeSkillNames = listDirectoryNames(join(claudeRoot, 'skills'), 18)
  const claudeProjectNames = listDirectoryNames(join(claudeRoot, 'projects'), 50)
  const claudeHabits = buildClaudeHabits(claudeSettingsLocal)
  const claudePluginKeys = Object.keys(readRecord(claudePlugins?.plugins) || {})
  const claudeSkillMcpHints = claudeSkillNames.filter(name => name.toLowerCase().includes('mcp'))
  const claudeApiConfigured = Boolean(
    readRecord(claudeSettings?.env)?.ANTHROPIC_AUTH_TOKEN ||
    readRecord(claudeSettings?.env)?.ANTHROPIC_API_KEY ||
    safeReadJson(join(homeDir, '.claude.json'))?.primaryApiKey
  )

  const codexRoot = join(homeDir, '.codex')
  const codexConfigPath = join(codexRoot, 'config.toml')
  const codexAuthPath = join(codexRoot, 'auth.json')
  const codexConfigText = safeReadText(codexConfigPath) || ''
  const codexConfig = parseCodexToml(codexConfigText)
  const codexAuth = safeReadJson(codexAuthPath)
  const codexSkillNames = listDirectoryNames(join(codexRoot, 'skills'), 18)

  const openClawRoot = join(homeDir, '.openclaw')
  const openClawConfigPath = join(openClawRoot, 'config.json')
  const openClawConfig = safeReadJson(openClawConfigPath)
  const parsedOpenClaw = parseOpenClawConfig(openClawConfig)
  const sourceErrors: Record<string, string> = {}
  for (const [sourceId, sourceRoot] of [['claude', claudeRoot], ['codex', codexRoot], ['openclaw', openClawRoot]] as const) {
    if (!fs.existsSync(sourceRoot)) continue
    try {
      fs.readdirSync(sourceRoot)
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code || 'EIO') : 'EIO'
      sourceErrors[sourceId] = code === 'EACCES' || code === 'EPERM' ? '没有权限读取来源目录。' : '来源目录读取失败。'
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    sources: [
      {
        id: 'claude',
        label: 'Claude Code',
        detected: fs.existsSync(claudeRoot),
        rootPath: claudeRoot,
        apiConfigured: claudeApiConfigured,
        model: undefined,
        reasoningEffort: undefined,
        configFiles: [
          fs.existsSync(claudeSettingsPath) ? 'settings.json' : '',
          fs.existsSync(claudeSettingsLocalPath) ? 'settings.local.json' : '',
          fs.existsSync(claudePluginsPath) ? 'plugins/installed_plugins.json' : '',
        ].filter(Boolean),
        skills: claudeSkillNames,
        skillsCount: countDirectoryEntries(join(claudeRoot, 'skills'), 'dir'),
        plugins: uniqueValues(claudePluginKeys.map(item => item.split('@')[0]), 18),
        pluginsCount: claudePluginKeys.length,
        mcpServers: uniqueValues([...claudeHabits.mcpHints, ...claudeSkillMcpHints], 18),
        mcpCount: uniqueValues([...claudeHabits.mcpHints, ...claudeSkillMcpHints], 999).length,
        workspaces: claudeProjectNames.map(projectName => {
          const decodedPath = decodeClaudeProjectPath(projectName)
          return {
            label: basename(decodedPath) || projectName,
            path: decodedPath,
          }
        }),
        habitSignals: [
          ...claudeHabits.habits,
          ...(claudeHabits.allowRuleCount > 0 ? [{
            label: '权限策略沉淀',
            detail: `本地累计 ${claudeHabits.allowRuleCount} 条权限放行记录，可用于迁移常用工具策略。`,
            count: claudeHabits.allowRuleCount,
          }] : []),
        ],
        memorySignals: [
          ...(countNonEmptyLines(join(claudeRoot, 'history.jsonl')) > 0 ? [{
            label: '对话 / 历史记录',
            detail: `history.jsonl 中有 ${countNonEmptyLines(join(claudeRoot, 'history.jsonl'))} 条记录。`,
            count: countNonEmptyLines(join(claudeRoot, 'history.jsonl')),
          }] : []),
          ...(countDirectoryEntries(join(claudeRoot, 'sessions')) > 0 ? [{
            label: '会话快照',
            detail: `sessions 目录中有 ${countDirectoryEntries(join(claudeRoot, 'sessions'))} 个条目。`,
            count: countDirectoryEntries(join(claudeRoot, 'sessions')),
          }] : []),
          ...(countDirectoryEntries(join(claudeRoot, 'plans')) > 0 ? [{
            label: '规划沉淀',
            detail: `plans 目录中有 ${countDirectoryEntries(join(claudeRoot, 'plans'))} 个条目。`,
            count: countDirectoryEntries(join(claudeRoot, 'plans')),
          }] : []),
          ...(countDirectoryEntries(join(claudeRoot, 'tasks')) > 0 ? [{
            label: '任务历史',
            detail: `tasks 目录中有 ${countDirectoryEntries(join(claudeRoot, 'tasks'))} 个条目。`,
            count: countDirectoryEntries(join(claudeRoot, 'tasks')),
          }] : []),
        ],
        notes: [
          claudePluginKeys.length > 0 ? `检测到 ${claudePluginKeys.length} 个插件安装记录。` : '',
          claudeSkillNames.length > 0 ? 'skills 数量较多，界面中默认只展示样本。' : '',
        ].filter(Boolean),
      },
      {
        id: 'codex',
        label: 'Codex',
        detected: fs.existsSync(codexRoot),
        rootPath: codexRoot,
        apiConfigured: Boolean(codexAuth?.OPENAI_API_KEY || codexAuth?.openai_api_key || codexAuth?.token),
        model: codexConfig.model,
        reasoningEffort: codexConfig.reasoningEffort,
        configFiles: [
          fs.existsSync(codexConfigPath) ? 'config.toml' : '',
          fs.existsSync(codexAuthPath) ? 'auth.json' : '',
        ].filter(Boolean),
        skills: codexSkillNames,
        skillsCount: countDirectoryEntries(join(codexRoot, 'skills'), 'dir'),
        plugins: codexConfig.plugins,
        pluginsCount: codexConfig.plugins.length,
        mcpServers: [],
        mcpCount: 0,
        workspaces: codexConfig.projects.map(project => ({
          label: basename(project.path) || project.path,
          path: project.path,
          trustLevel: project.trustLevel,
        })),
        habitSignals: [
          ...(codexConfig.projects.length > 0 ? [{
            label: '工作区信任策略',
            detail: `检测到 ${codexConfig.projects.length} 个项目信任配置。`,
            count: codexConfig.projects.length,
          }] : []),
          ...(codexConfig.plugins.length > 0 ? [{
            label: '插件工作流',
            detail: `启用了 ${codexConfig.plugins.length} 个插件，可迁移为目标平台的 tools / extensions。`,
            count: codexConfig.plugins.length,
          }] : []),
        ],
        memorySignals: [
          ...(countNonEmptyLines(join(codexRoot, 'history.jsonl')) > 0 ? [{
            label: '命令历史',
            detail: `history.jsonl 中有 ${countNonEmptyLines(join(codexRoot, 'history.jsonl'))} 条记录。`,
            count: countNonEmptyLines(join(codexRoot, 'history.jsonl')),
          }] : []),
          ...(countDirectoryEntries(join(codexRoot, 'sessions')) > 0 ? [{
            label: '会话记录',
            detail: `sessions 目录中有 ${countDirectoryEntries(join(codexRoot, 'sessions'))} 个条目。`,
            count: countDirectoryEntries(join(codexRoot, 'sessions')),
          }] : []),
          ...(countDirectoryEntries(join(codexRoot, 'shell_snapshots')) > 0 ? [{
            label: 'Shell 快照',
            detail: `shell_snapshots 中有 ${countDirectoryEntries(join(codexRoot, 'shell_snapshots'))} 个条目。`,
            count: countDirectoryEntries(join(codexRoot, 'shell_snapshots')),
          }] : []),
          ...(fs.existsSync(join(codexRoot, 'logs_2.sqlite')) ? [{
            label: '日志数据库',
            detail: '存在本地日志数据库，可作为长期沉淀线索。',
          }] : []),
        ],
        notes: [
          codexConfig.model ? `当前默认模型为 ${codexConfig.model}。` : '',
          codexConfig.reasoningEffort ? `推理强度为 ${codexConfig.reasoningEffort}。` : '',
        ].filter(Boolean),
      },
      {
        id: 'openclaw',
        label: 'OpenClaw',
        detected: fs.existsSync(openClawRoot),
        rootPath: openClawRoot,
        apiConfigured: parsedOpenClaw.apiConfigured,
        model: parsedOpenClaw.model,
        reasoningEffort: parsedOpenClaw.reasoningEffort,
        configFiles: [
          fs.existsSync(openClawConfigPath) ? 'config.json' : '',
        ].filter(Boolean),
        skills: listDirectoryNames(join(openClawRoot, 'skills'), 18),
        skillsCount: countDirectoryEntries(join(openClawRoot, 'skills'), 'dir'),
        plugins: parsedOpenClaw.plugins,
        pluginsCount: parsedOpenClaw.plugins.length,
        mcpServers: parsedOpenClaw.mcpServers,
        mcpCount: parsedOpenClaw.mcpServers.length,
        workspaces: parsedOpenClaw.workspaces,
        habitSignals: [
          ...(parsedOpenClaw.plugins.length > 0 ? [{
            label: '扩展生态',
            detail: `检测到 ${parsedOpenClaw.plugins.length} 个插件或扩展项。`,
            count: parsedOpenClaw.plugins.length,
          }] : []),
          ...(parsedOpenClaw.mcpServers.length > 0 ? [{
            label: 'MCP 配置',
            detail: `检测到 ${parsedOpenClaw.mcpServers.length} 个 MCP / server 线索。`,
            count: parsedOpenClaw.mcpServers.length,
          }] : []),
        ],
        memorySignals: [
          ...(countNonEmptyLines(join(openClawRoot, 'history.jsonl')) > 0 ? [{
            label: '历史记录',
            detail: `history.jsonl 中有 ${countNonEmptyLines(join(openClawRoot, 'history.jsonl'))} 条记录。`,
            count: countNonEmptyLines(join(openClawRoot, 'history.jsonl')),
          }] : []),
          ...(countDirectoryEntries(join(openClawRoot, 'sessions')) > 0 ? [{
            label: '会话记录',
            detail: `sessions 目录中有 ${countDirectoryEntries(join(openClawRoot, 'sessions'))} 个条目。`,
            count: countDirectoryEntries(join(openClawRoot, 'sessions')),
          }] : []),
          ...(countDirectoryEntries(join(openClawRoot, 'memories')) > 0 ? [{
            label: '记忆目录',
            detail: `memories 目录中有 ${countDirectoryEntries(join(openClawRoot, 'memories'))} 个条目。`,
            count: countDirectoryEntries(join(openClawRoot, 'memories')),
          }] : []),
        ],
        notes: [
          fs.existsSync(openClawRoot) ? '采用宽松解析，优先抽取可迁移信息。' : '当前机器未发现 ~/.openclaw，本项保留用于后续迁移。',
        ],
      },
    ],
    errors: Object.values(sourceErrors),
    sourceErrors,
  }
})

// ========== Proxy Takeover IPC ==========

// Proxy state management
interface ProxyState {
  enabled: boolean;
  port: number;
  appId: string | null;
}

const proxyState: ProxyState = {
  enabled: false,
  port: 8080,
  appId: null
};

// HTTP proxy server instance
let proxyServer: ReturnType<typeof exec> | null = null;

// Enable proxy for a specific app
ipcMain.handle('proxy:enable', async (_event, appId: string) => {
  try {
    console.log(`[Proxy] Enabling proxy for app: ${appId}`);

    // Stop existing proxy if running
    if (proxyServer) {
      proxyServer.kill();
      proxyServer = null;
    }

    // Get provider config for the app
    const agents: Record<string, unknown>[] = store.get('api_agents', []) as Record<string, unknown>[];
    const providers: Record<string, unknown>[] = store.get('model_providers', []) as Record<string, unknown>[];

    const agent = agents.find((a: Record<string, unknown>) => a.id === appId);
    if (!agent) {
      return { success: false, error: 'App not found' };
    }

    const provider = providers.find((p: Record<string, unknown>) => p.id === (agent as Record<string, unknown>).providerId);
    if (!provider || !(provider as Record<string, string>).apiKey) {
      return { success: false, error: 'Provider or API key not found' };
    }

    // Create proxy configuration script
    const homeDir = os.homedir();
    const proxyConfigPath = join(homeDir, '.easyterminal', 'proxy-config.json');

    const proxyConfig = {
      appId,
      provider: {
        id: (provider as Record<string, string>).id,
        baseUrl: (provider as Record<string, string>).baseUrl,
        apiKey: (provider as Record<string, string>).apiKey,
        chatEndpoint: (provider as Record<string, string>).chatEndpoint,
        embeddingEndpoint: (provider as Record<string, string>).embeddingEndpoint
      },
      port: proxyState.port
    };

    // Ensure directory exists
    const proxyDir = join(homeDir, '.easyterminal');
    if (!fs.existsSync(proxyDir)) {
      fs.mkdirSync(proxyDir, { recursive: true });
    }

    fs.writeFileSync(proxyConfigPath, JSON.stringify(proxyConfig, null, 2));

    // Start a simple TCP proxy using socat or similar
    // For now, we just track the state - actual proxy implementation would require
    // a more sophisticated approach with node-http-proxy or similar
    proxyState.enabled = true;
    proxyState.appId = appId;

    console.log(`[Proxy] Proxy enabled for ${appId} on port ${proxyState.port}`);
    return { success: true, port: proxyState.port, appId };
  } catch (err) {
    console.error('[Proxy] Failed to enable proxy:', err);
    return { success: false, error: String(err) };
  }
});

// Disable proxy
ipcMain.handle('proxy:disable', async () => {
  try {
    console.log('[Proxy] Disabling proxy');

    if (proxyServer) {
      proxyServer.kill();
      proxyServer = null;
    }

    proxyState.enabled = false;
    proxyState.appId = null;

    return { success: true };
  } catch (err) {
    console.error('[Proxy] Failed to disable proxy:', err);
    return { success: false, error: String(err) };
  }
});

// Get proxy status
ipcMain.handle('proxy:status', async () => {
  return {
    enabled: proxyState.enabled,
    port: proxyState.port,
    appId: proxyState.appId
  };
});

// App-specific configuration IPC
ipcMain.handle('app-config:read', async (_event, appId: string, key: string) => {
  const appConfigs: Record<string, Record<string, unknown>> = store.get('app_configs', {});
  return appConfigs[appId]?.[key] ?? null;
});

ipcMain.handle('app-config:write', async (_event, appId: string, key: string, value: unknown) => {
  const appConfigs: Record<string, Record<string, unknown>> = store.get('app_configs', {});
  if (!appConfigs[appId]) {
    appConfigs[appId] = {};
  }
  appConfigs[appId][key] = value;
  store.set('app_configs', appConfigs);
  return true;
});

// Provider test IPC (enhanced)
ipcMain.handle('provider:test', async (_event, provider: Record<string, string>) => {
  try {
    const { id, baseUrl, apiKey, models, apiFormat, chatEndpoint } = provider;

    let endpoint = baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: string | null = null;

    if (id === 'gemini') {
      const model = models.split(',')[0] || 'gemini-1.5-flash';
      endpoint = resolveGeminiGenerateContentEndpoint(baseUrl, model, apiKey, chatEndpoint);
      body = JSON.stringify({
        contents: [{ parts: [{ text: "hi" }] }]
      });
    } else if (id === 'ollama') {
      endpoint = resolveOllamaChatEndpoint(baseUrl, chatEndpoint);
      body = JSON.stringify({
        model: models.split(',')[0] || 'llama3',
        messages: [{ role: 'user', content: 'hi' }],
        stream: false
      });
    } else if (apiFormat === 'anthropic' || id === 'anthropic' || id === 'minimax' || id === 'doubao') {
      endpoint = resolveAnthropicMessagesEndpoint(baseUrl, chatEndpoint);
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: models.split(',')[0] || 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      });
    } else {
      endpoint = resolveOpenAIChatEndpoint(baseUrl, chatEndpoint);
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = JSON.stringify({
        model: models.split(',')[0] || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      });
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText.substring(0, 150)}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
});

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Enable GPU Acceleration for better transparent window rendering on macOS
// app.disableHardwareAcceleration()

// Match the persisted renderer theme before the first native window is shown.
// The renderer repeats this through theme:set when the preference is loaded.
const defaultThemeMigrationKey = 'ui_theme_default_migrated_v1'
const storedTheme = store.get('ui_theme', 'liquid-glass')
const defaultThemeMigrated = store.get(defaultThemeMigrationKey, false)
if (!defaultThemeMigrated) {
  // Obsidian was the old hard-coded default. Migrate that legacy default once,
  // while preserving any theme the user chooses after this version.
  if (storedTheme === 'obsidian') store.set('ui_theme', 'liquid-glass')
  store.set(defaultThemeMigrationKey, true)
}
const persistedTheme = store.get('ui_theme', 'liquid-glass')
nativeTheme.themeSource = ['porcelain', 'meadow', 'catppuccin-latte'].includes(String(persistedTheme)) ? 'light' : 'dark'

let win: BrowserWindow | null = null
let islandWin: BrowserWindow | null = null
let islandRendererReady = false

// Fix for transparent windows on macOS causing SharedImageManager::ProduceSkia errors
app.commandLine.appendSwitch('disable-features', 'IOSurfaceCapturer,HardwareMediaKeyHandling')
app.commandLine.appendSwitch('enable-transparent-visuals')

// Keep the terminal executable separate from Electron's `shell` module.
// The latter is used by file actions such as trashing and revealing items in Finder.
const shellCommand = resolveTerminalShell(process.platform, process.env)

// GUI-launched apps do not always inherit the interactive shell PATH. Resolve
// it once from the same login shell used by the PTY so commands such as
// `claude`, `node` and `npm` behave like they do in Terminal.app.
if (process.platform !== 'win32') {
  try {
    const userPath = execFileSync(shellCommand, ['-ilc', 'printf %s "$PATH"'], {
      encoding: 'utf8',
      env: process.env,
    }).trim()
    if (userPath && userPath.includes('/')) {
      process.env.PATH = userPath
    }
  } catch {
    // Ignored
  }
}
process.env.SHELL = shellCommand

// Check if tmux exists
let hasTmux = false
try {
  if (os.platform() !== 'win32') {
    execSync('which tmux', { stdio: 'ignore' })
    hasTmux = true
  }
} catch {
    hasTmux = false
  }

let isQuitting = false;
let suppressMainActivationUntil = 0;

app.on('before-quit', () => {
  isQuitting = true;
});

const terminals: Record<string, pty.IPty> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionLoggers: Record<string, any> = {}
const currentCwd = process.env.HOME || process.cwd()
let currentUIIntent: UIIntent | null = null
const appInstanceId = createInstanceId()
const terminalSessionRegistry = createTerminalSessionRegistry()
const agentSessionStore = createSessionStore()
let agentHookServer: HookServer | null = null
let interactionCoordinator: InteractionCoordinator | null = null
let interactionExpiryTimer: NodeJS.Timeout | null = null

function publishIslandInteraction(interaction: PendingInteraction) {
  if (!islandWin || islandWin.isDestroyed() || !islandRendererReady) return
  const terminalSessionName = terminalSessionRegistry.get(interaction.terminalSessionId)?.label ?? interaction.terminalSessionId
  islandWin.showInactive()
  islandWin.webContents.send('island:interaction', { ...interaction, terminalSessionName })
}

function publishIslandInteractionState(interaction: PendingInteraction) {
  if (!islandWin || islandWin.isDestroyed() || !islandRendererReady) return
  const terminalSessionName = terminalSessionRegistry.get(interaction.terminalSessionId)?.label ?? interaction.terminalSessionId
  islandWin.webContents.send('island:interaction-state', { ...interaction, terminalSessionName })
}

function markIslandRendererReady() {
  if (!islandWin || islandWin.isDestroyed()) return
  islandRendererReady = true
  for (const interaction of agentSessionStore.listPending()) publishIslandInteraction(interaction)
}

function getAgentHookSocketPath() {
  return buildAgentHookSocketPath(appInstanceId, process.platform)
}

function initializeAgentIntegration() {
  try {
    const hook = installClaudeCodeHook({
      homePath: app.getPath('home'),
      userDataPath: app.getPath('userData'),
      platform: process.platform,
    })
    console.info(`[AgentIntegration] Claude Code Hook ${hook.changed ? 'installed' : 'ready'}: ${hook.configPath}`)
  } catch (error) {
    console.error('[AgentIntegration] Claude Code Hook installation failed:', error)
  }
  try {
    const plugin = installOpenCodePlugin({ homePath: app.getPath('home') })
    console.info(`[AgentIntegration] OpenCode plugin ${plugin.changed ? 'installed' : 'ready'}: ${plugin.pluginPath}`)
  } catch (error) {
    console.error('[AgentIntegration] OpenCode plugin installation failed:', error)
  }

  const adapters = createDefaultAdapters()
  interactionCoordinator = createInteractionCoordinator({
    store: agentSessionStore,
    registry: terminalSessionRegistry,
    adapters,
    transport: {
      sendHook: async (payload, interaction) => {
        if (!agentHookServer) throw new Error('hook_server_unavailable')
        await agentHookServer.sendResponse(payload, interaction)
      },
      writePty: async (terminalSessionId, payload, interaction) => {
        const session = terminalSessionRegistry.get(terminalSessionId)
        if (!session?.alive || !session.pty) throw new Error('session_closed')
        session.pty.write(`${JSON.stringify(payload)}\r`)
        console.warn(`[AgentIntegration] PTY compatibility response for ${interaction.interactionId}`)
      },
    },
    onStateChange: publishIslandInteractionState,
  })
  agentHookServer = createHookServer({
    socketPath: getAgentHookSocketPath(),
    registry: terminalSessionRegistry,
    store: agentSessionStore,
    adapters,
    onInteraction: interactionId => {
      const interaction = agentSessionStore.getInteraction(interactionId)
      if (interaction) publishIslandInteraction(interaction)
    },
    onAck: event => interactionCoordinator?.handleAck(event) ?? { ok: false, code: 'coordinator_unavailable', message: '响应协调器未初始化' },
  })
  void agentHookServer.start().catch(error => console.error('[AgentIntegration] Failed to start Hook Server:', error))
  interactionExpiryTimer = setInterval(() => interactionCoordinator?.expire(), 1000)
  interactionExpiryTimer.unref()
}

function broadcastUIIntent(intent: UIIntent | null) {
  currentUIIntent = intent
  if (win && !win.isDestroyed()) {
    win.webContents.send('ui:intent:updated', intent)
  }
}

const getIconPath = () => {
  const p = app.isPackaged 
    ? join(__dirname, '../dist/icon.png') 
    : join(__dirname, '../build/icon.png')
  console.log('Icon path:', p);
  return p;
}

const getNativeIcon = () => {
  return nativeImage.createFromPath(getIconPath())
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    titleBarStyle: 'hiddenInset',
    transparent: true,
    backgroundColor: '#00000000',
    ...(process.platform !== 'darwin' && { icon: getNativeIcon() }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      // allow webview to load local files during dev
      webSecurity: false
    },
  })

  const expectedWebviewPreload = app.isPackaged
    ? join(__dirname, '../dist/webview-preload.js')
    : join(__dirname, '../public/webview-preload.js')
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    const requestedPreload = typeof params.preload === 'string' ? params.preload.replace(/^file:\/\//, '') : ''
    if (requestedPreload && resolve(requestedPreload) !== resolve(expectedWebviewPreload)) {
      event.preventDefault()
      console.warn('[WebView] blocked untrusted preload:', params.preload)
      return
    }
    webPreferences.preload = expectedWebviewPreload
    webPreferences.allowRunningInsecureContent = false
    webPreferences.webSecurity = true
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') void shell.openExternal(parsed.toString())
    } catch {
      // Invalid and non-web URLs are denied.
    }
    return { action: 'deny' }
  })

  // Intercept window close event to show confirmation dialog
  win.on('close', (e) => {
    // Prevent default closing if we haven't decided to quit yet
    if (!isQuitting) {
      e.preventDefault();
      console.log('Main window is closing! (event fired)');

      // Only show confirmation if we have running terminals
      const hasRunningTerminals = Object.keys(terminals).length > 0;
      
      if (hasRunningTerminals) {
        const choice = dialog.showMessageBoxSync(win!, {
          type: 'question',
          buttons: ['取消 (Cancel)', '不保留记录退出 (Discard & Quit)', '保留记录退出 (Save & Quit)'],
          defaultId: 2,
          cancelId: 0,
          title: '确认退出',
          message: '确定要退出 EasyTerminal 吗？',
          detail: '退出将终止所有正在运行的终端会话。您是否要保留当前会话的上下文记录？',
          icon: getNativeIcon()
        });
        
        if (choice === 0) {
          return; // User clicked Cancel, stop here
        }

        // choice === 1 means Discard, choice === 2 means Save
        const shouldSave = choice === 2;

        for (const id in terminals) {
          try { 
            if (sessionLoggers[id]) {
              if (shouldSave) {
                sessionLoggers[id].end();
              } else {
                // Call a destroy method that closes the stream and deletes the file
                if (typeof sessionLoggers[id].destroy === 'function') {
                  sessionLoggers[id].destroy();
                } else {
                  sessionLoggers[id].end();
                }
              }
              delete sessionLoggers[id];
            }
            terminals[id].kill() 
          } catch {
            // Ignored
          }
          delete terminals[id]
        }
      } else {
        // No running terminals, just cleanup and quit normally
        for (const id in terminals) {
          delete terminals[id]
        }
      }
      
      // Destroy island window to prevent ghost process
      if (islandWin && !islandWin.isDestroyed()) {
        console.log('Destroying island window');
        islandRendererReady = false
        islandWin.destroy()
        islandWin = null;
      }

      for (const id of Object.keys(terminals)) {
        terminalSessionRegistry.invalidate(id)
        agentSessionStore.cancelForTerminalSession(id)
      }
      void agentHookServer?.stop()
      if (interactionExpiryTimer) {
        clearInterval(interactionExpiryTimer)
        interactionExpiryTimer = null
      }
      
      // Set quitting flag and trigger actual app quit
      isQuitting = true;
      
      // Clean up win reference early to avoid extra callbacks
      const currentWin = win;
      win = null;
      if (currentWin && !currentWin.isDestroyed()) {
        currentWin.destroy();
      }
      
      app.quit();
    }
  });

  islandWin = new BrowserWindow({
    width: 600,
    height: 600,
    x: Math.round((screen.getPrimaryDisplay().workAreaSize.width - 600) / 2),
    y: 20,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    show: false,
    ...(process.platform !== 'darwin' && { icon: getNativeIcon() }),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  })
  
  islandWin.setAlwaysOnTop(true, 'screen-saver')
  islandWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  islandWin.setFocusable(false)

  // Enable click-through for transparent areas (macOS supports this well)
  islandWin.setIgnoreMouseEvents(true, { forward: true })

  islandWin.webContents.on('did-finish-load', () => {
    islandRendererReady = false
  })
  islandWin.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    islandRendererReady = false
    console.error('[AgentIntegration] Island renderer failed to load:', errorCode, errorDescription)
  })
  islandWin.webContents.on('render-process-gone', (_event, details) => {
    islandRendererReady = false
    console.error('[AgentIntegration] Island renderer exited:', details)
  })
  islandWin.on('closed', () => {
    islandRendererReady = false
    islandWin = null
  })

  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('win render-process-gone:', details);
  });
  
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('win did-fail-load:', errorCode, errorDescription);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    islandWin.loadURL(process.env.VITE_DEV_SERVER_URL + '#island')
    win.webContents.openDevTools()
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
    islandWin.loadFile(join(__dirname, '../dist/index.html'), { hash: 'island' })
  }

}

app.setName('EasyTerminal')

// Store the last time the global shortcut was triggered to prevent duplicate fires
let lastShortcutTrigger = 0;

// ──────────────────────────────────────────────────────────────────
// Agent Extension IPC Handlers
// ──────────────────────────────────────────────────────────────────

// Helper: build LLMConfig from stored settings
function buildLLMConfig(providerId?: string, model?: string): LLMConfig | null {
  const defaultRef = providerRepository.getDefaults().defaultLlmModelRef
  if (!providerId && !model && defaultRef) {
    try {
      const connection = providerRepository.getConnection(defaultRef.providerId)
      return {
        provider: connection.id,
        baseUrl: connection.baseUrl,
        chatEndpoint: connection.chatEndpoint,
        apiKey: connection.apiKey,
        model: defaultRef.modelId,
        apiFormat: connection.kind === 'anthropic' ? 'anthropic' : 'openai_chat',
      }
    } catch {
      // Fall through to the legacy settings until the Provider V2 entry is fixed.
    }
  }
  const providers = store.get('model_providers', []) as Array<{ id: string; baseUrl: string; chatEndpoint?: string; apiKey: string; models: string; icon: string; apiFormat?: string }>;
  const settings = store.get('app_settings') as { reasoningModel?: { providerId: string; model: string } } | null;

  // Use reasoning model if no specific provider given
  const targetProviderId = providerId || settings?.reasoningModel?.providerId;
  const targetModel = model || settings?.reasoningModel?.model;
  const provider = providers.find((p: { id: string }) => p.id === targetProviderId);

  if (!provider || !targetModel) return null;
  return {
    provider: provider.id,
    baseUrl: provider.baseUrl,
    chatEndpoint: provider.chatEndpoint,
    apiKey: provider.apiKey,
    model: targetModel,
    apiFormat: provider.apiFormat as 'anthropic' | 'openai_chat' | undefined,
  };
}

function buildEmbeddingConfig(): EmbeddingConfig {
  const settings = store.get('app_settings') as { embeddingModel?: EmbeddingConfig } | null;
  const em = settings?.embeddingModel;
  const defaultRef = providerRepository.getDefaults().defaultEmbeddingModelRef
  if (defaultRef) {
    try {
      const connection = providerRepository.getConnection(defaultRef.providerId)
      return {
        source: connection.kind === 'ollama' ? 'local' : 'provider',
        providerId: connection.id,
        localUrl: connection.kind === 'ollama' ? connection.baseUrl.replace(/\/v1\/?$/i, '') : undefined,
        providerBaseUrl: connection.kind === 'ollama' ? undefined : connection.baseUrl,
        providerEmbeddingEndpoint: connection.embeddingEndpoint,
        providerApiKey: connection.apiKey,
        model: defaultRef.modelId,
      }
    } catch {
      // Fall through to the existing application setting.
    }
  }
  if (!em) return { source: 'local', localUrl: 'http://localhost:11434', model: '' };

  if (em.source === 'local') {
    return { source: 'local', localUrl: em.localUrl || 'http://localhost:11434', model: em.model };
  }
  if (em.source === 'provider') {
    const providers = store.get('model_providers', []) as Array<{ id: string; baseUrl: string; embeddingEndpoint?: string; apiKey: string }>;
    const p = providers.find((pr: { id: string }) => pr.id === em.providerId);
    return {
      source: 'provider',
      providerId: p?.id,
      providerBaseUrl: p?.baseUrl,
      providerEmbeddingEndpoint: p?.embeddingEndpoint,
      providerApiKey: p?.apiKey,
      model: em.model
    };
  }
  return {
    source: 'custom',
    customBaseUrl: em.customBaseUrl,
    customEmbeddingEndpoint: em.customEmbeddingEndpoint,
    customApiKey: em.customApiKey,
    model: em.model
  };
}

const capabilityRegistry = createDefaultCapabilityRegistry({
  getLLMConfig: buildLLMConfig,
  getEmbeddingConfig: buildEmbeddingConfig,
  listContextArtifacts: () => contextManager.listArtifacts(),
  saveContextSnippet: (content: string, source?: string) => contextManager.saveContextSnippet(content, source),
  queryContextRecords: (filters) => contextStore.queryRecords(filters),
  listContextSnapshots: (filters) => contextStore.listSnapshots(filters),
  listSessionEvents: (sessionId: string, limit?: number) => contextStore.listSessionEvents(sessionId, limit),
  setUIIntent: (intent: UIIntent) => {
    const nextIntent: UIIntent = {
      ...intent,
      createdAt: intent.createdAt || new Date().toISOString(),
    };
    broadcastUIIntent(nextIntent);
    return nextIntent;
  },
  clearUIIntent: () => {
    broadcastUIIntent(null);
    return true;
  },
  listWorkflowV2: () => requireWorkflowV2Repository().listWorkflows(),
  getWorkflowV2: (workflowId: string) => requireWorkflowV2Repository().requireRevision(workflowId).definition,
  executeWorkflowV2: (workflowId: string, input: Record<string, unknown>) => requireWorkflowV2Manager().start({ workflowId, input }),
});

const driftGuard = createDriftGuard();

const contextOrchestrator = createContextOrchestrator({
  getEmbeddingConfig: buildEmbeddingConfig,
  projectRoot: process.cwd(),
  driftGuard,
});

// ── Prompt Manager ────────────────────────────────────────────────
ipcMain.handle('prompt:list', (_e, category?: string) => promptManager.listPrompts(category));
ipcMain.handle('prompt:get', (_e, id: string) => promptManager.getPrompt(id));
ipcMain.handle('prompt:create', (_e, data: { title: string; content: string; category?: string; tags?: string[] }) => promptManager.createPrompt(data));
ipcMain.handle('prompt:update', (_e, id: string, data: Partial<{ title: string; content: string; category: string; tags: string[] }>) => promptManager.updatePrompt(id, data));
ipcMain.handle('prompt:delete', (_e, id: string) => promptManager.deletePrompt(id));
ipcMain.handle('prompt:render', (_e, id: string, values: Record<string, string>) => promptManager.renderPrompt(id, values));
ipcMain.handle('prompt:search', (_e, query: string) => promptManager.searchPrompts(query));
ipcMain.handle('prompt:optimize', async (_e, draftPrompt: string) => {
  const config = buildLLMConfig();
  if (!config) throw new Error('No reasoning model configured');
  return promptManager.optimizePrompt(config, draftPrompt);
});

// ── Skill Manager ─────────────────────────────────────────────────
ipcMain.handle('skill:list', (_e, category?: string) => skillManager.listSkills(category));
ipcMain.handle('skill:get', (_e, id: string) => skillManager.getSkill(id));
ipcMain.handle('skill:delete', (_e, id: string) => skillManager.deleteSkill(id));
ipcMain.handle('skill:toggle', (_e, id: string, enabled: boolean) => skillManager.toggleSkill(id, enabled));
ipcMain.handle('skill:categories', () => skillManager.getSkillCategories());
ipcMain.handle('skill:reindex', async () => {
  const embConfig = buildEmbeddingConfig();
  return skillManager.reindexSkills(embConfig);
});
ipcMain.handle('skill:search', async (_e, query: string, topK?: number) => {
  const embConfig = buildEmbeddingConfig();
  return skillManager.searchSkills(query, embConfig, topK);
});

// ── Knowledge Base ────────────────────────────────────────────────
ipcMain.handle('kb:list', async (_e, collection?: string) => {
  const kb = await import('./services/knowledge-base');
  return kb.listDocuments(collection);
});
ipcMain.handle('kb:get', async (_e, id: string) => {
  const kb = await import('./services/knowledge-base');
  return kb.getDocument(id);
});
ipcMain.handle('kb:delete', async (_e, id: string) => {
  const kb = await import('./services/knowledge-base');
  return kb.deleteDocument(id);
});
ipcMain.handle('kb:collections', async () => {
  const kb = await import('./services/knowledge-base');
  return kb.getCollections();
});
ipcMain.handle('kb:add-document', async (_e, filePath: string, collection?: string) => {
  const kb = await import('./services/knowledge-base');
  const embConfig = buildEmbeddingConfig();
  return kb.addDocument(filePath, embConfig, collection);
});
ipcMain.handle('kb:retrieve', async (_e, query: string, topK?: number, collection?: string) => {
  const kb = await import('./services/knowledge-base');
  const embConfig = buildEmbeddingConfig();
  return kb.retrieveContext(query, embConfig, topK, collection);
});
ipcMain.handle('kb:build-rag-prompt', async (_e, query: string, topK?: number, collection?: string) => {
  const kb = await import('./services/knowledge-base');
  const embConfig = buildEmbeddingConfig();
  return kb.buildRAGPrompt(query, embConfig, topK, collection);
});

// ── Capability Registry ──────────────────────────────────────────
ipcMain.handle('capability:list', (_e, query?: string, kinds?: CapabilityKind[]) => {
  return capabilityRegistry.list({ query, kinds });
});
ipcMain.handle('capability:get', (_e, id: string) => capabilityRegistry.get(id));
ipcMain.handle('capability:invoke', async (_e, id: string, input?: Record<string, unknown>) => {
  return capabilityRegistry.invoke(id, input || {});
});

// ── ReAct Engine (direct agent invocation) ────────────────────────
type AgentRuntimeRunner = {
  run: (
    query: string,
    toolNames?: string[],
    options?: { providerId?: string; model?: string; sessionId?: string; taskId?: string },
  ) => Promise<unknown>
}

let _agentRuntime: AgentRuntimeRunner | null = null;

const getAgentRuntime = async () => {
  if (!_agentRuntime) {
    const { createAgentRuntime } = await import('./services/agent-runtime');
    _agentRuntime = createAgentRuntime({
      getLLMConfig: buildLLMConfig,
      buildContextPacket: (options: unknown) => contextOrchestrator.buildContextPacket(options as { sessionId?: string; types?: string[]; maxTokens?: number }),
      capabilityRegistry,
      readFile: async (filePath: string) => {
        try {
          return fs.readFileSync(filePath, 'utf-8').substring(0, 10000);
        } catch (err: unknown) {
          return `Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      },
      runCommand: async (command: string) => {
        return new Promise((resolve) => {
          exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (error) resolve(`Error: ${error.message}\n${stderr}`);
            else resolve(stdout || stderr || '(no output)');
          });
        });
      },
      sendStreamEvent: (event: unknown) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('agent:stream', event);
        }
      },
    });
  }
  return _agentRuntime;
};

ipcMain.handle('agent:react', async (
  _event,
  query: string,
  toolNames?: string[],
  options?: { providerId?: string; model?: string; sessionId?: string; taskId?: string }
) => {
  const runtime = await getAgentRuntime();
  return runtime.run(query, toolNames, options);
});

// ── UI Intent ─────────────────────────────────────────────────────
ipcMain.handle('ui:intent:get-current', () => currentUIIntent);
ipcMain.handle('ui:intent:set', (_event, intent: UIIntent) => {
  const nextIntent: UIIntent = {
    ...intent,
    createdAt: intent.createdAt || new Date().toISOString(),
  };
  broadcastUIIntent(nextIntent);
  return nextIntent;
});
ipcMain.handle('ui:intent:clear', () => {
  broadcastUIIntent(null);
  return true;
});
ipcMain.handle('ui:intent:action', (_event, actionId: string, intent?: UIIntent | null) => {
  console.log('[UIIntent] Action triggered:', actionId, intent?.id || currentUIIntent?.id || 'no-intent');
  return { ok: true, actionId, intentId: intent?.id || currentUIIntent?.id || null };
});

// ── Direct LLM call ───────────────────────────────────────────────
ipcMain.handle('llm:chat', async (_e, messages: Array<{ role: string; content: string }>, providerId?: string, model?: string) => {
  const config = buildLLMConfig(providerId, model);
  if (!config) throw new Error('No LLM configured');
  return chatCompletion(config, messages as Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>);
});

ipcMain.handle('llm:simple', async (_e, prompt: string, systemPrompt?: string, providerId?: string, model?: string) => {
  const config = buildLLMConfig(providerId, model);
  if (!config) throw new Error('No LLM configured');
  return simpleCompletion(config, prompt, systemPrompt);
});

// ── Initialize database on startup ────────────────────────────────
ipcMain.handle('db:init', () => {
  getDatabase();
  return true;
});

// ── Preference Learning ────────────────────────────────────────────
ipcMain.handle('preference:learn-prompt', (_event, prompt: string) => {
  preferenceLearner.learnFromPrompt(prompt);
});

ipcMain.handle('preference:learn-skill', (_event, skillId: string, skillName: string) => {
  preferenceLearner.learnFromSkill(skillId, skillName);
});

ipcMain.handle('preference:learn-language', (_event, language: string) => {
  preferenceLearner.learnFromLanguage(language);
});

ipcMain.handle('preference:get', (_event, scope?: string) => {
  return preferenceLearner.getPreferences(scope);
});

ipcMain.handle('preference:build-block', () => {
  return preferenceLearner.buildStyleBlock();
});

app.whenReady().then(() => {
  // Migrate the legacy provider list once safeStorage is available. The new
  // provider API stores only encrypted credentials and safe summaries.
  try {
    providerRepository.migrateLegacyProviders(store.get('model_providers', []))
  } catch (error) {
    console.warn('[Provider V2] legacy provider migration skipped:', error instanceof Error ? error.message : error)
  }
  try {
    initializeWorkflowV2Runtime()
  } catch (error) {
    console.error('[Workflow V2] runtime initialization failed:', error)
  }

  // Always ensure dock is visible
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
    if (!app.isPackaged) {
      const icon = getNativeIcon();
      app.dock.setIcon(icon);
    }
  }

  ipcMain.handle('get-context-path', () => contextManager.basePath)

  ipcMain.handle('get-webview-preload-path', () => {
    // In dev: /Users/.../public/webview-preload.js
    // In prod: /Users/.../Contents/Resources/app.asar/dist/webview-preload.js
    const p = app.isPackaged
      ? join(__dirname, '../dist/webview-preload.js')
      : join(__dirname, '../public/webview-preload.js')
    console.log('Resolved webview preload path:', p)
    return p
  })

  initializeAgentIntegration()
  createWindow()

  // 注册全局快捷键 (Scheme A)
  // 当用户按下 Cmd+Shift+C 时，自动模拟 Cmd+C 复制选中内容，然后再提取剪贴板
  const shortcutKey = 'CommandOrControl+Shift+C';
  
  if (globalShortcut.isRegistered(shortcutKey)) {
    globalShortcut.unregister(shortcutKey);
  }

  const shortcutRegistered = globalShortcut.register(shortcutKey, () => {
    // 节流机制：防止 macOS 上模拟按键时产生的按键粘连或开发环境热重载导致的二次触发
    const now = Date.now();
    if (now - lastShortcutTrigger < 1000) {
      console.log('[GlobalShortcut] Ignored duplicate trigger within 1s');
      return;
    }
    lastShortcutTrigger = now;

    if (process.platform === 'darwin') {
      // 1. 记录下当前的剪贴板内容（用于恢复或对比）
      const oldClipboardText = clipboard.readText();
      console.log(`[GlobalShortcut] Triggered. Old clipboard length: ${oldClipboardText.length}`);

      // 2. 清空剪贴板，以便明确检测到 Cmd+C 是否成功写入了新内容
      clipboard.clear();

      // 3. 延迟 300ms，等待用户松开物理按键 (Cmd+Shift+C 中的 Shift 等)，防止干扰模拟按键
      setTimeout(() => {
        // 4. 模拟 Cmd+C 按键
        // 针对 WPS 等软件，使用更底层的 key code 8 (C键) 而不是 keystroke "c"，以防被中文输入法拦截
        const script = 'tell application "System Events" to key code 8 using {command down}';
        
        exec(`osascript -e '${script}'`, (error) => {
          if (error) {
            console.error('[GlobalShortcut] Failed to simulate Cmd+C', error);
            clipboard.writeText(oldClipboardText); // 恢复剪贴板
            if (win && !win.isDestroyed()) {
              win.webContents.send('notification:show', {
                title: 'Permission Required',
                body: 'Please grant Accessibility permission in System Settings to capture selected text.',
                type: 'error'
              });
            }
            return;
          }

          // 5. 开启轮询 (Polling) 机制等待剪贴板被新内容填充
          let attempts = 0;
          const maxAttempts = 15; // 最多等 1.5 秒 (15 * 100ms)

          const checkClipboard = () => {
            // 强制底层重新同步系统剪贴板状态
            clipboard.availableFormats();
            const newText = clipboard.readText();
            
            console.log(`[GlobalShortcut] Polling ${attempts + 1}/${maxAttempts}... New length: ${newText.length}, Is empty: ${!newText}`);
            
            // 如果剪贴板不再为空，说明 Cmd+C 成功复制了新内容！
            if (newText && newText.trim() !== '') {
              const result = contextManager.saveContextSnippet(newText, 'GlobalShortcut');
              if (result) {
                if (result.isSensitive) {
                  if (islandWin && !islandWin.isDestroyed()) {
                    islandWin.showInactive();
                    islandWin.webContents.send('island:prompt', {
                      message: '⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。',
                      options: [{ key: 'ok', label: '我知道了' }],
                      sessionId: 'system',
                      sessionName: 'Privacy Alert'
                    });
                  }
                } else {
                  if (win && !win.isDestroyed()) {
                    win.webContents.send('notification:show', {
                      title: 'Context Captured',
                      body: 'Selected text saved successfully.',
                      type: 'success'
                    });
                  }
                }
              }
              return; // 结束轮询
            }
            
            // 如果超时了还是空，说明用户可能没选中任何文本，或者 Cmd+C 依然被拦截
            if (attempts >= maxAttempts) {
              console.log('[GlobalShortcut] Timeout reached. Cmd+C failed or no text selected.');
              clipboard.writeText(oldClipboardText); // 恢复旧剪贴板内容
              if (win && !win.isDestroyed()) {
                win.webContents.send('notification:show', {
                  title: 'Capture Failed',
                  body: 'No text was selected or copy failed. Please try Cmd+C manually.',
                  type: 'warning'
                });
              }
              return; // 结束轮询，并且【不保存】任何内容
            }
            
            // 还没内容，再等 100ms 继续查
            attempts++;
            setTimeout(checkClipboard, 100);
          };

          // 启动第一次检查
          setTimeout(checkClipboard, 100);
        });
      }, 300); // 延迟结束
    } else {
      // Windows / Linux fallback (assumes text is already copied by user manually before pressing hotkey)
      setTimeout(() => {
        const text = clipboard.readText();
        if (text && text.trim()) {
          const result = contextManager.saveContextSnippet(text, 'GlobalShortcut');
          if (result) {
            if (result.isSensitive) {
              if (islandWin && !islandWin.isDestroyed()) {
                islandWin.showInactive();
                islandWin.webContents.send('island:prompt', {
                  message: '⚠️ 已保存，但检测到内容可能包含敏感隐私（如账号、资产等），请注意数据安全。',
                  options: [{ key: 'ok', label: '我知道了' }],
                  sessionId: 'system',
                  sessionName: 'Privacy Alert'
                });
              }
            } else {
              if (win && !win.isDestroyed()) {
                win.webContents.send('notification:show', {
                  title: 'Context Captured',
                  body: 'Clipboard saved successfully.',
                  type: 'success'
                });
              }
            }
          }
        }
      }, 100);
    }
  });

  if (!shortcutRegistered) {
    console.error(`[GlobalShortcut] Failed to register ${shortcutKey}. It might be used by another app.`);
  }

  /* 
  // Disable automatic clipboard sniffing as per user request
  setInterval(() => {
    if (process.platform === 'darwin') clipboard.availableFormats();
    const text = clipboard.readText();
    if (text && text.trim()) {
      contextManager.saveContextSnippet(text, 'ClipboardSniffer');
    }
  }, 60 * 60 * 1000);
  */
  
  // Set up PTY IPC
  ipcMain.on('pty:kill', (_event, id) => {
    terminalSessionRegistry.invalidate(id)
    agentSessionStore.cancelForTerminalSession(id)
    if (terminals[id]) {
      if (sessionLoggers[id]) {
        sessionLoggers[id].end()
        delete sessionLoggers[id]
      }
      try {
        terminals[id].kill()
      } catch {
        // Ignored
      }
      delete terminals[id]
    }
  })

  ipcMain.on('pty:rename', (_event, id: string, label: string) => {
    terminalSessionRegistry.updateLabel(id, label)
  })

  ipcMain.on('pty:create', (event, id) => {
    if (terminals[id]) return

    let command = shellCommand
    let args: string[] = []
    const tmuxSessionName = hasTmux ? getTmuxSessionName(id) : undefined
    const registration = terminalSessionRegistry.register({
      terminalSessionId: id,
      instanceId: appInstanceId,
      label: id,
      ...(tmuxSessionName ? { tmuxSessionName } : {}),
    })

    if (hasTmux) {
      // Use tmux to create or attach to a session
      command = 'tmux'
      // Pass the shell explicitly for newly created sessions. Otherwise tmux
      // may use /bin/sh or a stale default-shell and hide the user's CLI PATH.
      args = ['new-session', '-A', '-s', tmuxSessionName as string, shellCommand, '-l']
      // tmux servers can outlive a tab. Refresh the session-scoped identity
      // before attaching so an old token cannot remain trusted.
      for (const [key, value] of Object.entries({
        EASYTERMINAL_TERMINAL_SESSION_ID: registration.terminalSessionId,
        EASYTERMINAL_CHANNEL_TOKEN: registration.channelToken,
        EASYTERMINAL_HOOK_SOCKET: getAgentHookSocketPath(),
        EASYTERMINAL_INSTANCE_ID: registration.instanceId,
      })) {
        try {
          execFileSync('tmux', ['set-environment', '-t', tmuxSessionName, key, value], { stdio: 'ignore' })
        } catch {
          // A new tmux session receives the PTY environment below. Existing
          // sessions are updated best-effort before attachment.
        }
      }
    } else if (os.platform() !== 'win32') {
      // Launch as login shell so aliases and profiles (.zshrc) are loaded
      args = ['-l']
    }

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: currentCwd,
      env: buildAgentEnvironment(process.env, registration, getAgentHookSocketPath(), shellCommand)
    })
    terminalSessionRegistry.attachPty(id, ptyProcess)

    // Create non-blocking logger for this session
    sessionLoggers[id] = contextManager.createSessionLogger(id, id);

    ptyProcess.onData((data) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:${id}`, data)
      }
      
      // Stream to local Markdown file seamlessly
      if (sessionLoggers[id]) {
        sessionLoggers[id].write(data);
      }
    })

    ptyProcess.onExit(() => {
      terminalSessionRegistry.markPtyExit(id)
      agentSessionStore.cancelForTerminalSession(id)
      delete terminals[id]
      delete sessionLoggers[id]
    })

    terminals[id] = ptyProcess
    event.reply(`pty:created:${id}`)
  })

  ipcMain.on('pty:write', (_event, id, data) => {
    terminals[id]?.write(data)
  })

  ipcMain.on('pty:resize', (_event, id, cols, rows) => {
    terminals[id]?.resize(cols, rows)
  })

  // Simple Autocomplete via IPC
  ipcMain.handle('autocomplete:path', async (_event, partialPath: string, baseDir?: string) => {
    try {
      const cwd = baseDir && fs.existsSync(baseDir) ? baseDir : currentCwd
      const partialDir = dirname(partialPath)
      const searchDir = partialPath.startsWith('/')
        ? dirname(partialPath)
        : partialDir === '.'
          ? cwd
          : join(cwd, partialDir)
      const searchPrefix = basename(partialPath)
      const displayPrefix = partialPath.startsWith('/') || partialDir === '.'
        ? ''
        : `${partialDir.replace(/\\/g, '/')}/`

      if (!fs.existsSync(searchDir)) return []

      const files = fs.readdirSync(searchDir)
      return files
        .filter(f => f.startsWith(searchPrefix))
        .map(f => {
          const fullPath = join(searchDir, f)
          const isDir = fs.statSync(fullPath).isDirectory()
          return `${displayPrefix}${isDir ? `${f}/` : f}`
        })
    } catch {
        return []
      }
  })

  // --- Fuzzy Autocomplete ---
  let cachedCliTools: string[] | null = null
  let cachedHistoryEntries: string[] | null = null
  let cachedHistoryLoadedAt = 0

  const isReasonableCommandToken = (value: string) => {
    const token = value.trim()
    if (!token) return false
    if (token.includes('\uFFFD')) return false
    if (token.length > 64) return false
    if (token.startsWith('/') && !token.startsWith('./') && !token.startsWith('../')) return false
    for (let i = 0; i < token.length; i++) {
      if (token.charCodeAt(i) < 32) return false
    }
    return /^(?:[A-Za-z0-9_.-]+|\.{1,2}\/[A-Za-z0-9_./-]+)$/.test(token)
  }

  const readRecentShellHistory = (limit = 120) => {
    const now = Date.now()
    if (cachedHistoryEntries && now - cachedHistoryLoadedAt < 15_000) {
      return cachedHistoryEntries.slice(0, limit)
    }

    const homeDir = process.env.HOME || '/'
    const sources = [
      {
        path: join(homeDir, '.zsh_history'),
        normalize: (line: string) => {
          const idx = line.indexOf(';')
          return (idx >= 0 ? line.slice(idx + 1) : line).trim()
        },
      },
      {
        path: join(homeDir, '.bash_history'),
        normalize: (line: string) => line.trim(),
      },
    ]

    const entries: string[] = []
    const seen = new Set<string>()

    for (const source of sources) {
      try {
        if (!fs.existsSync(source.path)) continue
        const raw = fs.readFileSync(source.path, 'utf-8')
        const lines = raw.split('\n').map(source.normalize).filter(Boolean)
        for (const line of lines.reverse()) {
          if (line.includes('\uFFFD')) continue
          if (line.length > 280) continue
          if (seen.has(line)) continue
          seen.add(line)
          entries.push(line)
          if (entries.length >= limit) break
        }
      } catch {
        // ignore broken history files
      }

      if (entries.length >= limit) break
    }

    cachedHistoryEntries = entries
    cachedHistoryLoadedAt = now
    return entries.slice(0, limit)
  }

  const extractHistoryCommandTokens = (entries: string[], limit = 80) => {
    const tokens: string[] = []
    const seen = new Set<string>()
    for (const line of entries) {
      const cmd = line.trim().split(/\s+/)[0]
      if (!cmd || !isReasonableCommandToken(cmd) || seen.has(cmd)) continue
      seen.add(cmd)
      tokens.push(cmd)
      if (tokens.length >= limit) break
    }
    return tokens
  }

  const scoreFuzzyCandidate = (candidate: string, query: string) => {
    const lower = candidate.toLowerCase()
    let score = 0
    let qi = 0

    if (lower.startsWith(query)) {
      score = 1200 + query.length * 12
    } else {
      for (let ci = 0; ci < lower.length && qi < query.length; ci++) {
        if (lower[ci] !== query[qi]) continue
        score += 10
        if (ci === 0 || '/_- .'.includes(lower[ci - 1])) {
          score += 8
        }
        qi++
      }
      if (qi < query.length) return null
    }

    return score
  }

  const collectFileCandidates = (rootDir: string, maxDepth = 5, maxEntries = 1200) => {
    const results: Array<{ path: string; isDir: boolean }> = []
    const ignored = new Set(['.git', 'node_modules', 'dist', 'dist-electron', 'release'])

    const walk = (relativeDir: string, depth: number) => {
      if (results.length >= maxEntries || depth > maxDepth) return

      const absoluteDir = relativeDir ? join(rootDir, relativeDir) : rootDir
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(absoluteDir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (results.length >= maxEntries) break
        if (ignored.has(entry.name)) continue

        const normalizedPath = relativeDir
          ? `${relativeDir.replace(/\\/g, '/')}/${entry.name}`
          : entry.name

        if (entry.isDirectory()) {
          results.push({ path: `${normalizedPath}/`, isDir: true })
          walk(normalizedPath, depth + 1)
        } else if (entry.isFile()) {
          results.push({ path: normalizedPath.replace(/\\/g, '/'), isDir: false })
        }
      }
    }

    walk('', 0)
    return results
  }

  ipcMain.handle('autocomplete:fuzzy', async (_event, query: string) => {
    if (!query.trim()) return []

    // Lazy-load CLI tools from PATH
    if (!cachedCliTools) {
      try {
        const pathEnv = process.env.PATH || ''
        const pathDirs = pathEnv.split(':').filter(Boolean)
        const toolSet = new Set<string>()
        for (const dir of pathDirs) {
          try {
            const entries = fs.readdirSync(dir)
            for (const entry of entries) {
              try {
                const fullPath = join(dir, entry)
                const stat = fs.statSync(fullPath)
                if (stat.isFile() && (stat.mode & 0o111)) {
                  toolSet.add(entry)
                }
              } catch { /* skip */ }
            }
          } catch { /* skip dir */ }
        }
        cachedCliTools = Array.from(toolSet).sort()
      } catch {
        cachedCliTools = []
      }
    }

    const q = query.toLowerCase()
    const historyEntries = readRecentShellHistory()
    const historyTokens = extractHistoryCommandTokens(historyEntries)
    const candidates = [...new Set([...historyEntries, ...historyTokens, ...cachedCliTools])]
    const scored: { cmd: string; score: number }[] = []

    for (const cmd of candidates) {
      const score = scoreFuzzyCandidate(cmd, q)
      if (score === null) continue
      const histIdx = historyEntries.indexOf(cmd)
      const tokenIdx = historyTokens.indexOf(cmd)
      const historyBoost = histIdx >= 0 ? (historyEntries.length - histIdx) * 3 : 0
      const tokenBoost = tokenIdx >= 0 ? (historyTokens.length - tokenIdx) * 2 : 0
      scored.push({ cmd, score })
      scored[scored.length - 1].score += historyBoost + tokenBoost
    }

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 8).map(s => s.cmd)
  })

  ipcMain.handle('autocomplete:history', async (_event, query: string) => {
    const historyEntries = readRecentShellHistory(120)
    const q = query.trim().toLowerCase()
    if (!q) return historyEntries.slice(0, 12)

    const scored: { cmd: string; score: number }[] = []
    for (const cmd of historyEntries) {
      const score = scoreFuzzyCandidate(cmd, q)
      if (score === null) continue
      const historyBoost = (historyEntries.length - historyEntries.indexOf(cmd)) * 4
      scored.push({ cmd, score: score + historyBoost })
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 12).map(item => item.cmd)
  })

  ipcMain.handle('autocomplete:files', async (_event, query: string, baseDir?: string, options?: {
    localOnly?: boolean
    preferDirectories?: boolean
    directoriesFirst?: boolean
  }) => {
    const cwd = baseDir && fs.existsSync(baseDir) ? baseDir : currentCwd
    const needle = query.trim().toLowerCase()
    const localOnly = options?.localOnly ?? false
    const preferDirectories = options?.preferDirectories ?? false
    const directoriesFirst = options?.directoriesFirst ?? false

    try {
      const immediateEntries = fs.readdirSync(cwd, { withFileTypes: true })
        .map(entry => ({
          path: entry.isDirectory() ? `${entry.name}/` : entry.name,
          isDir: entry.isDirectory(),
        }))

      if (!needle) {
        return immediateEntries
          .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.path.localeCompare(b.path))
          .slice(0, 16)
          .map(entry => ({
            path: entry.path,
            isDir: entry.isDir,
          }))
      }

      const entries = localOnly ? immediateEntries : collectFileCandidates(cwd, 5, 1200)

      const scored: { path: string; isDir: boolean; score: number }[] = []
      for (const entry of entries) {
        const normalized = entry.path.replace(/\\/g, '/')
        const candidate = normalized.toLowerCase()
        const basenamePart = basename(normalized.replace(/\/$/, '')).toLowerCase()
        const score = Math.max(
          scoreFuzzyCandidate(candidate, needle) ?? -1,
          scoreFuzzyCandidate(basenamePart, needle) ?? -1,
        )
        if (score < 0) continue
        scored.push({
          path: normalized,
          isDir: entry.isDir,
          score: score + (preferDirectories && entry.isDir ? 16 : entry.isDir ? 6 : 0),
        })
      }

      return scored
        .sort((a, b) => {
          if (directoriesFirst && a.isDir !== b.isDir) return Number(b.isDir) - Number(a.isDir)
          return b.score - a.score || a.path.localeCompare(b.path)
        })
        .slice(0, 12)
        .map(item => ({ path: item.path, isDir: item.isDir }))
    } catch {
      return []
    }
  })

  ipcMain.handle('dialog:open-file', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window || undefined, {
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0] || null;
  })

ipcMain.handle('context:list', () => contextManager.listArtifacts())
ipcMain.handle('context:save-snippet', (_event, content: string, source?: string) => contextManager.saveContextSnippet(content, source))
ipcMain.handle('context:record', (_event, record) => contextStore.createRecord(record))
ipcMain.handle('context:session-event', (_event, sessionEvent) => contextStore.appendSessionEvent(sessionEvent))
ipcMain.handle('context:records', (_event, filters) => contextStore.queryRecords(filters))
ipcMain.handle('context:snapshot:create', (_event, snapshot) => contextStore.createSnapshot(snapshot))
ipcMain.handle('context:snapshots', (_event, filters) => contextStore.listSnapshots(filters))
ipcMain.handle('context:session-events', (_event, sessionId: string, limit?: number) => contextStore.listSessionEvents(sessionId, limit))
ipcMain.handle('context:recent-events', (_event, limit?: number) => contextStore.listRecentSessionEvents(limit))
ipcMain.handle('context:build-packet', (_event, options) => contextOrchestrator.buildContextPacket(options))
ipcMain.handle('context:compact', (_event, options) => contextOrchestrator.compactContext(options))
ipcMain.handle('context:drift-check', (_event, summaryBlock: string, options) => driftGuard.checkSummary(summaryBlock, options))
ipcMain.handle('context:analyze', async (_event, content: string) => {
  const config = buildLLMConfig();
  if (!config) throw new Error('No reasoning model configured');
  const systemPrompt = `你是一个代码和终端输出分析助手。请分析以下内容，提取关键信息：

1. 错误和警告信息
2. 重要的文件路径和命令
3. 当前工作目录状态
4. 关键的系统/环境信息
5. 可能的下一步行动建议

请用简洁的markdown格式返回分析结果。如果内容没有有价值的信息，返回"无可分析内容"。`;

  try {
    const result = await simpleCompletion(config, `请分析这段内容：\n\n${content}`, systemPrompt);
    return { success: true, analysis: result };
  } catch (err) {
    console.error('[Context Analyze] Error:', err);
    return { success: false, error: String(err) };
  }
})

  ipcMain.handle('context:export-json', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const overview = contextManager.listArtifacts()
    const records = contextStore.queryRecords({ limit: 500 })
    const snapshots = contextStore.listSnapshots({ limit: 200 })
    const events = contextStore.listRecentSessionEvents(300)
    const snippets = overview.snippets.map(snippet => {
      let content = ''
      try {
        content = fs.readFileSync(snippet.path, 'utf-8')
      } catch {
        content = ''
      }
      return {
        id: snippet.id,
        name: snippet.name,
        path: snippet.path,
        updatedAt: snippet.updatedAt,
        tags: snippet.tags,
        content,
      }
    })

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      basePath: overview.basePath,
      counts: {
        records: records.length,
        snapshots: snapshots.length,
        events: events.length,
        snippets: snippets.length,
      },
      records,
      snapshots,
      events,
      snippets,
    }

    const defaultName = `easyterminal-context-${new Date().toISOString().slice(0, 10)}.json`
    const { canceled, filePath } = await dialog.showSaveDialog(window || undefined, {
      title: '导出上下文数据',
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })

    if (canceled || !filePath) {
      return { success: false, canceled: true }
    }

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return {
      success: true,
      filePath,
      counts: payload.counts,
    }
  })
  type ContextImportPayload = {
    records: Array<Record<string, unknown>>;
    snapshots: Array<Record<string, unknown>>;
    events: Array<Record<string, unknown>>;
    snippets: Array<Record<string, unknown>>;
  }

  const validateContextImportPayload = (value: unknown): ContextImportPayload => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON 顶层必须是对象。')
    const source = value as Record<string, unknown>
    const readArray = (key: keyof ContextImportPayload) => {
      const field = source[key]
      if (field === undefined) return []
      if (!Array.isArray(field) || field.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
        throw new Error(`${String(key)} 必须是对象数组。`)
      }
      return field as Array<Record<string, unknown>>
    }
    const payload = {
      records: readArray('records'),
      snapshots: readArray('snapshots'),
      events: readArray('events'),
      snippets: readArray('snippets'),
    }
    if (!payload.records.length && !payload.snapshots.length && !payload.events.length && !payload.snippets.length) {
      throw new Error('文件中没有可导入的上下文数组。')
    }
    return payload
  }

  const importContextPayload = (parsed: ContextImportPayload) => {
    let importedRecords = 0
    let importedSnapshots = 0
    let importedEvents = 0
    let importedSnippets = 0

    for (const record of parsed.records) {
      if (typeof record.title !== 'string' || typeof record.summary !== 'string') continue
      contextStore.createRecord({
        scope: (record.scope as 'global' | 'project' | 'task' | 'session') || 'project',
        kind: (record.kind as 'goal' | 'constraint' | 'decision' | 'issue' | 'artifact' | 'style' | 'next_step' | 'summary') || 'summary',
        title: record.title,
        summary: record.summary,
        details: typeof record.details === 'string' ? record.details : '',
        salience: typeof record.salience === 'number' ? record.salience : 0.5,
        status: (record.status as 'active' | 'superseded' | 'archived') || 'active',
        source_type: (record.source_type as 'doc' | 'session' | 'tool' | 'workflow' | 'manual') || 'manual',
        source_ref: typeof record.source_ref === 'string' ? record.source_ref : 'ImportedContext',
        evidence_refs: Array.isArray(record.evidence_refs) ? record.evidence_refs.filter((item): item is string => typeof item === 'string') : [],
      })
      importedRecords += 1
    }

    for (const snapshot of parsed.snapshots) {
      if (typeof snapshot.summary_block !== 'string') continue
      contextStore.createSnapshot({
        session_id: typeof snapshot.session_id === 'string' ? snapshot.session_id : '',
        task_id: typeof snapshot.task_id === 'string' ? snapshot.task_id : '',
        version: typeof snapshot.version === 'number' ? snapshot.version : 1,
        summary_block: snapshot.summary_block,
        token_estimate: typeof snapshot.token_estimate === 'number' ? snapshot.token_estimate : Math.ceil(snapshot.summary_block.length / 4),
        drift_score: typeof snapshot.drift_score === 'number' ? snapshot.drift_score : 0,
        status: (snapshot.status as 'active' | 'candidate' | 'replaced') || 'candidate',
      })
      importedSnapshots += 1
    }

    for (const sessionEvent of parsed.events) {
      if (typeof sessionEvent.payload !== 'string') continue
      contextStore.appendSessionEvent({
        session_id: typeof sessionEvent.session_id === 'string' ? sessionEvent.session_id : 'imported_session',
        event_type: (sessionEvent.event_type as 'session_start' | 'session_end' | 'user_prompt' | 'tool_call' | 'tool_result' | 'assistant_reply' | 'manual_capture') || 'manual_capture',
        payload: sessionEvent.payload,
        token_estimate: typeof sessionEvent.token_estimate === 'number' ? sessionEvent.token_estimate : Math.ceil(sessionEvent.payload.length / 4),
      })
      importedEvents += 1
    }

    for (const snippet of parsed.snippets) {
      if (typeof snippet.content !== 'string' || !snippet.content.trim()) continue
      contextManager.saveContextSnippet(snippet.content.trim(), typeof snippet.name === 'string' ? `Imported:${snippet.name}` : 'ImportedContext')
      importedSnippets += 1
    }

    return { records: importedRecords, snapshots: importedSnapshots, events: importedEvents, snippets: importedSnippets }
  }

  ipcMain.handle('context:import-preview', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(window || undefined, {
      title: '导入上下文数据',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true }

    try {
      const filePath = result.filePaths[0]
      const parsed = validateContextImportPayload(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
      return {
        success: true,
        filePath,
        payload: parsed,
        counts: {
          records: parsed.records.filter(item => typeof item.title === 'string' && typeof item.summary === 'string').length,
          snapshots: parsed.snapshots.filter(item => typeof item.summary_block === 'string').length,
          events: parsed.events.filter(item => typeof item.payload === 'string').length,
          snippets: parsed.snippets.filter(item => typeof item.content === 'string' && Boolean(item.content.trim())).length,
        },
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '无法读取或校验 JSON。' }
    }
  })

  ipcMain.handle('context:import-confirm', (_event, payload: unknown) => {
    try {
      const parsed = validateContextImportPayload(payload)
      return { success: true, counts: importContextPayload(parsed) }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '导入失败。' }
    }
  })

  // Compatibility path for older callers. New UI uses preview + confirm.
  ipcMain.handle('context:import-json', async (event) => {
    const preview = await (async () => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const result = await dialog.showOpenDialog(window || undefined, {
        title: '导入上下文数据',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true } as const
      try {
        return { success: true, filePath: result.filePaths[0], payload: validateContextImportPayload(JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'))) } as const
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : '无法读取或校验 JSON。' } as const
      }
    })()
    if (!preview.success) return preview
    return { success: true, filePath: preview.filePath, counts: importContextPayload(preview.payload) }
  })

  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8')
      }
      return ''
    } catch {
        return ''
      }
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      fs.writeFileSync(fullPath, content, 'utf-8')
      return true
    } catch {
        return false
      }
  })

  // fs module
  ipcMain.handle('fs:homedir', () => process.env.HOME || process.cwd())
  ipcMain.handle('fs:parent', (_event, dirPath: string) => dirname(dirPath))
  ipcMain.handle('fs:list', async (_event, dirPath: string, options?: { includeHidden?: boolean }) => {
    try {
      if (!fs.existsSync(dirPath)) return []
      
      let files: fs.Dirent[] = []
      try {
        files = fs.readdirSync(dirPath, { withFileTypes: true })
      } catch (e) {
        // Fallback for permissions or other read errors on the directory itself
        console.error('Directory read error:', e)
        return []
      }
      
      // Filter out hidden files by default for cleaner UI
      const result = files
        .filter(f => options?.includeHidden ? true : !f.name.startsWith('.'))
        .map(f => {
          let isDir = false
          let size = 0
          let mtime = ''
          try {
            isDir = f.isDirectory()
            const stat = fs.statSync(join(dirPath, f.name))
            size = stat.size
            mtime = stat.mtime.toISOString()
          } catch {
            // Some files (like broken symlinks) might throw on isDirectory()
            isDir = false
          }
          return {
            name: f.name,
            isDirectory: isDir,
            path: join(dirPath, f.name),
            size,
            mtime,
            extension: extname(f.name).replace('.', '').toLowerCase(),
          }
        })
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
          return a.isDirectory ? -1 : 1
        })
        
      return result
    } catch (e) {
      console.error('fs:list outer error:', e)
      return []
    }
  })

  // The file explorer uses a separate async DTO so existing fs:list callers
  // keep their legacy response shape while large directories never block the
  // Electron main process with synchronous scans.
  ipcMain.handle('fs:tree:list', async (_event, request: ListDirectoryRequest): Promise<ListDirectoryResult> => {
    const requestId = typeof request?.requestId === 'string' ? request.requestId : ''
    const directoryPath = typeof request?.path === 'string' ? resolve(request.path) : ''
    if (!requestId || !directoryPath) {
      return {
        ok: false,
        requestId,
        path: directoryPath,
        error: { code: 'EINVAL', message: '目录请求缺少有效路径或 requestId。' },
      }
    }

    try {
      const dirents = await fs.promises.readdir(directoryPath, { withFileTypes: true })
      const entries = await Promise.all(dirents
        .filter(entry => request.includeHidden === true || !entry.name.startsWith('.'))
        .map(async (entry): Promise<FileTreeEntry> => {
          const entryPath = join(directoryPath, entry.name)
          let kind: FileTreeEntry['kind'] = entry.isDirectory() ? 'directory' : 'file'
          let size: number | undefined
          let mtime: string | undefined

          try {
            const stat = await fs.promises.lstat(entryPath)
            if (stat.isSymbolicLink()) kind = 'symlink'
            else if (stat.isDirectory()) kind = 'directory'
            else kind = 'file'
            size = stat.size
            mtime = stat.mtime.toISOString()
          } catch {
            // A broken symlink is still useful in the tree; leave metadata out.
            kind = entry.isSymbolicLink() ? 'symlink' : kind
          }

          return {
            name: entry.name,
            path: entryPath,
            kind,
            ...(size === undefined ? {} : { size }),
            ...(mtime ? { mtime } : {}),
            extension: extname(entry.name).replace('.', '').toLowerCase() || undefined,
          }
        }))

      entries.sort((a, b) => {
        const aDirectory = a.kind === 'directory'
        const bDirectory = b.kind === 'directory'
        if (aDirectory !== bDirectory) return aDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return { ok: true, requestId, path: directoryPath, entries }
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || 'EIO')
        : 'EIO'
      const message = code === 'EACCES' || code === 'EPERM'
        ? '没有权限读取此目录。'
        : code === 'ENOENT'
          ? '目录不存在，可能已被移动或删除。'
          : '读取目录失败，请稍后重试。'
      return { ok: false, requestId, path: directoryPath, error: { code, message } }
    }
  })

  ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:delete', async (_event, targetPath: string) => {
    try {
      await shell.trashItem(resolve(targetPath))
      return { ok: true }
    } catch {
      return { ok: false, error: '无法将项目移入系统废纸篓。' }
    }
  })

  ipcMain.handle('fs:show-in-finder', async (_event, targetPath: string, isDirectory = false) => {
    try {
      const fullPath = resolve(targetPath)
      if (!fs.existsSync(fullPath)) return { ok: false, error: '项目不存在。' }
      if (isDirectory) {
        const error = await shell.openPath(fullPath)
        return error ? { ok: false, error } : { ok: true }
      }
      shell.showItemInFolder(fullPath)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '无法在 Finder 中打开。' }
    }
  })

  ipcMain.handle('fs:open-default', async (_event, targetPath: string) => {
    try {
      const fullPath = resolve(targetPath)
      if (!fs.existsSync(fullPath)) return { ok: false, error: '文件不存在。' }
      const error = await shell.openPath(fullPath)
      return error ? { ok: false, error } : { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '系统无法打开该文件。' }
    }
  })

  ipcMain.handle('fs:open-with', async (event, targetPath: string) => {
    try {
      const fullPath = resolve(targetPath)
      if (!fs.existsSync(fullPath)) return { ok: false, error: '项目不存在。' }
      const properties: Array<'openFile' | 'openDirectory'> = process.platform === 'darwin'
        ? ['openFile', 'openDirectory']
        : ['openFile']
      const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender) || undefined, {
        title: '选择打开方式',
        defaultPath: process.platform === 'darwin' ? '/Applications' : undefined,
        properties,
      })
      const applicationPath = result.filePaths[0]
      if (result.canceled || !applicationPath) return { ok: false, canceled: true }

      const command = process.platform === 'darwin' ? 'open' : applicationPath
      const args = process.platform === 'darwin' ? ['-a', applicationPath, fullPath] : [fullPath]
      await new Promise<void>((resolvePromise, reject) => {
        const child = spawn(command, args, { detached: true, stdio: 'ignore' })
        child.once('error', reject)
        child.once('spawn', () => {
          child.unref()
          resolvePromise()
        })
      })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '无法使用所选应用打开。' }
    }
  })

  ipcMain.handle('fs:stat', async (_event, targetPath: string) => {
    try {
      const stat = fs.statSync(targetPath)
      return {
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        ctime: stat.ctime.toISOString(),
        isDirectory: stat.isDirectory(),
      }
    } catch {
      return null
    }
  })

  // Read image as base64
  ipcMain.handle('file:read-image', async (_event, filePath: string) => {
    try {
      const fullPath = filePath.startsWith('/') ? filePath : join(currentCwd, filePath)
      if (fs.existsSync(fullPath)) {
        const data = fs.readFileSync(fullPath)
        const ext = extname(fullPath).toLowerCase().replace('.', '')
        const mimeType = ext === 'jpg' ? 'jpeg' : ext
        return `data:image/${mimeType};base64,${data.toString('base64')}`
      }
      return null
    } catch (e) {
      console.error('read-image error:', e)
      return null
    }
  })

  // Island Manager IPC — Detection Config
  ipcMain.handle('island:get-detection-config', () => {
    return getIslandManager().getConfig();
  });
  ipcMain.handle('island:update-detection-config', (_event, updates: Record<string, unknown>) => {
    return getIslandManager().updateConfig(updates as Parameters<ReturnType<typeof getIslandManager>['updateConfig']>[0]);
  });
  ipcMain.handle('island:detect-tui', (_event, lines: string[], text: string) => {
    return getIslandManager().detect(lines, text);
  });
  ipcMain.handle('island:get-state', () => {
    return getIslandManager().getState();
  });
  ipcMain.on('island:set-agent-state', (_event, state: string) => {
    getIslandManager().setAgentState(state as 'idle' | 'thinking' | 'working' | 'waiting' | 'error');
  });

  // Island IPC
  ipcMain.on('island:trigger', (_event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      // Note: Do not disable ignoreMouseEvents, let the transparent click-through handle it
      islandWin.webContents.send('island:show', msg)
    }
  })

  ipcMain.on('island:save-context', (event, data: { text: string, source: string }) => {
    if (data.text && data.text.trim()) {
      const result = contextManager.saveContextSnippet(data.text, data.source);
      if (result) {
        event.reply('island:save-result', { success: true, filePath: result.filePath, isSensitive: result.isSensitive });
      } else {
        event.reply('island:save-result', { success: false, reason: 'duplicate_or_error' });
      }
    }
  })

  ipcMain.on('island:status', (_event, msg: string) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:status', msg)
    }
  })

  // ── Browser IPC ───────────────────────────────────────────────────
  ipcMain.handle('webview:open-external', async (_event, rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { ok: false, error: '只允许打开 http 或 https 地址。' }
      await shell.openExternal(parsed.toString())
      return { ok: true }
    } catch {
      return { ok: false, error: '地址无效或系统浏览器无法打开。' }
    }
  })

  ipcMain.handle('browser:send-to-terminal', (_event, text: string) => {
    // Save browser selection to context
    if (text && text.trim()) {
      contextManager.saveContextSnippet(text, 'browser-selection');
    }
    return true;
  });

  ipcMain.handle('browser:save-history', (_event, data: { url: string; title: string; content?: string }) => {
    dbRun(
      'INSERT INTO browser_history (id, url, title, content) VALUES (?, ?, ?, ?)',
      [generateId(), data.url, data.title, data.content || '']
    );
    return true;
  });

  ipcMain.handle('browser:get-history', (_event, limit?: number) => {
    return dbQuery('SELECT * FROM browser_history ORDER BY created_at DESC LIMIT ?', [limit || 50]);
  });

  // ── Browser Plugin IPC ────────────────────────────────────────────
  ipcMain.handle('browser:plugin:list', () => {
    return dbQuery('SELECT * FROM browser_plugins ORDER BY created_at DESC');
  });

  ipcMain.handle('browser:plugin:create', (_event, plugin: { name: string; description: string; matchPattern: string; script: string; enabled?: boolean }) => {
    const id = generateId();
    dbRun(
      'INSERT INTO browser_plugins (id, name, description, match_pattern, script, enabled) VALUES (?, ?, ?, ?, ?, ?)',
      [id, plugin.name, plugin.description || '', plugin.matchPattern || '*://*/*', plugin.script, plugin.enabled !== false ? 1 : 0]
    );
    return dbGet('browser_plugins', id);
  });

  ipcMain.handle('browser:plugin:update', (_event, id: string, plugin: { name?: string; description?: string; matchPattern?: string; script?: string; enabled?: boolean }) => {
    const existing = dbGet('browser_plugins', id);
    if (!existing) return null;
    const fields: Record<string, unknown> = {};
    if (plugin.name !== undefined) fields.name = plugin.name;
    if (plugin.description !== undefined) fields.description = plugin.description;
    if (plugin.matchPattern !== undefined) fields.match_pattern = plugin.matchPattern;
    if (plugin.script !== undefined) fields.script = plugin.script;
    if (plugin.enabled !== undefined) fields.enabled = plugin.enabled ? 1 : 0;
    dbRun(
      `UPDATE browser_plugins SET ${Object.keys(fields).map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      [...Object.values(fields), id]
    );
    return dbGet('browser_plugins', id);
  });

  ipcMain.handle('browser:plugin:delete', (_event, id: string) => {
    dbDelete('browser_plugins', id);
    return true;
  });

  ipcMain.handle('browser:plugin:get-enabled', () => {
    return dbQuery('SELECT * FROM browser_plugins WHERE enabled = 1 ORDER BY created_at DESC');
  });

  // ── Unified Search ───────────────────────────────────────────────
  ipcMain.handle('search:unified', async (_event, query: string, modules?: string[], topK?: number) => {
    const { buildLLMConfig } = await import('./services/llm-gateway');
    const llmConfig = buildLLMConfig();
    // Build embedding config from LLM config if available
    const embeddingConfig = llmConfig ? {
      source: 'provider' as const,
      providerBaseUrl: llmConfig.baseUrl,
      providerApiKey: llmConfig.apiKey,
      model: llmConfig.model,
    } : undefined;
    return unifiedSearch.unifiedSearch({
      query,
      modules: (modules || ['prompt', 'skill', 'knowledge', 'workflow', 'context']) as Array<'prompt' | 'skill' | 'knowledge' | 'workflow' | 'context'>,
      topK: topK || 5,
      embeddingConfig,
    });
  });

  // ── Browser (Workflow) ─────────────────────────────────────────────
  ipcMain.handle('workflow:browser-execute', async (_event, options: { url: string; script: string; timeout?: number }) => {
    return executeBrowserScript(options);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on('island:prompt', (_event, data: { message: string, options: any[], sessionId: string }) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:prompt', data)
    }
  })

  ipcMain.handle('island:interaction-response', async (event, response) => {
    if (!islandWin || event.sender !== islandWin.webContents) {
      return { ok: false, code: 'forbidden', message: '只有灵动岛窗口可以提交交互响应' }
    }
    if (!interactionCoordinator) return { ok: false, code: 'coordinator_unavailable', message: '响应协调器未初始化' }
    return interactionCoordinator.submit(response)
  })

  ipcMain.on('island:ready', event => {
    if (!islandWin || event.sender !== islandWin.webContents) return
    markIslandRendererReady()
  })

  ipcMain.handle('island:set-interactive', (event, request: { interactionId: string; interactive: boolean; reason: 'composer-focus' | 'composer-blur' | 'action-complete' }) => {
    if (!islandWin || event.sender !== islandWin.webContents) return { ok: false, code: 'forbidden' }
    if (!request?.interactionId || typeof request.interactive !== 'boolean') return { ok: false, code: 'invalid_request' }
    if (request.interactive) {
      suppressMainActivationUntil = Date.now() + 1500;
      islandWin.setIgnoreMouseEvents(false)
      islandWin.setFocusable(true)
      islandWin.show()
      islandWin.focus()
      return { ok: true, focused: true }
    }
    islandWin.setFocusable(false)
    islandWin.setIgnoreMouseEvents(true, { forward: true })
    return { ok: true, focused: false }
  })

  ipcMain.handle('island:jump-to-terminal', (event, terminalSessionId: string) => {
    if (!islandWin || event.sender !== islandWin.webContents) return { ok: false, code: 'forbidden' }
    const registration = terminalSessionRegistry.get(terminalSessionId)
    if (!registration || !registration.alive) return { ok: false, code: 'session_closed' }
    if (win && !win.isDestroyed()) {
      suppressMainActivationUntil = 0
      win.show()
      win.focus()
      win.webContents.send('terminal:focus-session', terminalSessionId)
    }
    islandWin.setFocusable(false)
    islandWin.setIgnoreMouseEvents(true, { forward: true })
    return { ok: true }
  })

  // Legacy renderer messages are intentionally ignored. Approvals must travel
  // through InteractionCoordinator and receive an ACK; no y/n or arrow-count
  // inference is safe enough to keep as an implicit fallback.
  ipcMain.on('island:action', () => {
    console.warn('[AgentIntegration] Ignored legacy island:action without a structured interaction')
  })

  ipcMain.on('island:set-ignore-mouse-events', (_event, ignore: boolean) => {
    if (islandWin) {
      if (!ignore) suppressMainActivationUntil = Date.now() + 1500
      islandWin.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })

  // Context Menu
  ipcMain.on('export:save-file', async (event, { content, format, defaultName }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(window!, {
        title: `Save ${format.toUpperCase()}`,
        defaultPath: defaultName,
        filters: [{ name: format.toUpperCase(), extensions: [format] }]
      });
      if (!canceled && filePath) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    } catch (e) {
      console.error('Failed to save file', e);
    }
  });

  ipcMain.on('export:save-pdf', async (event, { htmlContent, defaultName }) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePath } = await dialog.showSaveDialog(window!, {
        title: 'Save PDF',
        defaultPath: defaultName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!canceled && filePath) {
        const pdfWindow = new BrowserWindow({ show: false });
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        const pdfData = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          margins: { marginType: 'default' }
        });
        fs.writeFileSync(filePath, pdfData);
        pdfWindow.close();
      }
    } catch (e) {
      console.error('Failed to save PDF', e);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on('menu:show', (event, type: 'file' | 'general', contextData: any) => {
    const template: Electron.MenuItemConstructorOptions[] = []

    if (type === 'file' && contextData) {
      template.push(
        { label: '复制', click: () => event.reply('menu:action', 'copy-name', contextData) },
        { label: '复制路径 (Copy Path)', click: () => event.reply('menu:action', 'copy-path', contextData) },
        { label: '插入终端 (Insert Path)', click: () => event.reply('menu:action', 'insert-path', contextData) },
        { type: 'separator' },
        { label: contextData.isDirectory ? '在 Finder 中打开' : '在 Finder 中显示', click: () => event.reply('menu:action', 'show-in-finder', contextData) },
        { label: '选择打开方式…', click: () => event.reply('menu:action', 'open-with', contextData) }
      )
      if (contextData.isDirectory === false) {
        template.push(
          { label: '编辑文件 (Edit File)', click: () => event.reply('menu:action', 'edit-file', contextData) }
        )
      }
    } else if (type === 'general') {
      template.push(
        { label: '新增文本文件 (New Text File)', click: () => event.reply('menu:action', 'new-file', contextData) },
        { type: 'separator' },
        { label: '刷新 (Refresh)', click: () => event.reply('menu:action', 'refresh', contextData) },
        { label: '粘贴到终端 (Paste)', click: () => event.reply('menu:action', 'paste', contextData) },
        { label: '在终端打开 (Open in Terminal)', click: () => event.reply('menu:action', 'open-terminal', contextData) }
      )
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender) || undefined })
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  win = null
  islandWin = null
  // We want to fully quit the app when all windows are closed on macOS too
  // since this is a terminal application
  if (!isQuitting) {
    isQuitting = true;
    app.quit()
  }
})

app.on('activate', () => {
  if (suppressMainActivationUntil > Date.now()) {
    suppressMainActivationUntil = 0
    return
  }
  suppressMainActivationUntil = 0
  if (win === null) {
    createWindow()
  } else {
    win.show()
    win.focus()
  }
})
