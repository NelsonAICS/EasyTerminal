import { useState, useEffect } from 'react';
import { X, Check, RefreshCw, KeyRound, Server, Bot, ChevronDown, Zap } from 'lucide-react';
import { AppSwitcher } from './AppSwitcher';
import { ProviderList } from './ProviderList';
import { ProviderEditDialog } from './ProviderEditDialog';
import { ProxyToggle } from './ProxyToggle';
import { ProviderIcon } from './ProviderIcon';
import { ReasoningModelSection } from './ReasoningModelSection';
import { EmbeddingModelSection } from './EmbeddingModelSection';
import { ExternalServicesSection } from './ExternalServicesSection';
import { CONNECTION_TEST_BUTTON_LABELS, CONNECTION_STATUS_LABELS } from '../lib/ui-copy';
import { type AppId, type Provider, type AgentConfig, DEFAULT_PROVIDERS, DEFAULT_AGENTS } from '../types/agent';
import { type AppSettingsConfig, type ExternalServiceConfig, type ServiceStatus, DEFAULT_APP_SETTINGS } from '../types/app-settings';
import {
  resolveAnthropicMessagesEndpoint,
  resolveEmbeddingEndpoint,
  resolveGeminiGenerateContentEndpoint,
  resolveOllamaChatEndpoint,
  resolveOpenAIChatEndpoint,
} from '../shared/api-endpoints';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-500 shadow-[0_0_8px_#22c55e]';
    case 'error': return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
    case 'testing': return 'bg-yellow-500 animate-pulse';
    default: return 'bg-gray-500';
  }
};

type TabType = 'agents' | 'providers';

export function ApiManager({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeAppId, setActiveAppId] = useState<AppId>('easyterminal');
  const [activeProviderId, setActiveProviderId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState<string | null>(null);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettingsConfig>(DEFAULT_APP_SETTINGS);

  // Get active agent for current app
  const activeAgent = agents.find(a => a.appId === activeAppId);
  const activeProvider = providers.find(p => p.id === activeAgent?.providerId);
  // Get selected provider for providers tab (from the provider list selection)
  const selectedProvider = providers.find(p => p.id === activeProviderId);

  useEffect(() => {
    if (ipcRenderer) {
      Promise.all([
        ipcRenderer.invoke('store:get', 'api_agents', DEFAULT_AGENTS),
        ipcRenderer.invoke('store:get', 'model_providers', DEFAULT_PROVIDERS),
        ipcRenderer.invoke('store:get', 'app_settings', DEFAULT_APP_SETTINGS),
        ipcRenderer.invoke('system:scan-api-keys')
      ]).then(([agentsData, providersData, appSettingsData, scannedKeys]: [AgentConfig[], Provider[], AppSettingsConfig, Record<string, string>]) => {
        const loadedAgents = agentsData?.length ? agentsData : DEFAULT_AGENTS;
        let loadedProviders = providersData?.length ? providersData : DEFAULT_PROVIDERS;

        if (scannedKeys && Object.keys(scannedKeys).length > 0) {
          loadedProviders = loadedProviders.map(p => {
            if (scannedKeys[p.id] && !p.apiKey) {
              return { ...p, apiKey: scannedKeys[p.id] };
            }
            return p;
          });
        }

        setAgents(loadedAgents);
        setProviders(loadedProviders);
        setAppSettings(appSettingsData || DEFAULT_APP_SETTINGS);
        setActiveAppId('easyterminal');
        const initialProviderId = loadedAgents[0]?.providerId || loadedProviders[0]?.id;
        if (initialProviderId) setActiveProviderId(initialProviderId);
      });
    }
  }, []);

  const saveAgentsToStore = async (newAgents: AgentConfig[]) => {
    if (ipcRenderer) {
      await ipcRenderer.invoke('store:set', 'api_agents', newAgents);
    }
  };

  const saveProvidersToStore = async (newProviders: Provider[]) => {
    if (ipcRenderer) {
      await ipcRenderer.invoke('store:set', 'model_providers', newProviders);
    }
  };

  const handleAgentUpdate = (id: string, field: keyof AgentConfig, value: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, [field]: value, status: field === 'providerId' || field === 'models' ? 'unknown' : a.status };
      }
      return a;
    }));
  };

  const handleProviderUpdate = (id: string, field: keyof Provider, value: string) => {
    setProviders(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value, status: field === 'apiKey' || field === 'baseUrl' ? 'unknown' : p.status };
      }
      return p;
    }));
  };

  const handleAgentProviderChange = (agentId: string, providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          providerId,
          models: provider.models.split(',')[0] || '',
          status: 'unknown'
        };
      }
      return a;
    }));
    setProviderDropdownOpen(null);
  };

  const runProviderTest = async (provider: Provider): Promise<Pick<Provider, 'status' | 'errorMessage'>> => {
    try {
      let endpoint = provider.baseUrl;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      let body: string | null = null;

      if (provider.id === 'gemini') {
        const model = provider.models.split(',')[0] || 'gemini-1.5-flash';
        endpoint = resolveGeminiGenerateContentEndpoint(provider.baseUrl, model, provider.apiKey, provider.chatEndpoint);
        body = JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }]
        });
      } else if (provider.id === 'ollama') {
        endpoint = resolveOllamaChatEndpoint(provider.baseUrl, provider.chatEndpoint);
        body = JSON.stringify({
          model: provider.models.split(',')[0] || 'llama3',
          messages: [{ role: 'user', content: 'hi' }],
          stream: false
        });
      } else if (provider.apiFormat === 'anthropic' || provider.id === 'anthropic' || provider.id === 'minimax' || provider.id === 'doubao') {
        endpoint = resolveAnthropicMessagesEndpoint(provider.baseUrl, provider.chatEndpoint);
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = JSON.stringify({
          model: provider.models.split(',')[0] || 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        });
      } else {
        endpoint = resolveOpenAIChatEndpoint(provider.baseUrl, provider.chatEndpoint);
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        body = JSON.stringify({
          model: provider.models.split(',')[0] || 'gpt-3.5-turbo',
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
        return { status: 'success', errorMessage: '' };
      }
      const errText = await res.text();
      return { status: 'error', errorMessage: `HTTP ${res.status}: ${errText.substring(0, 150)}` };
    } catch (err: unknown) {
      return { status: 'error', errorMessage: err instanceof Error ? err.message : '网络错误' };
    }
  };

  const applyProviderTestResult = (id: string, result: Pick<Provider, 'status' | 'errorMessage'>) => {
    setProviders(prev => prev.map(p => (
      p.id === id ? { ...p, status: result.status, errorMessage: result.errorMessage } : p
    )));
  };

  const handleTestProvider = async (id: string) => {
    const provider = providers.find(p => p.id === id);
    if (!provider) return;

    applyProviderTestResult(id, { status: 'testing', errorMessage: undefined });
    const result = await runProviderTest(provider);
    applyProviderTestResult(id, result);
  };

  const handleTestProviderDraft = async (provider: Provider): Promise<Pick<Provider, 'status' | 'errorMessage'>> => {
    return runProviderTest(provider);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await Promise.all([
      saveAgentsToStore(agents),
      saveProvidersToStore(providers),
      saveAppSettingsToStore(appSettings)
    ]);
    setTimeout(() => setIsSaving(false), 500);
  };

  const saveAppSettingsToStore = async (settings: AppSettingsConfig) => {
    if (ipcRenderer) {
      await ipcRenderer.invoke('store:set', 'app_settings', settings);
    }
  };

  const handleReasoningModelUpdate = (config: AppSettingsConfig['reasoningModel']) => {
    setAppSettings(prev => ({ ...prev, reasoningModel: config }));
  };

  const handleEmbeddingModelUpdate = (config: AppSettingsConfig['embeddingModel']) => {
    setAppSettings(prev => ({ ...prev, embeddingModel: config }));
  };

  const handleExternalServicesUpdate = (services: ExternalServiceConfig[]) => {
    setAppSettings(prev => ({ ...prev, externalServices: services }));
  };

  const handleTestReasoningModel = async () => {
    const rm = appSettings.reasoningModel;
    const provider = providers.find(p => p.id === rm.providerId);
    if (!provider || !rm.model) return;

    handleReasoningModelUpdate({ ...rm, status: 'testing', errorMessage: undefined });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let endpoint: string;
      let body: string;

      if (provider.id === 'gemini') {
        endpoint = resolveGeminiGenerateContentEndpoint(provider.baseUrl, rm.model, provider.apiKey, provider.chatEndpoint);
        body = JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] });
      } else if (provider.apiFormat === 'anthropic' || provider.id === 'anthropic' || provider.id === 'minimax' || provider.id === 'doubao') {
        endpoint = resolveAnthropicMessagesEndpoint(provider.baseUrl, provider.chatEndpoint);
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = JSON.stringify({ model: rm.model, max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] });
      } else {
        endpoint = resolveOpenAIChatEndpoint(provider.baseUrl, provider.chatEndpoint);
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
        body = JSON.stringify({ model: rm.model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 });
      }

      const res = await fetch(endpoint, { method: 'POST', headers, body });
      if (res.ok) {
        handleReasoningModelUpdate({ ...rm, status: 'success', errorMessage: undefined });
      } else {
        const errText = await res.text();
        handleReasoningModelUpdate({ ...rm, status: 'error', errorMessage: `HTTP ${res.status}: ${errText.substring(0, 150)}` });
      }
    } catch (err: unknown) {
      handleReasoningModelUpdate({ ...rm, status: 'error', errorMessage: err instanceof Error ? err.message : '网络错误' });
    }
  };

  const handleTestEmbeddingModel = async () => {
    const em = appSettings.embeddingModel;

    if (!em.model) return;

    handleEmbeddingModelUpdate({ ...em, status: 'testing', errorMessage: undefined });

    if (em.source === 'local') {
      // Local mode: test via IPC (electron main process calls Ollama)
      if (!ipcRenderer) return;
      try {
        const result = await ipcRenderer.invoke('ollama:test-embedding', em.localUrl || 'http://localhost:11434', em.model);
        if (result.success) {
          handleEmbeddingModelUpdate({
            ...em,
            status: 'success',
            errorMessage: undefined,
            dimensions: result.dimensions || em.dimensions,
          });
        } else {
          handleEmbeddingModelUpdate({ ...em, status: 'error', errorMessage: result.error });
        }
      } catch (err: unknown) {
        handleEmbeddingModelUpdate({ ...em, status: 'error', errorMessage: err instanceof Error ? err.message : '连接失败' });
      }
      return;
    }

    // Provider / Custom mode: test via fetch (remote API)
    let baseUrl: string, endpoint: string, apiKey: string;
    if (em.source === 'provider') {
      const provider = providers.find(p => p.id === em.providerId);
      if (!provider) return;
      baseUrl = provider.baseUrl;
      endpoint = provider.embeddingEndpoint || '';
      apiKey = provider.apiKey;
    } else {
      baseUrl = em.customBaseUrl || '';
      endpoint = em.customEmbeddingEndpoint || '';
      apiKey = em.customApiKey || '';
    }

    if (!baseUrl && !endpoint) return;

    try {
      const resolvedEndpoint = resolveEmbeddingEndpoint(baseUrl, endpoint);
      const res = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: em.model, input: 'test' }),
      });

      if (res.ok) {
        handleEmbeddingModelUpdate({ ...em, status: 'success', errorMessage: undefined });
      } else {
        const errText = await res.text();
        handleEmbeddingModelUpdate({ ...em, status: 'error', errorMessage: `HTTP ${res.status}: ${errText.substring(0, 150)}` });
      }
    } catch (err: unknown) {
      handleEmbeddingModelUpdate({ ...em, status: 'error', errorMessage: err instanceof Error ? err.message : '网络错误' });
    }
  };

  const handleTestExternalService = async (serviceId: string) => {
    const svc = appSettings.externalServices.find(s => s.id === serviceId);
    if (!svc) return;

    setAppSettings(prev => ({
      ...prev,
      externalServices: prev.externalServices.map(s =>
        s.id === serviceId ? { ...s, status: 'testing' as ServiceStatus, errorMessage: undefined } : s
      ),
    }));

    try {
      const url = svc.config.url || svc.config.webhookUrl || svc.config.baseUrl || svc.config.host;
      if (!url) {
        setAppSettings(prev => ({
          ...prev,
          externalServices: prev.externalServices.map(s =>
            s.id === serviceId ? { ...s, status: 'error' as ServiceStatus, errorMessage: '未配置 URL 或主机地址' } : s
          ),
        }));
        return;
      }

      const testUrl = svc.type === 'smtp' ? `${svc.config.host}:${svc.config.port || '465'}` : url;
      const res = await fetch(testUrl.startsWith('http') ? testUrl : `https://${testUrl}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);

      setAppSettings(prev => ({
        ...prev,
        externalServices: prev.externalServices.map(s =>
          s.id === serviceId
            ? { ...s, status: (res?.ok ? 'success' : 'error') as ServiceStatus, errorMessage: res?.ok ? undefined : `连接失败 (${res?.status || 'timeout'})` }
            : s
        ),
      }));
    } catch {
      setAppSettings(prev => ({
        ...prev,
        externalServices: prev.externalServices.map(s =>
          s.id === serviceId ? { ...s, status: 'error' as ServiceStatus, errorMessage: '网络错误' } : s
        ),
      }));
    }
  };

  const handleAddCustomProvider = () => {
    setEditingProvider(null);
    setShowProviderDialog(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider(provider);
    setShowProviderDialog(true);
  };

  const handleProviderSave = (provider: Provider) => {
    const existingIndex = providers.findIndex(p => p.id === provider.id);
    if (existingIndex >= 0) {
      setProviders(prev => prev.map((p, i) => i === existingIndex ? provider : p));
    } else {
      setProviders(prev => [...prev, provider]);
    }
    saveProvidersToStore([...providers.filter(p => p.id !== provider.id), provider]);
  };

  const handleDeleteProvider = (id: string) => {
    if (!id.startsWith('custom_')) return;
    const newProviders = providers.filter(p => p.id !== id);
    setProviders(newProviders);
    if (activeProviderId === id) {
      setActiveProviderId(newProviders[0]?.id || '');
    }
    saveProvidersToStore(newProviders);
  };

  const handleAppChange = (appId: AppId) => {
    setActiveAppId(appId);
    const agent = agents.find(a => a.appId === appId);
    if (agent) {
      setActiveProviderId(agent.providerId);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 p-6">
      <div className="w-full max-w-4xl h-full max-h-[680px] rounded-2xl shadow-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="h-12 border-b border-[var(--panel-border)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-[var(--text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--text-primary)]">API 管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                isSaving
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--panel-border)]'
              }`}
            >
              {isSaving ? '✓ 已保存' : '保存'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--panel-border)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* App Switcher */}
        <AppSwitcher
          activeAppId={activeAppId}
          agents={agents}
          providers={providers}
          onAppChange={handleAppChange}
        />

        {/* Tabs */}
        <div className="flex border-b border-[var(--panel-border)] shrink-0">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === 'agents'
                ? 'text-[var(--text-primary)] border-[var(--accent)] bg-[var(--surface-muted)]'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            <Bot size={14} />
            {activeAppId === 'easyterminal' ? '应用配置' : 'Agent 配置'}
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === 'providers'
                ? 'text-[var(--text-primary)] border-[var(--accent)] bg-[var(--surface-muted)]'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            <Server size={14} />
            模型供应商
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'agents' ? (
            activeAppId === 'easyterminal' ? (
              /* EasyTerminal Settings Panel */
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-lg mx-auto">
                  {/* EasyTerminal Header Card */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--panel-border)] mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--panel-bg)] flex items-center justify-center overflow-hidden">
                      <img src="/icon.png" alt="EasyTerminal" className="w-10 h-10 rounded-lg" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-[var(--text-primary)]">EasyTerminal</h3>
                      <p className="text-xs text-[var(--text-secondary)]">EasyTerminal 自身的 API 配置</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <ReasoningModelSection
                      config={appSettings.reasoningModel}
                      providers={providers}
                      onUpdate={handleReasoningModelUpdate}
                      onTest={handleTestReasoningModel}
                    />
                    <EmbeddingModelSection
                      config={appSettings.embeddingModel}
                      providers={providers}
                      onUpdate={handleEmbeddingModelUpdate}
                      onTest={handleTestEmbeddingModel}
                    />
                    <ExternalServicesSection
                      services={appSettings.externalServices}
                      onUpdate={handleExternalServicesUpdate}
                      onTest={handleTestExternalService}
                    />
                  </div>
                </div>
              </div>
            ) : (
            /* Agent Apps Panel */
            <div className="flex-1 overflow-y-auto p-6">
              {activeAgent ? (
                <div className="max-w-lg mx-auto">
                  {/* Agent Header Card */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--panel-border)] mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[var(--panel-bg)] flex items-center justify-center">
                      <ProviderIcon name={activeAgent.icon} size={32} />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-[var(--text-primary)]">{activeAgent.name}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{activeAgent.description}</p>
                    </div>
                    <div className={`ml-auto w-2 h-2 rounded-full ${getStatusColor(activeProvider?.status || 'unknown')}`} />
                  </div>

                  <div className="space-y-5">
                    {/* Provider Selection */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                        <Zap size={12} className="text-yellow-400/70" />
                        选择模型
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setProviderDropdownOpen(providerDropdownOpen === activeAgent.id ? null : activeAgent.id)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ProviderIcon name={activeAgent.providerId} size={24} />
                            <span>{providers.find(p => p.id === activeAgent.providerId)?.name || '选择厂商'}</span>
                          </div>
                          <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${providerDropdownOpen === activeAgent.id ? 'rotate-180' : ''}`} />
                        </button>

                        {providerDropdownOpen === activeAgent.id && (
                          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-xl overflow-hidden">
                            {providers.map(p => (
                              <button
                                key={p.id}
                                onClick={() => handleAgentProviderChange(activeAgent.id, p.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-muted)] transition-colors ${
                                  activeAgent.providerId === p.id ? 'bg-[var(--surface-muted)]' : ''
                                }`}
                              >
                                <ProviderIcon name={p.icon} size={24} />
                                <div className="text-left flex-1">
                                  <div className="text-sm text-[var(--text-primary)]">{p.name}</div>
                                  <div className="text-[10px] text-[var(--text-secondary)]">{p.description}</div>
                                </div>
                                {activeAgent.providerId === p.id && (
                                  <Check size={14} className="text-green-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                        模型
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setProviderDropdownOpen(providerDropdownOpen === 'model' ? null : 'model')}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors"
                        >
                          <span>{activeAgent.models || '选择模型'}</span>
                          <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${providerDropdownOpen === 'model' ? 'rotate-180' : ''}`} />
                        </button>

                        {providerDropdownOpen === 'model' && (
                          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                            {providers.find(p => p.id === activeAgent.providerId)?.models.split(',').map(model => (
                              <button
                                key={model.trim()}
                                onClick={() => {
                                  handleAgentUpdate(activeAgent.id, 'models', model.trim());
                                  setProviderDropdownOpen(null);
                                }}
                                className={`w-full flex items-center px-4 py-3 hover:bg-[var(--surface-muted)] transition-colors ${
                                  activeAgent.models === model.trim() ? 'bg-[var(--surface-muted)]' : ''
                                }`}
                              >
                                <span className={`text-sm ${activeAgent.models === model.trim() ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{model.trim()}</span>
                                {activeAgent.models === model.trim() && (
                                  <Check size={14} className="ml-auto text-green-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Provider Status Card */}
                    {activeProvider && (
                      <div className="p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--panel-border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <ProviderIcon name={activeProvider.icon} size={18} />
                          <span className="text-sm font-medium text-[var(--text-primary)]">{activeProvider.name}</span>
                          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${
                            activeProvider.status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : activeProvider.status === 'error'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {activeProvider.status === 'success'
                              ? CONNECTION_STATUS_LABELS.success
                              : activeProvider.status === 'error'
                                ? CONNECTION_STATUS_LABELS.error
                                : CONNECTION_STATUS_LABELS.unknown}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          API 配置在「模型供应商」标签页中管理
                        </p>
                      </div>
                    )}

                    {/* Proxy Toggle */}
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                        代理接管
                      </label>
                      <ProxyToggle
                        appId={activeAppId}
                        appName={activeAgent.name}
                        providerConfigured={!!activeProvider?.apiKey}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                  <p>选择一个 App 进行配置</p>
                </div>
              )}
            </div>
            )
          ) : (
            /* Providers Panel */
            <div className="flex-1 flex overflow-hidden">
              {/* Provider List */}
              <div className="w-72 border-r border-[var(--panel-border)] bg-[var(--surface-muted)]">
                <ProviderList
                  providers={providers}
                  activeProviderId={activeProviderId}
                  onProviderSelect={setActiveProviderId}
                  onProviderTest={handleTestProvider}
                  onProviderDelete={handleDeleteProvider}
                  onAddProvider={handleAddCustomProvider}
                />
              </div>

              {/* Provider Edit */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedProvider ? (
                  <div className="max-w-lg mx-auto">
                    {/* Provider Header */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-muted)] border border-[var(--panel-border)] mb-6">
                      <div className="w-14 h-14 rounded-xl bg-[var(--panel-bg)] flex items-center justify-center">
                        <ProviderIcon name={selectedProvider.icon} size={40} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-[var(--text-primary)]">{selectedProvider.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">{selectedProvider.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditProvider(selectedProvider)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--panel-border)] transition-all"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleTestProvider(selectedProvider.id)}
                          disabled={!selectedProvider.apiKey || selectedProvider.status === 'testing'}
                          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                            !selectedProvider.apiKey
                              ? 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
                              : selectedProvider.status === 'testing'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : selectedProvider.status === 'success'
                                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                  : selectedProvider.status === 'error'
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--panel-border)]'
                          }`}
                        >
                          {selectedProvider.status === 'testing' ? (
                            <><RefreshCw size={12} className="animate-spin" /> {CONNECTION_TEST_BUTTON_LABELS.testing}</>
                          ) : selectedProvider.status === 'success' ? (
                            <><Check size={12} /> {CONNECTION_TEST_BUTTON_LABELS.success}</>
                          ) : selectedProvider.status === 'error' ? (
                            <><X size={12} /> {CONNECTION_TEST_BUTTON_LABELS.error}</>
                          ) : (
                            <><RefreshCw size={12} /> {CONNECTION_TEST_BUTTON_LABELS.unknown}</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {selectedProvider.errorMessage && (
                      <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {selectedProvider.errorMessage}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                          API 地址
                        </label>
                        <input
                          type="text"
                          value={selectedProvider.baseUrl}
                          onChange={(e) => handleProviderUpdate(selectedProvider.id, 'baseUrl', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                          <KeyRound size={12} />
                          API Key
                        </label>
                        <input
                          type="password"
                          value={selectedProvider.apiKey}
                          onChange={(e) => handleProviderUpdate(selectedProvider.id, 'apiKey', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
                          placeholder="sk-..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                          模型列表
                        </label>
                        <input
                          type="text"
                          value={selectedProvider.models}
                          onChange={(e) => handleProviderUpdate(selectedProvider.id, 'models', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--text-primary)] text-sm font-mono focus:border-[var(--accent)]/50 focus:outline-none transition-colors"
                        />
                        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                          多个模型用逗号分隔
                        </p>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                    <p>选择一个供应商进行编辑</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provider Edit Dialog */}
      <ProviderEditDialog
        provider={editingProvider}
        isOpen={showProviderDialog}
        onClose={() => setShowProviderDialog(false)}
        onSave={handleProviderSave}
        onTest={handleTestProviderDraft}
      />
    </div>
  );
}
