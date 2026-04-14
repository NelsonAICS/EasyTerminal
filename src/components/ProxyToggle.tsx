import { useState, useEffect } from 'react';
import { Power, RefreshCw } from 'lucide-react';
import type { AppId } from '../types/agent';

interface ProxyToggleProps {
  appId: AppId;
  appName: string;
  providerConfigured: boolean;
}

interface ProxyStatus {
  enabled: boolean;
  port: number;
  appId: string | null;
}

export function ProxyToggle({ appId, appName, providerConfigured }: ProxyToggleProps) {
  const [status, setStatus] = useState<ProxyStatus>({ enabled: false, port: 8080, appId: null });
  const [isLoading, setIsLoading] = useState(false);

  const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

  useEffect(() => {
    // Get initial status
    if (ipcRenderer) {
      ipcRenderer.invoke('proxy:status').then((res: ProxyStatus) => {
        setStatus(res);
      });
    }
  }, []);

  const handleToggle = async () => {
    if (!ipcRenderer) return;

    setIsLoading(true);
    try {
      if (status.enabled) {
        // Disable proxy
        const result = await ipcRenderer.invoke('proxy:disable');
        if (result.success) {
          setStatus({ enabled: false, port: 8080, appId: null });
        }
      } else {
        // Enable proxy for this app
        if (!providerConfigured) {
          alert('请先配置 API Provider');
          return;
        }
        const result = await ipcRenderer.invoke('proxy:enable', appId);
        if (result.success) {
          setStatus({ enabled: true, port: result.port, appId });
        } else {
          alert(`代理启动失败: ${result.error}`);
        }
      }
    } catch (err) {
      console.error('Proxy toggle error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isActive = status.enabled && status.appId === appId;

  return (
    <div className={`
      flex items-center gap-3 px-3 py-2 rounded-lg border transition-all
      ${isActive
        ? 'bg-green-500/10 border-green-500/30'
        : 'bg-black/20 border-[var(--panel-border)] hover:border-white/20'
      }
    `}>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center transition-all
          ${isActive
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/20'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isActive ? '禁用代理接管' : '启用代理接管'}
      >
        {isLoading ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          <Power size={16} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${isActive ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
          Proxy 接管
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] truncate">
          {isActive
            ? `${appName} @ :${status.port}`
            : providerConfigured
              ? '点击启用'
              : '需先配置 Provider'
          }
        </div>
      </div>

      {isActive && (
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
      )}
    </div>
  );
}
