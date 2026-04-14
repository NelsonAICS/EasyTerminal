import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Check, Cloud, MessageSquare, Link, Mail, Puzzle, ToggleLeft, ToggleRight } from 'lucide-react';
import { type ExternalServiceConfig, EXTERNAL_SERVICE_TYPES } from '../types/app-settings';
import { AddServiceDialog } from './AddServiceDialog';

interface Props {
  services: ExternalServiceConfig[];
  onUpdate: (services: ExternalServiceConfig[]) => void;
  onTest: (serviceId: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Cloud: <Cloud size={16} />,
  MessageSquare: <MessageSquare size={16} />,
  Link: <Link size={16} />,
  Mail: <Mail size={16} />,
  Puzzle: <Puzzle size={16} />,
};

export function ExternalServicesSection({ services, onUpdate, onTest }: Props) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = (service: ExternalServiceConfig) => {
    onUpdate([...services, service]);
  };

  const handleDelete = (id: string) => {
    onUpdate(services.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleToggle = (id: string) => {
    onUpdate(services.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleFieldChange = (id: string, key: string, value: string) => {
    onUpdate(services.map(s => {
      if (s.id === id) {
        return { ...s, config: { ...s.config, [key]: value }, status: 'unknown' as const };
      }
      return s;
    }));
  };

  const statusBadge = (status: string) => {
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
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${cls[status]}`}>
        {label[status]}
      </span>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Link size={16} className="text-blue-400" />
          外部服务
        </h3>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-all"
        >
          <Plus size={14} />
          添加服务
        </button>
      </div>

      {services.length === 0 ? (
        <div className="py-8 text-center text-white/30 text-xs">
          暂无外部服务，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(svc => {
            const typeMeta = EXTERNAL_SERVICE_TYPES.find(t => t.id === svc.type);
            const isExpanded = expandedId === svc.id;

            return (
              <div key={svc.id} className={`rounded-xl border transition-all ${svc.enabled ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-50'}`}>
                {/* Card Header */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : svc.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <span className="text-white/60">{typeMeta ? ICON_MAP[typeMeta.icon] : <Puzzle size={16} />}</span>
                    <span className="text-sm text-white flex-1">{svc.name}</span>
                    {statusBadge(svc.status)}
                  </button>

                  {/* Toggle */}
                  <button onClick={() => handleToggle(svc.id)} className="text-white/60 hover:text-white transition-colors">
                    {svc.enabled ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                  </button>

                  {/* Test */}
                  <button
                    onClick={() => onTest(svc.id)}
                    disabled={svc.status === 'testing'}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all disabled:opacity-40"
                    title="测试"
                  >
                    {svc.status === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(svc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded Fields */}
                {isExpanded && typeMeta && (
                  <div className="px-3 pb-3 space-y-2">
                    {svc.errorMessage && (
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                        {svc.errorMessage}
                      </div>
                    )}
                    {typeMeta.fields.map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-medium text-white/50 mb-1">{f.label}</label>
                        <input
                          type={f.secret ? 'password' : 'text'}
                          value={svc.config[f.key] || ''}
                          onChange={e => handleFieldChange(svc.id, f.key, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-white text-xs font-mono focus:border-white/20 focus:outline-none transition-colors"
                          placeholder={f.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddServiceDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
