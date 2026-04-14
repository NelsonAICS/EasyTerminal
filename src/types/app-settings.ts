// App Settings — Extended API configuration for EasyTerminal

export type ServiceStatus = 'unknown' | 'testing' | 'success' | 'error';

// ── Reasoning Model ──────────────────────────────────────────────
export interface ReasoningModelConfig {
  providerId: string;
  model: string;
  status: ServiceStatus;
  errorMessage?: string;
}

// ── Embedding Model ──────────────────────────────────────────────
export interface EmbeddingModelConfig {
  source: 'local' | 'provider' | 'custom';
  /** When source='local' — Ollama base URL */
  localUrl?: string;
  /** When source='provider' */
  providerId?: string;
  /** When source='custom' */
  customBaseUrl?: string;
  customApiKey?: string;
  model: string;
  dimensions: number;
  status: ServiceStatus;
  errorMessage?: string;
}

export interface OllamaModelInfo {
  name: string;
  size?: number;
  modified_at?: string;
}

// ── External Services ────────────────────────────────────────────
export type ExternalServiceType = 'oss' | 'feishu' | 'webhook' | 'smtp' | 'custom';

export interface ExternalServiceConfig {
  id: string;
  type: ExternalServiceType;
  name: string;
  enabled: boolean;
  config: Record<string, string>;
  status: ServiceStatus;
  errorMessage?: string;
}

export interface ExternalServiceTypeMeta {
  id: ExternalServiceType;
  name: string;
  icon: string; // lucide icon name
  description: string;
  fields: { key: string; label: string; placeholder?: string; secret?: boolean }[];
}

export const EXTERNAL_SERVICE_TYPES: ExternalServiceTypeMeta[] = [
  {
    id: 'oss',
    name: '对象存储 (OSS)',
    icon: 'Cloud',
    description: '阿里云 OSS / AWS S3 / MinIO 等',
    fields: [
      { key: 'endpoint', label: 'Endpoint', placeholder: 'https://oss-cn-hangzhou.aliyuncs.com' },
      { key: 'bucket', label: 'Bucket', placeholder: 'my-bucket' },
      { key: 'accessKeyId', label: 'Access Key ID' },
      { key: 'accessKeySecret', label: 'Access Key Secret', secret: true },
      { key: 'region', label: 'Region', placeholder: 'cn-hangzhou' },
    ],
  },
  {
    id: 'feishu',
    name: '飞书',
    icon: 'MessageSquare',
    description: '飞书机器人消息推送',
    fields: [
      { key: 'appId', label: 'App ID' },
      { key: 'appSecret', label: 'App Secret', secret: true },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/...' },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    icon: 'Link',
    description: '自定义 Webhook 回调',
    fields: [
      { key: 'url', label: 'URL', placeholder: 'https://example.com/webhook' },
      { key: 'secret', label: 'Secret', secret: true },
      { key: 'method', label: 'Method', placeholder: 'POST' },
    ],
  },
  {
    id: 'smtp',
    name: '邮件 (SMTP)',
    icon: 'Mail',
    description: 'SMTP 邮件发送',
    fields: [
      { key: 'host', label: 'SMTP 服务器', placeholder: 'smtp.gmail.com' },
      { key: 'port', label: '端口', placeholder: '465' },
      { key: 'user', label: '用户名', placeholder: 'you@gmail.com' },
      { key: 'password', label: '密码', secret: true },
      { key: 'from', label: '发件人', placeholder: 'you@gmail.com' },
    ],
  },
  {
    id: 'custom',
    name: '自定义服务',
    icon: 'Puzzle',
    description: '自定义外部 API 服务',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.example.com' },
      { key: 'apiKey', label: 'API Key', secret: true },
      { key: 'headers', label: '自定义 Headers (JSON)', placeholder: '{"X-Custom":"value"}' },
    ],
  },
];

// ── App Settings Root ────────────────────────────────────────────
export interface AppSettingsConfig {
  reasoningModel: ReasoningModelConfig;
  embeddingModel: EmbeddingModelConfig;
  externalServices: ExternalServiceConfig[];
}

export const DEFAULT_APP_SETTINGS: AppSettingsConfig = {
  reasoningModel: {
    providerId: '',
    model: '',
    status: 'unknown',
  },
  embeddingModel: {
    source: 'local',
    localUrl: 'http://localhost:11434',
    model: '',
    dimensions: 1024,
    status: 'unknown',
  },
  externalServices: [],
};
