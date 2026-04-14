// App ID type - represents different AI applications
export type AppId = 'easyterminal' | 'claude' | 'codex' | 'gemini' | 'opencode' | 'openclaw';

// Provider category for grouping (matching cc-switch)
export type ProviderCategory =
  | 'official'        // 官方
  | 'cn_official'     // 国产官方
  | 'cloud_provider'   // 云服务商
  | 'aggregator'       // 聚合网站
  | 'third_party'      // 第三方
  | 'custom'           // 自定义
  | 'omo'             // Oh My OpenCode
  | 'omo-slim';       // Oh My OpenCode Slim

// API format type (cc-switch style)
export type ApiFormat = 'anthropic' | 'openai_chat' | 'openai_responses';

// Provider definition (API endpoint configuration)
export interface Provider {
  id: string;
  name: string;
  icon: string;
  baseUrl: string;
  apiKey: string;
  models: string;
  status: 'unknown' | 'testing' | 'success' | 'error';
  errorMessage?: string;
  description: string;
  category?: ProviderCategory;
  apiFormat?: ApiFormat;
}

// Agent configuration (links App to Provider)
export interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  providerId: string;
  models: string;
  configPath: string;
  status: 'unknown' | 'testing' | 'success' | 'error';
  errorMessage?: string;
  description: string;
  appId: AppId;
}

// App metadata
export interface AppMeta {
  id: AppId;
  name: string;
  icon: string;
  description: string;
  defaultConfigPath: string;
}

// Proxy status
export interface ProxyStatus {
  enabled: boolean;
  port: number;
  appId: AppId;
}

// App-specific configuration
export interface AppConfig {
  appId: AppId;
  proxyEnabled: boolean;
  proxyPort: number;
  selectedProviderId: string;
  customEndpoints?: Record<string, string>;
}

// Predefined App list
export const APPS: AppMeta[] = [
  {
    id: 'easyterminal',
    name: 'EasyTerminal',
    icon: 'easyterminal',
    description: 'EasyTerminal 应用配置',
    defaultConfigPath: ''
  },
  {
    id: 'claude',
    name: 'Claude Code',
    icon: 'claude',
    description: 'Anthropic 官方 CLI 工具',
    defaultConfigPath: '~/.claude.json'
  },
  {
    id: 'codex',
    name: 'Codex (ChatGPT)',
    icon: 'codex',
    description: 'OpenAI Codex / ChatGPT',
    defaultConfigPath: '~/.codex/auth.json'
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    icon: 'openclaw',
    description: 'OpenClaw 本地 AI 代理',
    defaultConfigPath: '~/.openclaw/config.json'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    icon: 'gemini',
    description: 'Google Gemini CLI',
    defaultConfigPath: '~/.gemini/config.json'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: 'opencode',
    description: '开源 Code Agent',
    defaultConfigPath: '~/.opencode/config.json'
  }
];

// Default providers
export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    icon: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    models: 'claude-3-5-sonnet,claude-3-opus,claude-3-haiku',
    status: 'unknown',
    description: 'Anthropic Claude 系列模型',
    category: 'official',
    apiFormat: 'anthropic'
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    icon: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    models: 'gpt-4o,gpt-4-turbo,gpt-4,gpt-3.5-turbo',
    status: 'unknown',
    description: 'OpenAI GPT 系列模型',
    category: 'official',
    apiFormat: 'openai_chat'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    models: 'gemini-1.5-pro,gemini-1.5-flash',
    status: 'unknown',
    description: 'Google Gemini 模型',
    category: 'official',
    apiFormat: 'anthropic'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    models: 'deepseek-chat,deepseek-coder',
    status: 'unknown',
    description: 'DeepSeek 开源模型',
    category: 'third_party',
    apiFormat: 'openai_chat'
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    icon: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    models: 'glm-4,glm-4v,glm-3-turbo',
    status: 'unknown',
    description: '智谱 AI GLM 系列',
    category: 'cn_official',
    apiFormat: 'openai_chat'
  },
  {
    id: 'minimax',
    name: 'MiniMax 海螺',
    icon: 'minimax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiKey: '',
    models: 'MiniMax-M2.7',
    status: 'unknown',
    description: 'MiniMax 海螺AI',
    category: 'cn_official',
    apiFormat: 'anthropic'
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    icon: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    models: 'moonshot-v1-8k,moonshot-v1-32k',
    status: 'unknown',
    description: 'Moonshot Kimi AI',
    category: 'cn_official',
    apiFormat: 'openai_chat'
  },
  {
    id: 'doubao',
    name: '火山引擎 DouBao',
    icon: 'doubao',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
    apiKey: '',
    models: 'doubao-seed-2-0-code-preview-latest',
    status: 'unknown',
    description: '字节跳动火山引擎豆包',
    category: 'cn_official',
    apiFormat: 'anthropic'
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    icon: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: '',
    models: 'llama3,mistral,codellama',
    status: 'unknown',
    description: 'Ollama 本地大模型',
    category: 'custom',
    apiFormat: 'openai_chat'
  }
];

// Default agents (one per App)
export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    icon: 'claude',
    providerId: 'anthropic',
    models: 'claude-3-5-sonnet',
    configPath: '~/.claude.json',
    status: 'unknown',
    description: 'Anthropic 官方 CLI 工具',
    appId: 'claude'
  },
  {
    id: 'codex',
    name: 'Codex (ChatGPT)',
    icon: 'codex',
    providerId: 'openai',
    models: 'gpt-4o',
    configPath: '~/.codex/auth.json',
    status: 'unknown',
    description: 'OpenAI Codex / ChatGPT',
    appId: 'codex'
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    icon: 'openclaw',
    providerId: 'anthropic',
    models: 'claude-3-5-sonnet',
    configPath: '~/.openclaw/config.json',
    status: 'unknown',
    description: 'OpenClaw 本地 AI 代理',
    appId: 'openclaw'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    icon: 'gemini',
    providerId: 'gemini',
    models: 'gemini-1.5-flash',
    configPath: '~/.gemini/config.json',
    status: 'unknown',
    description: 'Google Gemini CLI',
    appId: 'gemini'
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: 'opencode',
    providerId: 'openai',
    models: 'gpt-4o',
    configPath: '~/.opencode/config.json',
    status: 'unknown',
    description: '开源 Code Agent',
    appId: 'opencode'
  }
];
