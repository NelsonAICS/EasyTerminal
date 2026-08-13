import { useState, useEffect, useCallback } from 'react';
import { Box, RefreshCw, Search, ToggleLeft, ToggleRight, Trash2, Zap } from 'lucide-react';
import { type Skill } from '../types/agent-extension';
import {
  UIBadge,
  UIButton,
  UIEmptyState,
  UIFieldLabel,
  UIInfoCard,
  UIInput,
  UIInlineAction,
  UIMasterDetailContent,
  UIMasterDetailShell,
  UIMasterDetailSidebar,
  UIPaneBody,
  UIPaneFooter,
  UIPaneHeader,
  UICatalogItem,
} from './ui';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

export function SkillPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ skill: Skill; score: number }>>([]);
  const [reindexing, setReindexing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const selected = skills.find(skill => skill.id === selectedId) || null;

  const loadSkills = useCallback(async () => {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('skill:list', activeCategory || undefined);
    setSkills(data || []);
    const cats = await ipcRenderer.invoke('skill:categories');
    setCategories(cats || []);
  }, [activeCategory]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const handleSearch = async () => {
    if (!ipcRenderer || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
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
      void loadSkills();
    } finally {
      setReindexing(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('skill:toggle', id, !enabled);
    void loadSkills();
  };

  const handleDelete = async (id: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('skill:delete', id);
    if (selectedId === id) setSelectedId(null);
    void loadSkills();
  };

  const displayList = searchResults.length > 0 ? searchResults.map(result => result.skill) : skills;

  return (
    <UIMasterDetailShell>
      <UIMasterDetailSidebar widthClass="w-[22rem]">
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Skill Hub</div>
              <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">能力目录</div>
            </div>
            <UIBadge className="px-2.5 py-1 text-[10px]">{displayList.length} 项</UIBadge>
          </div>

          <div className="relative mt-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <UIInput
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && void handleSearch()}
              placeholder="语义搜索 Skill"
              className="h-10 pl-9 text-xs"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                !activeCategory
                  ? 'bg-cyan-500/18 text-cyan-100'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              全部
            </button>
            {categories.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                  activeCategory === category
                    ? 'bg-cyan-500/18 text-cyan-100'
                    : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </UIPaneHeader>

        <UIPaneBody className="space-y-2 px-3 py-3">
          {displayList.length > 0 ? (
            displayList.map(skill => (
              <UICatalogItem
                key={skill.id}
                heading={skill.name}
                description={skill.description}
                selected={selectedId === skill.id}
                disabled={!skill.enabled}
                onClick={() => {
                  setSelectedId(skill.id);
                  setSearchResults([]);
                }}
                leading={<Box size={16} className="text-cyan-300" />}
                trailing={
                  !skill.enabled ? (
                    <span className="text-[10px] text-[var(--text-secondary)]">已禁用</span>
                  ) : undefined
                }
                meta={<span>{skill.category}</span>}
              />
            ))
          ) : (
            <UIEmptyState
              icon={<Box size={22} />}
              title="没有可显示的 Skill"
              description="可以先重建索引，或者把新的 Skill 放到技能目录后再回来刷新。"
            />
          )}
        </UIPaneBody>

        <UIPaneFooter>
          <UIButton onClick={() => void handleReindex()} tone="primary" className="w-full justify-center" disabled={reindexing}>
            <RefreshCw size={15} className={reindexing ? 'animate-spin' : ''} />
            {reindexing ? '重建索引中...' : '重建索引'}
          </UIButton>
        </UIPaneFooter>
      </UIMasterDetailSidebar>

      <UIMasterDetailContent>
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                {selected ? 'Skill Detail' : 'Overview'}
              </div>
              <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {selected ? selected.name : '技能详情面板'}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {selected
                  ? '查看描述、分类、Schema 和启停状态，确保技能能力边界清晰。'
                  : '左侧是按语义和分类组织的 Skill 列表，选中后在这里查看细节。'}
              </div>
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <UIInlineAction onClick={() => void handleToggle(selected.id, !!selected.enabled)} tone="neutral">
                  {selected.enabled ? <ToggleRight size={15} className="text-emerald-300" /> : <ToggleLeft size={15} />}
                  {selected.enabled ? '已启用' : '已禁用'}
                </UIInlineAction>
                <UIInlineAction onClick={() => void handleDelete(selected.id)} tone="danger">
                  <Trash2 size={13} />
                  删除
                </UIInlineAction>
              </div>
            )}
          </div>
        </UIPaneHeader>

        <UIPaneBody className="px-6 py-6">
          {selected ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex flex-wrap gap-2">
                <UIBadge className="px-2.5 py-1 text-[10px]">{selected.category}</UIBadge>
                <UIBadge tone={selected.enabled ? 'success' : 'danger'} className="px-2.5 py-1 text-[10px]">
                  {selected.enabled ? 'Enabled' : 'Disabled'}
                </UIBadge>
                {selected.tags.map(tag => (
                  <UIBadge key={tag} className="px-2.5 py-1 text-[10px] bg-cyan-500/12 text-cyan-100 border-cyan-400/14">
                    {tag}
                  </UIBadge>
                ))}
              </div>

              {selected.description && (
                <UIInfoCard>
                  <div className="text-sm font-medium text-[var(--text-primary)]">能力说明</div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{selected.description}</p>
                </UIInfoCard>
              )}

              <UIInfoCard>
                <UIFieldLabel className="mb-3 flex items-center gap-2">
                  <Zap size={12} />
                  输入 Schema
                </UIFieldLabel>
                {Object.keys(selected.input_schema).length > 0 ? (
                  <pre className="overflow-x-auto rounded-[1.25rem] border border-[var(--panel-border)] bg-black/20 p-5 text-xs leading-6 text-[var(--text-primary)]">
                    {JSON.stringify(selected.input_schema, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-[var(--text-secondary)]">当前 Skill 没有定义输入 Schema。</div>
                )}
              </UIInfoCard>
            </div>
          ) : (
            <UIEmptyState
              icon={<Box size={22} />}
              title="选择一个 Skill 查看详情"
              description="建议优先关注启用状态、用途说明和输入 Schema，避免使用时边界不清。"
            />
          )}
        </UIPaneBody>
      </UIMasterDetailContent>
    </UIMasterDetailShell>
  );
}
