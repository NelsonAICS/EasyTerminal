import { Bot } from 'lucide-react';
import { APPS, type AppId, type AgentConfig, type Provider } from '../types/agent';
import { AppIcon } from './ProviderIcon';

interface AppSwitcherProps {
  activeAppId: AppId;
  agents: AgentConfig[];
  providers: Provider[];
  onAppChange: (appId: AppId) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-500 shadow-[0_0_8px_#22c55e]';
    case 'error': return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
    case 'testing': return 'bg-yellow-500 animate-pulse';
    default: return 'bg-gray-500';
  }
};

export function AppSwitcher({ activeAppId, agents, providers, onAppChange }: AppSwitcherProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-black/30 border-b border-[var(--panel-border)]">
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        <Bot size={14} />
        <span className="text-xs font-medium">App:</span>
      </div>

      <div className="flex items-center gap-1.5">
        {APPS.map(app => {
          const agent = agents.find(a => a.appId === app.id);
          const provider = providers.find(p => p.id === agent?.providerId);
          const isActive = app.id === activeAppId;
          const isEasyTerminal = app.id === 'easyterminal';

          return (
            <button
              key={app.id}
              onClick={() => onAppChange(app.id)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5 border border-transparent'
                }
              `}
            >
              {isEasyTerminal ? (
                <img src="/icon.png" alt="EasyTerminal" className="w-[18px] h-[18px] rounded-sm" />
              ) : (
                <AppIcon name={app.icon} size={18} />
              )}
              <span className="hidden sm:inline text-xs">{app.name}</span>
              {isActive && !isEasyTerminal && agent && (
                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(provider?.status || 'unknown')}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
