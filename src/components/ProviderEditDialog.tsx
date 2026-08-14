import { useState } from 'react';
import { X, KeyRound, Server, RefreshCw, Check } from 'lucide-react';
import { type Provider } from '../types/agent';
import { ProviderIcon } from './ProviderIcon';
import { CONNECTION_TEST_BUTTON_LABELS } from '../lib/ui-copy';

interface ProviderEditDialogProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: Provider) => void;
  onTest: (provider: Provider) => Promise<Pick<Provider, 'status' | 'errorMessage'>>;
}

const CATEGORIES = [
  { id: 'official', name: '官方' },
  { id: 'cn_official', name: '国产官方' },
  { id: 'cloud_provider', name: '云服务商' },
  { id: 'aggregator', name: '聚合网站' },
  { id: 'third_party', name: '第三方' },
  { id: 'custom', name: '自定义' },
  { id: 'omo', name: 'OMO' },
  { id: 'omo-slim', name: 'OMO Slim' }
];

const API_FORMATS = [
  { id: 'anthropic', name: 'Anthropic Messages (原生)' },
  { id: 'openai_chat', name: 'OpenAI Chat Completions' },
  { id: 'openai_responses', name: 'OpenAI Responses API' }
];

const ICON_OPTIONS = [
  'anthropic', 'openai', 'gemini', 'deepseek', 'zhipu', 'minimax', 'kimi', 'doubao', 'ollama', 'custom'
];

export function ProviderEditDialog({
  provider,
  isOpen,
  onClose,
  onSave,
  onTest
}: ProviderEditDialogProps) {
  if (!isOpen) return null;
  return (
    <ProviderEditDialogContent
      key={provider?.id ?? 'new-provider'}
      provider={provider}
      onClose={onClose}
      onSave={onSave}
      onTest={onTest}
    />
  );
}

function ProviderEditDialogContent({
  provider,
  onClose,
  onSave,
  onTest,
}: Omit<ProviderEditDialogProps, 'isOpen'>) {
  const [formData, setFormData] = useState<Provider>(() => provider ?? ({
    id: 'custom_' + Date.now(),
    name: '自定义供应商',
    icon: 'custom',
    baseUrl: 'https://api.example.com/v1',
    chatEndpoint: '',
    embeddingEndpoint: '',
    apiKey: '',
    models: 'gpt-4o',
    status: 'unknown',
    description: '自定义 API 供应商',
    category: 'custom',
    apiFormat: 'openai_chat'
  }));

  const handleChange = (field: keyof Provider, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, status: 'unknown', errorMessage: undefined }));
  };

  const handleIconChange = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleTest = async () => {
    setFormData(prev => ({ ...prev, status: 'testing', errorMessage: undefined }));
    const result = await onTest(formData);
    setFormData(prev => ({ ...prev, ...result }));
  };

  const isTesting = formData.status === 'testing';
  const canTest = formData.apiKey && !isTesting;
  const canSave = formData.name && formData.baseUrl && formData.models;
  const testButtonClassName =
    !canTest
      ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
      : formData.status === 'success'
        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
        : formData.status === 'error'
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : formData.status === 'testing'
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--panel-border)]';

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-[var(--panel-border)] flex items-center justify-between px-4 bg-[var(--surface-muted)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {provider ? '编辑供应商' : '添加供应商'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--panel-border)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              图标
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center shadow-lg">
                <ProviderIcon name={formData.icon} size={36} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => handleIconChange(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      formData.icon === icon
                        ? 'bg-[var(--surface-muted)] border border-[var(--accent)]'
                        : 'bg-[var(--panel-bg)] border border-transparent hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    <ProviderIcon name={icon} size={24} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="OpenAI GPT"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <Server size={12} />
              API 地址
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => handleChange('baseUrl', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="https://api.openai.com/v1"
            />
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              支持填写基础地址，也支持直接填写完整请求 endpoint，例如 https://cc-vibe.com/v1/messages
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
              <KeyRound size={12} />
              API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="sk-..."
            />
          </div>

          {/* Models */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              模型列表
            </label>
            <input
              type="text"
              value={formData.models}
              onChange={(e) => handleChange('models', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
              placeholder="gpt-4o,gpt-4-turbo"
            />
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              多个模型用逗号分隔
            </p>
          </div>

          {/* API Format */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              API 格式
            </label>
            <select
              value={formData.apiFormat || 'openai_chat'}
              onChange={(e) => handleChange('apiFormat', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
            >
              {API_FORMATS.map(fmt => (
                <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              MiniMax 等用 Anthropic 格式，OpenAI 兼容接口用 Chat Completions
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Chat Endpoint（可选）
              </label>
              <input
                type="text"
                value={formData.chatEndpoint || ''}
                onChange={(e) => handleChange('chatEndpoint', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
                placeholder="/chat/completions 或 https://example.com/v1/messages"
              />
              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                不填则按 API 格式自动推断；可填相对路径，也可填完整 URL
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Embedding Endpoint（可选）
              </label>
              <input
                type="text"
                value={formData.embeddingEndpoint || ''}
                onChange={(e) => handleChange('embeddingEndpoint', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
                placeholder="/embeddings 或 https://example.com/v1/embeddings"
              />
              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                Embedding 模型和知识库会优先使用这里的地址
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              类别
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm focus:border-[var(--accent)]/50 focus:outline-none transition-colors resize-none"
              placeholder="供应商描述..."
            />
          </div>

          {/* Error Message */}
          {formData.errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {formData.errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-[var(--panel-border)] flex items-center justify-end gap-2 px-4 bg-[var(--surface-muted)]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-border)] transition-all"
          >
            取消
          </button>
          <button
            onClick={handleTest}
            disabled={!canTest}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${testButtonClassName}`}
          >
            {isTesting ? (
              <><RefreshCw size={14} className="animate-spin" /> {CONNECTION_TEST_BUTTON_LABELS.testing}</>
            ) : formData.status === 'success' ? (
              <><Check size={14} /> {CONNECTION_TEST_BUTTON_LABELS.success}</>
            ) : formData.status === 'error' ? (
              <><X size={14} /> {CONNECTION_TEST_BUTTON_LABELS.error}</>
            ) : (
              <><RefreshCw size={14} /> {CONNECTION_TEST_BUTTON_LABELS.unknown}</>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !canSave
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--panel-border)]'
            }`}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
