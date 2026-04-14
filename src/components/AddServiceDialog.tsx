import { useState, useEffect } from 'react';
import { X, Cloud, MessageSquare, Link, Mail, Puzzle } from 'lucide-react';
import { type ExternalServiceConfig, type ExternalServiceType, EXTERNAL_SERVICE_TYPES } from '../types/app-settings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (service: ExternalServiceConfig) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Cloud: <Cloud size={28} />,
  MessageSquare: <MessageSquare size={28} />,
  Link: <Link size={28} />,
  Mail: <Mail size={28} />,
  Puzzle: <Puzzle size={28} />,
};

export function AddServiceDialog({ isOpen, onClose, onAdd }: Props) {
  const [step, setStep] = useState<'type' | 'fields'>('type');
  const [selectedType, setSelectedType] = useState<ExternalServiceType | null>(null);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setStep('type');
      setSelectedType(null);
      setName('');
      setFields({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const typeMeta = EXTERNAL_SERVICE_TYPES.find(t => t.id === selectedType);

  const handleTypeSelect = (type: ExternalServiceType) => {
    setSelectedType(type);
    const meta = EXTERNAL_SERVICE_TYPES.find(t => t.id === type);
    setName(meta?.name || '');
    setFields({});
    setStep('fields');
  };

  const handleFieldChange = (key: string, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleAdd = () => {
    if (!selectedType) return;
    onAdd({
      id: `svc_${Date.now()}`,
      type: selectedType,
      name: name || EXTERNAL_SERVICE_TYPES.find(t => t.id === selectedType)?.name || '未命名',
      enabled: true,
      config: fields,
      status: 'unknown',
    });
    onClose();
  };

  const canAdd = selectedType && name.trim();

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl border border-white/10 bg-[var(--bg-base)]/95 overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-black/30">
          <h3 className="text-sm font-medium text-white">
            {step === 'type' ? '选择服务类型' : '配置服务'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {step === 'type' ? (
            /* Type Grid */
            <div className="grid grid-cols-2 gap-3">
              {EXTERNAL_SERVICE_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTypeSelect(t.id)}
                  className={`p-4 rounded-xl border transition-all text-left hover:bg-white/5 ${
                    selectedType === t.id
                      ? 'bg-white/10 border-white/20'
                      : 'bg-black/30 border-white/5'
                  }`}
                >
                  <div className="text-white/70 mb-2">{ICON_MAP[t.icon]}</div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-[10px] text-white/40 mt-1">{t.description}</div>
                </button>
              ))}
            </div>
          ) : (
            /* Dynamic Fields */
            typeMeta && (
              <div className="space-y-4">
                {/* Back to type selection */}
                <button
                  onClick={() => setStep('type')}
                  className="text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  ← 返回选择类型
                </button>

                {/* Selected Type Badge */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white/70">{ICON_MAP[typeMeta.icon]}</div>
                  <span className="text-sm text-white">{typeMeta.name}</span>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">服务名称</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:border-white/30 focus:outline-none transition-colors"
                    placeholder="我的服务"
                  />
                </div>

                {/* Dynamic Fields */}
                {typeMeta.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">{f.label}</label>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      value={fields[f.key] || ''}
                      onChange={e => handleFieldChange(f.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono focus:border-white/30 focus:outline-none transition-colors"
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {step === 'fields' && (
          <div className="h-14 border-t border-white/10 flex items-center justify-end gap-2 px-4 bg-black/30">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !canAdd
                  ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              添加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
