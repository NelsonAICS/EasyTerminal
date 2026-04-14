import { Plus, RefreshCw, Check, Trash2 } from 'lucide-react';
import { type Provider } from '../types/agent';
import { ProviderIcon } from './ProviderIcon';

interface ProviderListProps {
  providers: Provider[];
  activeProviderId: string;
  onProviderSelect: (providerId: string) => void;
  onProviderTest: (providerId: string) => void;
  onProviderDelete: (providerId: string) => void;
  onAddProvider: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'success': return { text: '可用', className: 'bg-green-500/20 text-green-400' };
    case 'error': return { text: '错误', className: 'bg-red-500/20 text-red-400' };
    case 'testing': return { text: '测试中', className: 'bg-yellow-500/20 text-yellow-400' };
    default: return { text: '未测试', className: 'bg-gray-500/20 text-gray-400' };
  }
};

export function ProviderList({
  providers,
  activeProviderId,
  onProviderSelect,
  onProviderTest,
  onProviderDelete,
  onAddProvider
}: ProviderListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--panel-border)]">
        <button
          onClick={onAddProvider}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 border border-white/10 transition-all text-sm font-medium"
        >
          <Plus size={16} />
          添加供应商
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {providers.map(p => {
          const badge = getStatusBadge(p.status);
          return (
            <div
              key={p.id}
              onClick={() => onProviderSelect(p.id)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all
                ${activeProviderId === p.id
                  ? 'bg-white/10 border border-white/20'
                  : 'hover:bg-white/5 border border-transparent'
                }
              `}
            >
              <ProviderIcon name={p.icon} size={32} />

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${activeProviderId === p.id ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                  {p.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {p.id.startsWith('custom_') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onProviderDelete(p.id); }}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {p.apiKey && p.status !== 'testing' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onProviderTest(p.id); }}
                    className="p-1 hover:bg-green-500/20 rounded text-green-400/50 hover:text-green-400 transition-colors"
                    title="测试连接"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}

                {p.status === 'testing' && (
                  <RefreshCw size={14} className="animate-spin text-yellow-400" />
                )}

                {p.status === 'success' && (
                  <Check size={14} className="text-green-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
