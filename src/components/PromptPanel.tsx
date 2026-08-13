import { useState, useEffect, useCallback } from 'react';
import { Edit3, FileText, Plus, Save, Search, Sparkles, Trash2, Variable } from 'lucide-react';
import { type Prompt } from '../types/agent-extension';
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
  UISelect,
  UITextarea,
} from './ui';

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

  const selected = prompts.find(prompt => prompt.id === selectedId) || null;

  const loadPrompts = useCallback(async () => {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('prompt:list');
    setPrompts(data || []);
  }, []);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const handleSearch = async () => {
    if (!ipcRenderer) return;
    if (!searchQuery.trim()) {
      void loadPrompts();
      return;
    }
    const data = await ipcRenderer.invoke('prompt:search', searchQuery);
    setPrompts(data || []);
  };

  const handleCreate = async () => {
    if (!ipcRenderer || !form.title.trim()) return;
    await ipcRenderer.invoke('prompt:create', {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
    setEditing(null);
    setForm({ title: '', content: '', category: 'general', tags: '' });
    void loadPrompts();
  };

  const handleUpdate = async () => {
    if (!ipcRenderer || !selectedId) return;
    await ipcRenderer.invoke('prompt:update', selectedId, {
      title: form.title,
      content: form.content,
      category: form.category,
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
    setEditing(null);
    void loadPrompts();
  };

  const handleDelete = async (id: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('prompt:delete', id);
    if (selectedId === id) setSelectedId(null);
    void loadPrompts();
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
    setOptimizedContent(null);
  };

  const startCreate = () => {
    setForm({ title: '', content: '', category: 'general', tags: '' });
    setEditing('create');
    setOptimizedContent(null);
    setSelectedId(null);
  };

  const extractVars = (content: string): string[] => {
    const matches = content.matchAll(/\{\{(\w+)\}\}/g);
    return [...new Set(Array.from(matches, match => match[1]))];
  };

  const formVariables = extractVars(form.content);

  return (
    <UIMasterDetailShell>
      <UIMasterDetailSidebar widthClass="w-[20rem]">
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Prompt Library</div>
              <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">模板与片段</div>
            </div>
            <UIBadge className="px-2.5 py-1 text-[10px]">{prompts.length} 个模板</UIBadge>
          </div>
          <div className="relative mt-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <UIInput
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && void handleSearch()}
              placeholder="搜索 Prompt、标签、用途"
              className="h-10 pl-9 text-xs"
            />
          </div>
        </UIPaneHeader>

        <UIPaneBody className="space-y-2 px-3 py-3">
          {prompts.length > 0 ? (
            prompts.map(prompt => (
              <UICatalogItem
                key={prompt.id}
                heading={prompt.title}
                description={prompt.content}
                selected={selectedId === prompt.id && !editing}
                onClick={() => {
                  setSelectedId(prompt.id);
                  setEditing(null);
                  setOptimizedContent(null);
                }}
                leading={<FileText size={16} className="text-blue-300" />}
                trailing={
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      void handleDelete(prompt.id);
                    }}
                    className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-300"
                    title="删除 Prompt"
                  >
                    <Trash2 size={13} />
                  </button>
                }
                meta={
                  <>
                    <UIBadge className="px-2 py-0.5 text-[10px]">{prompt.category}</UIBadge>
                    {prompt.variables.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Variable size={11} />
                        {prompt.variables.length} 个变量
                      </span>
                    )}
                  </>
                }
              />
            ))
          ) : (
            <UIEmptyState
              icon={<FileText size={22} />}
              title="还没有 Prompt"
              description="把常用指令、审查模板和 Agent 任务片段沉淀下来，后续复用会顺很多。"
            />
          )}
        </UIPaneBody>

        <UIPaneFooter>
          <UIButton onClick={startCreate} tone="primary" className="w-full justify-center">
            <Plus size={15} />
            新建 Prompt
          </UIButton>
        </UIPaneFooter>
      </UIMasterDetailSidebar>

      <UIMasterDetailContent>
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                {editing ? 'Editor' : selected ? 'Detail' : 'Workspace'}
              </div>
              <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {editing === 'create'
                  ? '创建新模板'
                  : editing === 'edit'
                    ? '编辑 Prompt'
                    : selected
                      ? selected.title
                      : 'Prompt 工作区'}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {editing
                  ? '统一维护标题、正文、标签和变量。优化动作会直接写回到当前草稿。'
                  : selected
                    ? '查看模板内容、变量入口和标签信息，随时切到编辑态。'
                    : '从左侧挑一个 Prompt 查看，或者新建一个常用模板。'}
              </div>
            </div>
            {selected && !editing && (
              <div className="flex items-center gap-2">
                <UIInlineAction onClick={() => startEdit(selected)} tone="neutral">
                  <Edit3 size={13} />
                  编辑
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
          {editing ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
              <UIFieldLabel htmlFor="prompt-title">标题</UIFieldLabel>
                  <UIInput
                    id="prompt-title"
                    value={form.title}
                    onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                    placeholder="例如：代码审查总结"
                  />
                </div>
                <div>
              <UIFieldLabel htmlFor="prompt-category">分类</UIFieldLabel>
                  <UISelect
                    id="prompt-category"
                    value={form.category}
                    onChange={event => setForm(current => ({ ...current, category: event.target.value }))}
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </UISelect>
                </div>
              </div>

              <div>
                <UIFieldLabel htmlFor="prompt-tags">标签</UIFieldLabel>
                <UIInput
                  id="prompt-tags"
                  value={form.tags}
                  onChange={event => setForm(current => ({ ...current, tags: event.target.value }))}
                  placeholder="coding, review, shell"
                />
              </div>

              <div>
                <UIFieldLabel htmlFor="prompt-content">内容</UIFieldLabel>
                <UITextarea
                  id="prompt-content"
                  rows={12}
                  value={form.content}
                  onChange={event => setForm(current => ({ ...current, content: event.target.value }))}
                  placeholder="使用 {{variable}} 作为变量占位符"
                  className="min-h-[16rem] font-mono text-[13px] leading-7"
                />
                {formVariables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {formVariables.map(variable => (
                      <UIBadge key={variable} className="px-2.5 py-1 text-[10px] text-cyan-200">
                        <Variable size={10} />
                        {variable}
                      </UIBadge>
                    ))}
                  </div>
                )}
              </div>

              <UIInfoCard className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">AI 优化</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      对当前草稿做结构化整理，方便形成更稳定的 Prompt 模板。
                    </div>
                  </div>
                  <UIButton onClick={() => void handleOptimize()} tone="neutral" disabled={optimizing || !form.content.trim()}>
                    <Sparkles size={14} />
                    {optimizing ? '优化中...' : '优化内容'}
                  </UIButton>
                </div>
                {optimizedContent && (
                  <div className="space-y-3">
                    <pre className="max-h-56 overflow-y-auto rounded-[1.25rem] border border-[var(--panel-border)] bg-black/20 p-4 text-xs leading-6 text-[var(--text-primary)] whitespace-pre-wrap">
                      {optimizedContent}
                    </pre>
                    <UIButton
                      tone="primary"
                      onClick={() => {
                        setForm(current => ({ ...current, content: optimizedContent }));
                        setOptimizedContent(null);
                      }}
                    >
                      使用优化后的内容
                    </UIButton>
                  </div>
                )}
              </UIInfoCard>

              <div className="flex items-center justify-end gap-3">
                <UIButton onClick={() => setEditing(null)} tone="ghost">
                  取消
                </UIButton>
                <UIButton onClick={() => void (editing === 'create' ? handleCreate() : handleUpdate())} tone="primary">
                  <Save size={14} />
                  {editing === 'create' ? '创建 Prompt' : '保存修改'}
                </UIButton>
              </div>
            </div>
          ) : selected ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex flex-wrap gap-2">
                <UIBadge className="px-2.5 py-1 text-[10px]">{selected.category}</UIBadge>
                {selected.tags.map(tag => (
                  <UIBadge key={tag} className="px-2.5 py-1 text-[10px] bg-blue-500/12 text-blue-100 border-blue-400/14">
                    {tag}
                  </UIBadge>
                ))}
              </div>

              <UIInfoCard>
                <div className="text-sm font-medium text-[var(--text-primary)]">模板内容</div>
                <pre className="mt-4 max-h-[28rem] overflow-y-auto rounded-[1.25rem] border border-[var(--panel-border)] bg-black/20 p-5 text-[13px] leading-7 text-[var(--text-primary)] whitespace-pre-wrap">
                  {selected.content}
                </pre>
              </UIInfoCard>

              <UIInfoCard>
                <div className="text-sm font-medium text-[var(--text-primary)]">变量入口</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.variables.length > 0 ? (
                    selected.variables.map(variable => (
                      <UIBadge key={variable} className="px-2.5 py-1 text-[10px] text-cyan-200">
                        <Variable size={10} />
                        {variable}
                      </UIBadge>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">当前模板没有定义变量。</span>
                  )}
                </div>
              </UIInfoCard>
            </div>
          ) : (
            <UIEmptyState
              icon={<FileText size={22} />}
              title="选择一个 Prompt 开始"
              description="左侧可以浏览模板库，也可以直接新建一个常用 Prompt。"
              action={
                <UIButton onClick={startCreate} tone="primary">
                  <Plus size={14} />
                  新建 Prompt
                </UIButton>
              }
            />
          )}
        </UIPaneBody>
      </UIMasterDetailContent>
    </UIMasterDetailShell>
  );
}
