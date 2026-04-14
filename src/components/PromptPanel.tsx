// PromptPanel — Prompt template management with CRUD, variable extraction, and LLM optimization

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, Search, Sparkles, Variable, Save, FileText } from 'lucide-react';
import { type Prompt } from '../types/agent-extension';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const CATEGORIES = ['general', 'coding', 'writing', 'review', 'custom'];

export function PromptPanel() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', tags: '' });
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState<string | null>(null);

  const selected = prompts.find(p => p.id === selectedId);

  const loadPrompts = useCallback(async () => {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('prompt:list');
    setPrompts(data || []);
  }, []);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

  const handleSearch = async () => {
    if (!ipcRenderer) return;
    if (!searchQuery.trim()) { loadPrompts(); return; }
    const data = await ipcRenderer.invoke('prompt:search', searchQuery);
    setPrompts(data || []);
  };

  const handleCreate = async () => {
    if (!ipcRenderer || !form.title.trim()) return;
    await ipcRenderer.invoke('prompt:create', {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditing(null);
    setForm({ title: '', content: '', category: 'general', tags: '' });
    loadPrompts();
  };

  const handleUpdate = async () => {
    if (!ipcRenderer || !selectedId) return;
    await ipcRenderer.invoke('prompt:update', selectedId, {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setEditing(null);
    loadPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('prompt:delete', id);
    if (selectedId === id) setSelectedId(null);
    loadPrompts();
  };

  const handleOptimize = async () => {
    if (!ipcRenderer || !form.content.trim()) return;
    setOptimizing(true);
    try {
      const result = await ipcRenderer.invoke('prompt:optimize', form.content);
      setOptimizedContent(result);
    } catch {
      setOptimizedContent(null);
    } finally {
      setOptimizing(false);
    }
  };

  const startEdit = (prompt: Prompt) => {
    setForm({
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags.join(', '),
    });
    setEditing('edit');
  };

  const startCreate = () => {
    setForm({ title: '', content: '', category: 'general', tags: '' });
    setEditing('create');
  };

  const extractVars = (content: string): string[] => {
    const matches = content.matchAll(/\{\{(\w+)\}\}/g);
    return [...new Set(Array.from(matches, m => m[1]))];
  };

  return (
    <div className="flex h-full">
      {/* Left: Prompt List */}
      <div className="w-64 border-r border-white/10 flex flex-col bg-black/20 shrink-0">
        <div className="p-3 border-b border-white/10">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索 Prompt..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-white/20 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {prompts.map(p => (
            <div
              key={p.id}
              onClick={() => { setSelectedId(p.id); setEditing(null); setOptimizedContent(null); }}
              className={`px-3 py-2.5 cursor-pointer border-b border-white/5 transition-colors ${
                selectedId === p.id ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-blue-400/70 shrink-0" />
                <span className="text-xs text-white truncate flex-1">{p.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-white/30 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{p.category}</span>
                {p.variables.length > 0 && (
                  <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                    <Variable size={9} /> {p.variables.length}
                  </span>
                )}
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <div className="p-4 text-center text-white/30 text-xs">暂无 Prompt</div>
          )}
        </div>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={startCreate}
            className="w-full py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> 新建 Prompt
          </button>
        </div>
      </div>

      {/* Right: Detail / Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        {editing ? (
          /* Create / Edit Form */
          <div className="max-w-lg mx-auto space-y-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              {editing === 'create' ? <Plus size={16} /> : <Edit3 size={16} />}
              {editing === 'create' ? '新建 Prompt' : '编辑 Prompt'}
            </h3>
            <div>
              <label className="block text-xs text-white/60 mb-1">标题</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-white/20 focus:outline-none"
                placeholder="Prompt 标题"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">内容</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm font-mono focus:border-white/20 focus:outline-none resize-y"
                placeholder="Prompt 内容，使用 {{variable}} 定义变量"
              />
              {form.content && extractVars(form.content).length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {extractVars(form.content).map(v => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 flex items-center gap-0.5">
                      <Variable size={9} /> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-white/60 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-white/20 focus:outline-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-white/60 mb-1">标签 (逗号分隔)</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-white/20 focus:outline-none"
                  placeholder="coding, review"
                />
              </div>
            </div>

            {/* Optimize section */}
            {form.content && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/60 flex items-center gap-1"><Sparkles size={12} className="text-purple-400" /> AI 优化</span>
                  <button
                    onClick={handleOptimize}
                    disabled={optimizing}
                    className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {optimizing ? '优化中...' : '优化 Prompt'}
                  </button>
                </div>
                {optimizedContent && (
                  <div className="space-y-2">
                    <pre className="text-xs text-white/70 whitespace-pre-wrap bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">{optimizedContent}</pre>
                    <button
                      onClick={() => { setForm(f => ({ ...f, content: optimizedContent })); setOptimizedContent(null); }}
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      使用优化后的内容
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={editing === 'create' ? handleCreate : handleUpdate} className="flex-1 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 flex items-center justify-center gap-1.5">
                <Save size={14} /> {editing === 'create' ? '创建' : '保存'}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/15">
                取消
              </button>
            </div>
          </div>
        ) : selected ? (
          /* Detail View */
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-medium text-white flex-1">{selected.title}</h3>
              <button onClick={() => startEdit(selected)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(selected.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{selected.category}</span>
              {selected.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60">{t}</span>)}
            </div>
            <pre className="text-xs text-white/80 whitespace-pre-wrap bg-black/30 rounded-xl p-4 border border-white/10 max-h-96 overflow-y-auto">{selected.content}</pre>
            {selected.variables.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-white/60 mb-1.5 block">变量:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {selected.variables.map(v => (
                    <span key={v} className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center gap-1">
                      <Variable size={10} /> {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
            <FileText size={32} />
            <p className="text-xs">选择或创建一个 Prompt</p>
            <button onClick={startCreate} className="mt-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 flex items-center gap-1.5">
              <Plus size={14} /> 新建
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
