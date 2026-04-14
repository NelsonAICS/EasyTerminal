import { useState, useEffect } from 'react';
import { Check, RefreshCw, ChevronDown, VectorSquare, Wifi, WifiOff, HardDrive, Cloud, Link } from 'lucide-react';
import { type Provider } from '../types/agent';
import { type EmbeddingModelConfig, type OllamaModelInfo } from '../types/app-settings';
import { ProviderIcon } from './ProviderIcon';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

interface Props {
  config: EmbeddingModelConfig;
  providers: Provider[];
  onUpdate: (config: EmbeddingModelConfig) => void;
  onTest: () => void;
}

type EmbeddingSource = 'local' | 'provider' | 'custom';

const SOURCE_OPTIONS: { id: EmbeddingSource; label: string; icon: typeof HardDrive; desc: string }[] = [
  { id: 'local', label: '本地模型', icon: HardDrive, desc: 'Ollama' },
  { id: 'provider', label: '复用供应商', icon: Cloud, desc: '远程 API' },
  { id: 'custom', label: '自定义端点', icon: Link, desc: '自建服务' },
];

export function EmbeddingModelSection({ config, providers, onUpdate, onTest }: Props) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [ollamaEmbeddingModels, setOllamaEmbeddingModels] = useState<OllamaModelInfo[]>([]);
  const [checkingOllama, setCheckingOllama] = useState(false);

  const selectedProvider = providers.find(p => p.id === config.providerId);

  // Detect Ollama status
  const checkOllama = async () => {
    if (!ipcRenderer) return;
    setCheckingOllama(true);
    try {
      const result = await ipcRenderer.invoke('ollama:check', config.localUrl || 'http://localhost:11434');
      setOllamaRunning(result.running);
      setOllamaModels(result.models || []);
      setOllamaEmbeddingModels(result.embeddingModels || []);
    } catch {
      setOllamaRunning(false);
    } finally {
      setCheckingOllama(false);
    }
  };

  useEffect(() => {
    if (config.source === 'local') {
      checkOllama();
    }
  }, [config.source, config.localUrl]);

  const handleSourceChange = (source: EmbeddingSource) => {
    onUpdate({
      ...config,
      source,
      providerId: source === 'provider' ? '' : undefined,
      customBaseUrl: source === 'custom' ? '' : undefined,
      customApiKey: source === 'custom' ? '' : undefined,
      model: '',
      status: 'unknown',
      errorMessage: undefined,
    });
  };

  const handleProviderSelect = (providerId: string) => {
    onUpdate({ ...config, providerId, model: '', status: 'unknown', errorMessage: undefined });
    setProviderOpen(false);
  };

  const handleLocalModelSelect = (modelName: string) => {
    onUpdate({ ...config, model: modelName, status: 'unknown', errorMessage: undefined });
    setModelOpen(false);
  };

  const handleFieldChange = (field: keyof EmbeddingModelConfig, value: string | number) => {
    onUpdate({ ...config, [field]: value, status: 'unknown', errorMessage: undefined });
  };

  const statusBadge = () => {
    const cls: Record<string, string> = {
      success: 'bg-green-500/20 text-green-400',
      error: 'bg-red-500/20 text-red-400',
      testing: 'bg-yellow-500/20 text-yellow-400',
      unknown: 'bg-gray-500/20 text-gray-400',
    };
    const label: Record<string, string> = {
      success: '可用', error: '错误', testing: '测试中', unknown: '未测试',
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls[config.status]}`}>
        {label[config.status]}
      </span>
    );
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
  };

  const canTest =
    config.source === 'local'
      ? !!config.model
      : config.source === 'provider'
        ? !!config.providerId && !!config.model
        : !!config.customBaseUrl && !!config.model;

  // Models to show in the local dropdown: prefer embedding models, show all as fallback
  const displayModels = ollamaEmbeddingModels.length > 0 ? ollamaEmbeddingModels : ollamaModels;

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <VectorSquare size={16} className="text-cyan-400" />
        <h3 className="text-sm font-medium text-white">Embedding 模型</h3>
        <div className="ml-auto">{statusBadge()}</div>
      </div>

      <div className="space-y-3">
        {/* Source Selection — 3 buttons */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">模式</label>
          <div className="flex gap-1.5">
            {SOURCE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = config.source === opt.id;
              const isRecommended = opt.id === 'local';
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSourceChange(opt.id)}
                  className={`relative flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-black/30 text-white/50 border border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Icon size={13} />
                    <span>{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">{opt.desc}</div>
                  {isRecommended && (
                    <span className="absolute -top-1.5 -right-1 text-[8px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      推荐
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- Local Mode ---- */}
        {config.source === 'local' && (
          <>
            {/* Ollama URL */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Ollama 地址</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.localUrl || 'http://localhost:11434'}
                  onChange={e => handleFieldChange('localUrl', e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:border-white/20 focus:outline-none transition-colors"
                  placeholder="http://localhost:11434"
                />
                <button
                  onClick={checkOllama}
                  disabled={checkingOllama}
                  className="px-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15 text-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  {checkingOllama ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : ollamaRunning === true ? (
                    <Wifi size={12} className="text-green-400" />
                  ) : ollamaRunning === false ? (
                    <WifiOff size={12} className="text-red-400" />
                  ) : (
                    <Wifi size={12} />
                  )}
                  {checkingOllama ? '检测中' : '检测'}
                </button>
              </div>
            </div>

            {/* Ollama Status */}
            {ollamaRunning === false && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                <p className="font-medium mb-1">Ollama 未运行</p>
                <p className="text-white/50">请先启动 Ollama 并拉取 Embedding 模型：</p>
                <code className="block mt-1.5 px-3 py-1.5 rounded-lg bg-black/40 text-cyan-300 font-mono text-[11px]">
                  ollama pull bge-m3
                </code>
              </div>
            )}

            {ollamaRunning === true && displayModels.length === 0 && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                <p className="font-medium mb-1">未检测到 Embedding 模型</p>
                <p className="text-white/50">Ollama 运行中但没有 Embedding 模型，建议拉取：</p>
                <code className="block mt-1.5 px-3 py-1.5 rounded-lg bg-black/40 text-cyan-300 font-mono text-[11px]">
                  ollama pull bge-m3
                </code>
              </div>
            )}

            {/* Local Model Selector */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">模型</label>
              <div className="relative">
                <button
                  onClick={() => setModelOpen(!modelOpen)}
                  disabled={!ollamaRunning}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm transition-colors ${
                    !ollamaRunning ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
                  }`}
                >
                  <span className={config.model ? 'text-white' : 'text-white/40'}>
                    {config.model || '选择本地模型'}
                  </span>
                  <ChevronDown size={14} className={`text-white/40 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
                </button>
                {modelOpen && ollamaRunning && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl bg-[var(--bg-base)] border border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {displayModels.length > 0 ? displayModels.map(m => (
                      <button
                        key={m.name}
                        onClick={() => handleLocalModelSelect(m.name)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors ${config.model === m.name ? 'bg-white/5' : ''}`}
                      >
                        <HardDrive size={14} className="text-cyan-400/70 shrink-0" />
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{m.name}</div>
                          {m.size && <div className="text-[10px] text-white/40">{formatSize(m.size)}</div>}
                        </div>
                        {config.model === m.name && <Check size={14} className="text-green-400 shrink-0" />}
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-white/40 text-xs text-center">暂无可用模型</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ---- Provider Mode ---- */}
        {config.source === 'provider' && (
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">供应商</label>
            <div className="relative">
              <button
                onClick={() => setProviderOpen(!providerOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {selectedProvider && <ProviderIcon name={selectedProvider.icon} size={18} />}
                  <span>{selectedProvider?.name || '选择供应商'}</span>
                </div>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${providerOpen ? 'rotate-180' : ''}`} />
              </button>
              {providerOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl bg-[var(--bg-base)] border border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderSelect(p.id)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors ${config.providerId === p.id ? 'bg-white/5' : ''}`}
                    >
                      <ProviderIcon name={p.icon} size={18} />
                      <span className="text-sm text-white">{p.name}</span>
                      {config.providerId === p.id && <Check size={14} className="ml-auto text-green-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Custom Mode ---- */}
        {config.source === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Base URL</label>
              <input
                type="text"
                value={config.customBaseUrl || ''}
                onChange={e => handleFieldChange('customBaseUrl', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:border-white/20 focus:outline-none transition-colors"
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">API Key</label>
              <input
                type="password"
                value={config.customApiKey || ''}
                onChange={e => handleFieldChange('customApiKey', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:border-white/20 focus:outline-none transition-colors"
                placeholder="sk-..."
              />
            </div>
          </>
        )}

        {/* Model Name & Dimensions (provider / custom only) */}
        {config.source !== 'local' && (
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">模型名称</label>
            <input
              type="text"
              value={config.model}
              onChange={e => handleFieldChange('model', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono focus:border-white/20 focus:outline-none transition-colors"
              placeholder="text-embedding-3-small"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">向量维度</label>
          <input
            type="number"
            value={config.dimensions}
            onChange={e => handleFieldChange('dimensions', parseInt(e.target.value) || 1024)}
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-white/20 focus:outline-none transition-colors"
            min={1}
          />
        </div>

        {/* Error */}
        {config.errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {config.errorMessage}
          </div>
        )}

        {/* Test */}
        <button
          onClick={onTest}
          disabled={!canTest || config.status === 'testing'}
          className={`w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            !canTest
              ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
              : config.status === 'testing'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
          }`}
        >
          {config.status === 'testing' ? (
            <><RefreshCw size={14} className="animate-spin" /> 测试中...</>
          ) : (
            <><Check size={14} /> 测试 Embedding</>
          )}
        </button>
      </div>
    </div>
  );
}
