import { useState } from 'react';
import { Check, RefreshCw, ChevronDown, Brain } from 'lucide-react';
import { type Provider } from '../types/agent';
import { type ReasoningModelConfig } from '../types/app-settings';
import { ProviderIcon } from './ProviderIcon';

interface Props {
  config: ReasoningModelConfig;
  providers: Provider[];
  onUpdate: (config: ReasoningModelConfig) => void;
  onTest: () => void;
}

export function ReasoningModelSection({ config, providers, onUpdate, onTest }: Props) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const selectedProvider = providers.find(p => p.id === config.providerId);
  const models = selectedProvider?.models.split(',').map(m => m.trim()).filter(Boolean) || [];

  const handleProviderSelect = (providerId: string) => {
    const p = providers.find(pp => pp.id === providerId);
    onUpdate({
      ...config,
      providerId,
      model: p?.models.split(',')[0]?.trim() || '',
      status: 'unknown',
      errorMessage: undefined,
    });
    setProviderOpen(false);
  };

  const handleModelSelect = (model: string) => {
    onUpdate({ ...config, model, status: 'unknown', errorMessage: undefined });
    setModelOpen(false);
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

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} className="text-purple-400" />
        <h3 className="text-sm font-medium text-white">推理模型</h3>
        <div className="ml-auto">{statusBadge()}</div>
      </div>

      <div className="space-y-3">
        {/* Provider Select */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">供应商</label>
          <div className="relative">
            <button
              onClick={() => { setProviderOpen(!providerOpen); setModelOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                {selectedProvider && <ProviderIcon name={selectedProvider.icon} size={18} />}
                <span>{selectedProvider?.name || '选择供应商'}</span>
              </div>
              <ChevronDown size={14} className={`text-white/40 transition-transform ${providerOpen ? 'rotate-180' : ''}`} />
            </button>
            {providerOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-xl bg-[var(--bg-base)] border border-white/10 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                {providers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderSelect(p.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left ${config.providerId === p.id ? 'bg-white/5' : ''}`}
                  >
                    <ProviderIcon name={p.icon} size={18} />
                    <span className="text-sm text-white flex-1">{p.name}</span>
                    {config.providerId === p.id && <Check size={14} className="text-green-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Model Select */}
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">模型</label>
          <div className="relative">
            <button
              onClick={() => { setModelOpen(!modelOpen); setProviderOpen(false); }}
              disabled={!config.providerId}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{config.model || '选择模型'}</span>
              <ChevronDown size={14} className={`text-white/40 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
            </button>
            {modelOpen && models.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl bg-[var(--bg-base)] border border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {models.map(m => (
                  <button
                    key={m}
                    onClick={() => handleModelSelect(m)}
                    className={`w-full flex items-center px-4 py-2.5 hover:bg-white/5 transition-colors ${config.model === m ? 'bg-white/5' : ''}`}
                  >
                    <span className={`text-sm ${config.model === m ? 'text-white' : 'text-white/70'}`}>{m}</span>
                    {config.model === m && <Check size={14} className="ml-auto text-green-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {config.errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {config.errorMessage}
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={onTest}
          disabled={!config.providerId || !config.model || config.status === 'testing'}
          className={`w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            !config.providerId || !config.model
              ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
              : config.status === 'testing'
                ? 'bg-yellow-500/10 text-yellow-400'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
          }`}
        >
          {config.status === 'testing' ? (
            <><RefreshCw size={14} className="animate-spin" /> 测试中...</>
          ) : (
            <><Check size={14} /> 测试连通性</>
          )}
        </button>
      </div>
    </div>
  );
}
