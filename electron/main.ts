process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

import { app, BrowserWindow, ipcMain, nativeTheme, Menu, screen, dialog, nativeImage, globalShortcut, clipboard } from 'electron'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as os from 'node:os'
import * as pty from 'node-pty'
import { exec, execSync } from 'child_process'
import * as fs from 'node:fs'
import { contextManager } from './context-manager'
import Store from 'electron-store'
import { getDatabase } from './services/database'
import * as promptManager from './services/prompt-manager'
import * as skillManager from './services/skill-manager'
import * as knowledgeBase from './services/knowledge-base'
import * as workflowEngine from './services/workflow-engine'
import { runReActLoop, type ReActTool } from './services/react-engine'
import { chatCompletion, simpleCompletion, type LLMConfig } from './services/llm-gateway'
import { type EmbeddingConfig } from './services/vector-store'

const store = new Store()

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
        chatEndpoint: (provider as Record<string, string>).chatEndpoint
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
    const { id, baseUrl, apiKey, models, chatEndpoint } = provider;

    let endpoint = baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: string | null = null;

    if (id === 'anthropic') {
      endpoint += '/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = JSON.stringify({
        model: models.split(',')[0] || 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      });
    } else if (id === 'gemini') {
      const model = models.split(',')[0] || 'gemini-1.5-flash';
      endpoint += `/models/${model}:generateContent?key=${apiKey}`;
      body = JSON.stringify({
        contents: [{ parts: [{ text: "hi" }] }]
      });
    } else if (id === 'minimax') {
      endpoint = `${baseUrl}${chatEndpoint}`;
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = JSON.stringify({
        model: models.split(',')[0] || 'abab6.5-chat',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      });
    } else if (id === 'ollama') {
      endpoint = `${baseUrl}${chatEndpoint}`;
      body = JSON.stringify({
        model: models.split(',')[0] || 'llama3',
        messages: [{ role: 'user', content: 'hi' }],
        stream: false
      });
    } else {
      endpoint = `${baseUrl}${chatEndpoint}`;
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

// Force dark theme for a consistent, sleek terminal look
nativeTheme.themeSource = 'dark'

let win: BrowserWindow | null = null
let islandWin: BrowserWindow | null = null

// Fix for transparent windows on macOS causing SharedImageManager::ProduceSkia errors
app.commandLine.appendSwitch('disable-features', 'IOSurfaceCapturer,HardwareMediaKeyHandling')
app.commandLine.appendSwitch('enable-transparent-visuals')

const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

// Fix PATH for macOS packaged apps so terminal commands like 'claude', 'node', 'npm' work.
if (process.platform === 'darwin' && app.isPackaged) {
  try {
    const userPath = execSync(`${shell} -l -c "echo \\$PATH"`).toString().trim()
    if (userPath) {
      process.env.PATH = userPath
    }
  } catch {
    // Ignored
  }
}

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

app.on('before-quit', () => {
  isQuitting = true;
});

const terminals: Record<string, pty.IPty> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionLoggers: Record<string, any> = {}
const currentCwd = process.env.HOME || process.cwd()

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
        islandWin.destroy()
        islandWin = null;
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

  // Enable click-through for transparent areas (macOS supports this well)
  islandWin.setIgnoreMouseEvents(true, { forward: true })

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
  const providers = store.get('model_providers', []) as Array<{ id: string; baseUrl: string; apiKey: string; models: string; icon: string; apiFormat?: string }>;
  const settings = store.get('app_settings') as { reasoningModel?: { providerId: string; model: string } } | null;

  // Use reasoning model if no specific provider given
  const targetProviderId = providerId || settings?.reasoningModel?.providerId;
  const targetModel = model || settings?.reasoningModel?.model;
  const provider = providers.find((p: { id: string }) => p.id === targetProviderId);

  if (!provider || !targetModel) return null;
  return {
    provider: provider.id,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: targetModel,
    apiFormat: provider.apiFormat as 'anthropic' | 'openai_chat' | undefined,
  };
}

function buildEmbeddingConfig(): EmbeddingConfig {
  const settings = store.get('app_settings') as { embeddingModel?: EmbeddingConfig } | null;
  const em = settings?.embeddingModel;
  if (!em) return { source: 'local', localUrl: 'http://localhost:11434', model: '' };

  if (em.source === 'local') {
    return { source: 'local', localUrl: em.localUrl || 'http://localhost:11434', model: em.model };
  }
  if (em.source === 'provider') {
    const providers = store.get('model_providers', []) as Array<{ id: string; baseUrl: string; apiKey: string }>;
    const p = providers.find((pr: { id: string }) => pr.id === em.providerId);
    return { source: 'provider', providerBaseUrl: p?.baseUrl, providerApiKey: p?.apiKey, model: em.model };
  }
  return { source: 'custom', customBaseUrl: em.customBaseUrl, customApiKey: em.customApiKey, model: em.model };
}

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
ipcMain.handle('kb:list', (_e, collection?: string) => knowledgeBase.listDocuments(collection));
ipcMain.handle('kb:get', (_e, id: string) => knowledgeBase.getDocument(id));
ipcMain.handle('kb:delete', (_e, id: string) => knowledgeBase.deleteDocument(id));
ipcMain.handle('kb:collections', () => knowledgeBase.getCollections());
ipcMain.handle('kb:add-document', async (_e, filePath: string, collection?: string) => {
  const embConfig = buildEmbeddingConfig();
  return knowledgeBase.addDocument(filePath, embConfig, collection);
});
ipcMain.handle('kb:retrieve', async (_e, query: string, topK?: number, collection?: string) => {
  const embConfig = buildEmbeddingConfig();
  return knowledgeBase.retrieveContext(query, embConfig, topK, collection);
});
ipcMain.handle('kb:build-rag-prompt', async (_e, query: string, topK?: number, collection?: string) => {
  const embConfig = buildEmbeddingConfig();
  return knowledgeBase.buildRAGPrompt(query, embConfig, topK, collection);
});

// ── Workflow Engine ───────────────────────────────────────────────
ipcMain.handle('workflow:list', () => workflowEngine.listWorkflows());
ipcMain.handle('workflow:get', (_e, id: string) => workflowEngine.getWorkflow(id));
ipcMain.handle('workflow:create', (_e, data: { name: string; description?: string; category?: string; tags?: string[] }) => workflowEngine.createWorkflow(data));
ipcMain.handle('workflow:update', (_e, id: string, data: Record<string, unknown>) => workflowEngine.updateWorkflow(id, data));
ipcMain.handle('workflow:delete', (_e, id: string) => workflowEngine.deleteWorkflow(id));
ipcMain.handle('workflow:runs', (_e, workflowId?: string) => workflowEngine.listWorkflowRuns(workflowId));
ipcMain.handle('workflow:build-agent-prompt', (_e, id: string) => workflowEngine.buildWorkflowAgentPrompt(id));
ipcMain.handle('workflow:execute', async (_e, id: string, variables?: Record<string, unknown>) => {
  const config = buildLLMConfig();
  if (!config) throw new Error('No reasoning model configured');
  const embConfig = buildEmbeddingConfig();
  return workflowEngine.executeWorkflow(id, config, variables, embConfig);
});

// ── ReAct Engine (direct agent invocation) ────────────────────────
ipcMain.handle('agent:react', async (_event, query: string, toolNames?: string[]) => {
  const config = buildLLMConfig();
  if (!config) throw new Error('No reasoning model configured');

  // Build available tools from skills
  const tools: ReActTool[] = [];

  // Knowledge base retrieval tool
  tools.push({
    type: 'function',
    function: {
      name: 'knowledge_search',
      description: 'Search the personal knowledge base for relevant documents and information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          top_k: { type: 'number', description: 'Number of results to return' },
        },
        required: ['query'],
      },
    },
    execute: async (args) => {
      const embConfig = buildEmbeddingConfig();
      const results = await knowledgeBase.retrieveContext(args.query, embConfig, args.top_k || 3);
      return JSON.stringify(results.map(r => ({ content: r.chunk.content, source: r.doc?.filename, score: r.score })));
    },
  });

  // Skill search tool
  tools.push({
    type: 'function',
    function: {
      name: 'skill_search',
      description: 'Search for available skills that match a given requirement',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Skill requirement description' },
        },
        required: ['query'],
      },
    },
    execute: async (args) => {
      const embConfig = buildEmbeddingConfig();
      const results = await skillManager.searchSkills(args.query, embConfig, 5);
      return JSON.stringify(results.map(r => ({ name: r.skill.name, description: r.skill.description, score: r.score })));
    },
  });

  // File read tool
  tools.push({
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
        },
        required: ['path'],
      },
    },
    execute: async (args) => {
      try {
        return fs.readFileSync(args.path, 'utf-8').substring(0, 10000);
      } catch (err: unknown) {
        return `Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    },
  });

  // Run command tool
  tools.push({
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command and return the output',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
    execute: async (args) => {
      return new Promise((resolve) => {
        exec(args.command, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) resolve(`Error: ${error.message}\n${stderr}`);
          else resolve(stdout || stderr || '(no output)');
        });
      });
    },
  });

  // Filter tools if specific names requested
  const filteredTools = toolNames
    ? tools.filter(t => toolNames.includes(t.function.name))
    : tools;

  return runReActLoop(config, query, filteredTools);
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

app.whenReady().then(() => {
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
  
  ipcMain.on('window:resize', (_event, width: number) => {
    if (win && !win.isDestroyed()) {
      const bounds = win.getBounds()
      win.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: width,
        height: bounds.height // Keep current height to avoid vertical jumping
      }, true) // true = animate on macOS
    }
  })

  // Set up PTY IPC
  ipcMain.on('pty:kill', (_event, id) => {
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

  ipcMain.on('pty:create', (event, id) => {
    if (terminals[id]) return

    let command = shell
    let args: string[] = []
    
    if (hasTmux) {
      // Use tmux to create or attach to a session
      command = 'tmux'
      args = ['new-session', '-A', '-s', `easy_term_${id}`]
    } else if (os.platform() !== 'win32') {
      // Launch as login shell so aliases and profiles (.zshrc) are loaded
      args = ['-l']
    }

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: currentCwd,
      env: process.env as Record<string, string>
    })

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
      fs.rmSync(targetPath, { recursive: true, force: true })
      return true
    } catch {
      return false
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ipcMain.on('island:prompt', (_event, data: { message: string, options: any[], sessionId: string }) => {
    if (islandWin && !islandWin.isDestroyed()) {
      islandWin.showInactive()
      islandWin.webContents.send('island:prompt', data)
    }
  })

  ipcMain.on('island:action', async (_event, action: string | string[], sessionId?: string) => {
    if (islandWin) {
      if (sessionId && terminals[sessionId]) {
        if (Array.isArray(action)) {
          for (const stroke of action) {
            terminals[sessionId].write(stroke)
            // Small delay to ensure TUI processes arrow keys before Enter
            await new Promise(resolve => setTimeout(resolve, 30))
          }
        } else if (action === 'approve') {
          terminals[sessionId].write('y\r')
        } else if (action === 'deny') {
          terminals[sessionId].write('n\r')
        } else {
          terminals[sessionId].write(action)
        }
      } else if (win && !win.isDestroyed()) {
        win.webContents.send(`pty:data:default_tab`, `\r\n[Agent] User clicked ${action}\r\n`)
      }
    }
  })

  ipcMain.on('island:set-ignore-mouse-events', (_event, ignore: boolean) => {
    if (islandWin) {
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
        { label: '复制路径 (Copy Path)', click: () => event.reply('menu:action', 'copy-path', contextData) },
        { label: '插入终端 (Insert Path)', click: () => event.reply('menu:action', 'insert-path', contextData) }
      )
      if (!contextData.isDirectory) {
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
  if (win === null) {
    createWindow()
  } else {
    win.show()
    win.focus()
  }
})
