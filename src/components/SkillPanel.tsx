// SkillPanel — Skill browsing, discovery, and semantic search

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Box, Trash2, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { type Skill } from '../types/agent-extension';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

export function SkillPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ skill: Skill; score: number }>>([]);
  const [reindexing, setReindexing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const selected = skills.find(s => s.id === selectedId);

  const loadSkills = useCallback(async () => {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('skill:list', activeCategory || undefined);
    setSkills(data || []);
    const cats = await ipcRenderer.invoke('skill:categories');
    setCategories(cats || []);
  }, [activeCategory]);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const handleSearch = async () => {
    if (!ipcRenderer || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const results = await ipcRenderer.invoke('skill:search', searchQuery, 10);
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleReindex = async () => {
    if (!ipcRenderer) return;
    setReindexing(true);
    try {
      await ipcRenderer.invoke('skill:reindex');
      loadSkills();
    } finally {
      setReindexing(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('skill:toggle', id, !enabled);
    loadSkills();
  };

  const handleDelete = async (id: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('skill:delete', id);
    if (selectedId === id) setSelectedId(null);
    loadSkills();
  };

  const displayList = searchResults.length > 0
    ? searchResults.map(r => r.skill)
    : skills;

  return (
    <div className="flex h-full">
      {/* Left: Skill List */}
      <div className="w-72 border-r border-white/10 flex flex-col bg-black/20 shrink-0">
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="语义搜索 Skill..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-white/20 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${!activeCategory ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >全部</button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`text-[10px] px-2 py-0.5 rounded-full ${activeCategory === c ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {displayList.map(s => (
            <div
              key={s.id}
              onClick={() => { setSelectedId(s.id); setSearchResults([]); }}
              className={`px-3 py-2.5 cursor-pointer border-b border-white/5 transition-colors ${
                selectedId === s.id ? 'bg-white/10' : 'hover:bg-white/5'
              } ${!s.enabled ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Box size={13} className="text-cyan-400/70 shrink-0" />
                <span className="text-xs text-white truncate flex-1">{s.name}</span>
                {!s.enabled && <span className="text-[9px] text-white/30">已禁用</span>}
              </div>
              {s.description && <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{s.description}</p>}
            </div>
          ))}
          {displayList.length === 0 && (
            <div className="p-4 text-center text-white/30 text-xs">
              <Box size={20} className="mx-auto mb-2 opacity-40" />
              暂无 Skill<br />
              <span className="text-[10px]">将 Skill 放入 ~/.easyterminal/skills/ 目录</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="w-full py-2 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={14} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? '重建索引中...' : '重建索引'}
          </button>
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {selected ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Box size={20} className="text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">{selected.name}</h3>
                <p className="text-xs text-white/40">{selected.category}</p>
              </div>
              <button onClick={() => handleToggle(selected.id, !!selected.enabled)} className="text-white/50 hover:text-white">
                {selected.enabled ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
              </button>
            </div>

            {selected.description && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/70">{selected.description}</p>
              </div>
            )}

            {selected.tags.length > 0 && (
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {selected.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/60">{t}</span>
                ))}
              </div>
            )}

            {Object.keys(selected.input_schema).length > 0 && (
              <div className="mb-3">
                <label className="text-xs text-white/60 mb-1 block flex items-center gap-1"><Zap size={11} /> 输入 Schema</label>
                <pre className="text-[10px] text-white/50 bg-black/30 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selected.input_schema, null, 2)}
                </pre>
              </div>
            )}

            <button onClick={() => handleDelete(selected.id)} className="mt-4 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10">
              <Trash2 size={12} className="inline mr-1" /> 删除
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
            <Box size={32} />
            <p className="text-xs">选择一个 Skill 查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}
