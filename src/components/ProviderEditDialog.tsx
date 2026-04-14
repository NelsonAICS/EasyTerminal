import { useState, useEffect } from 'react';
import { X, KeyRound, Server, RefreshCw, Check } from 'lucide-react';
import { type Provider } from '../types/agent';
import { ProviderIcon } from './ProviderIcon';

interface ProviderEditDialogProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: Provider) => void;
  onTest: (providerId: string) => void;
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
  const [formData, setFormData] = useState<Provider>({
    id: '',
    name: '',
    icon: 'custom',
    baseUrl: '',
    apiKey: '',
    models: '',
    status: 'unknown',
    description: '',
    category: 'custom',
    apiFormat: 'openai_chat'
  });

  useEffect(() => {
    if (provider) {
      setFormData(provider);
    } else {
      setFormData({
        id: 'custom_' + Date.now(),
        name: '自定义供应商',
        icon: 'custom',
        baseUrl: 'https://api.example.com/v1',
        apiKey: '',
        models: 'gpt-4o',
        status: 'unknown',
        description: '自定义 API 供应商',
        category: 'custom',
        apiFormat: 'openai_chat'
      });
    }
  }, [provider, isOpen]);

  const handleChange = (field: keyof Provider, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value, status: 'unknown' }));
  };

  const handleIconChange = (icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const isTesting = formData.status === 'testing';
  const canTest = formData.apiKey && !isTesting;
  const canSave = formData.name && formData.baseUrl && formData.models;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/10 bg-[var(--bg-base)]/95 overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/30">
          <h3 className="text-sm font-medium text-white">
            {provider ? '编辑供应商' : '添加供应商'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full text-[var(--text-secondary)] hover:text-white transition-colors"
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
              <div className="w-14 h-14 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center shadow-lg">
                <ProviderIcon name={formData.icon} size={36} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => handleIconChange(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      formData.icon === icon
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-black/30 border border-transparent hover:bg-white/10'
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono focus:border-white/30 focus:outline-none transition-colors"
              placeholder="https://api.openai.com/v1"
            />
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              完整 URL 路径，如 https://api.minimaxi.com/anthropic
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono focus:border-white/30 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono focus:border-white/30 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none transition-colors"
            >
              {API_FORMATS.map(fmt => (
                <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              MiniMax 等用 Anthropic 格式，OpenAI 兼容接口用 Chat Completions
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              类别
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none transition-colors resize-none"
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
        <div className="h-14 border-t border-white/10 flex items-center justify-end gap-2 px-4 bg-black/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onTest(formData.id)}
            disabled={!canTest}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              !canTest
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isTesting ? (
              <><RefreshCw size={14} className="animate-spin" /> 测试中...</>
            ) : (
              <><Check size={14} /> 测试连接</>
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              !canSave
                ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
