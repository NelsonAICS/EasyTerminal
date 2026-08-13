import { useState, useEffect, useCallback } from 'react';
import { Database, FileText, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import { type KnowledgeDoc, type RetrievalResult } from '../types/agent-extension';
import {
  UIBadge,
  UIButton,
  UIEmptyState,
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

export function KnowledgePanel() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RetrievalResult[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!ipcRenderer) return;
    const data = await ipcRenderer.invoke('kb:list', activeCollection || undefined);
    setDocs(data || []);
    const cols = await ipcRenderer.invoke('kb:collections');
    setCollections(cols || []);
  }, [activeCollection]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const handleSearch = async () => {
    if (!ipcRenderer || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await ipcRenderer.invoke('kb:retrieve', searchQuery, 5, activeCollection || undefined);
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleUpload = async () => {
    if (!ipcRenderer) return;
    const result = await ipcRenderer.invoke('dialog:open-file');
    if (!result) return;
    setUploading(true);
    try {
      await ipcRenderer.invoke('kb:add-document', result, activeCollection || 'default');
      void loadDocs();
    } catch (err: unknown) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('kb:delete', id);
    if (selectedDoc?.id === id) setSelectedDoc(null);
    void loadDocs();
  };

  return (
    <UIMasterDetailShell>
      <UIMasterDetailSidebar widthClass="w-[22rem]">
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">Knowledge Base</div>
              <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">文档与检索</div>
            </div>
            <UIBadge className="px-2.5 py-1 text-[10px]">{docs.length} 份文档</UIBadge>
          </div>

          <div className="relative mt-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <UIInput
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && void handleSearch()}
              placeholder="检索知识库内容"
              className="h-10 pl-9 text-xs"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCollection(null)}
              className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                !activeCollection
                  ? 'bg-emerald-500/18 text-emerald-50'
                  : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              全部
            </button>
            {collections.map(collection => (
              <button
                key={collection}
                type="button"
                onClick={() => setActiveCollection(collection)}
                className={`rounded-full px-3 py-1 text-[10px] transition-colors ${
                  activeCollection === collection
                    ? 'bg-emerald-500/18 text-emerald-50'
                    : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {collection}
              </button>
            ))}
          </div>
        </UIPaneHeader>

        {searchResults.length > 0 && (
          <div className="border-b border-[var(--panel-border)] bg-emerald-500/5 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-medium text-emerald-200">命中 {searchResults.length} 条检索结果</div>
              <button
                type="button"
                onClick={() => setSearchResults([])}
                className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-white/8 hover:text-[var(--text-primary)]"
              >
                <X size={13} />
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {searchResults.map((result, index) => (
                <UIInfoCard key={`${result.doc?.filename || 'result'}-${index}`} className="p-3">
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <FileText size={12} className="text-emerald-300" />
                    <span className="truncate">{result.doc?.filename}</span>
                    <span className="ml-auto text-[10px] text-emerald-200">{(result.score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 line-clamp-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                    {result.chunk.content.substring(0, 140)}
                  </div>
                </UIInfoCard>
              ))}
            </div>
          </div>
        )}

        <UIPaneBody className="space-y-2 px-3 py-3">
          {docs.length > 0 ? (
            docs.map(doc => (
              <UICatalogItem
                key={doc.id}
                heading={doc.filename}
                selected={selectedDoc?.id === doc.id}
                onClick={() => setSelectedDoc(doc)}
                leading={<FileText size={16} className="text-emerald-300" />}
                description={`${doc.file_type} · ${doc.chunk_count} chunks · ${doc.collection}`}
                meta={
                  <>
                    <span>{doc.collection}</span>
                    <span>{doc.chunk_count} chunks</span>
                  </>
                }
              />
            ))
          ) : (
            <UIEmptyState
              icon={<Database size={22} />}
              title="知识库还是空的"
              description="支持 Markdown、代码和纯文本。导入一些项目资料后，检索和 Agent 上下文会明显更稳。"
            />
          )}
        </UIPaneBody>

        <UIPaneFooter>
          <UIButton onClick={() => void handleUpload()} tone="primary" className="w-full justify-center" disabled={uploading}>
            {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '上传解析中...' : '上传文档'}
          </UIButton>
        </UIPaneFooter>
      </UIMasterDetailSidebar>

      <UIMasterDetailContent>
        <UIPaneHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                {selectedDoc ? 'Document Detail' : 'Knowledge Workspace'}
              </div>
              <div className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                {selectedDoc ? selectedDoc.filename : '文档详情面板'}
              </div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {selectedDoc
                  ? '查看文档类型、分块数量和导入时间，必要时可以直接删除。'
                  : '从左侧浏览文档资产或先导入项目资料，再配合上方搜索做快速检索。'}
              </div>
            </div>
            {selectedDoc && (
              <UIInlineAction onClick={() => void handleDelete(selectedDoc.id)} tone="danger">
                <Trash2 size={13} />
                删除文档
              </UIInlineAction>
            )}
          </div>
        </UIPaneHeader>

        <UIPaneBody className="px-6 py-6">
          {selectedDoc ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex flex-wrap gap-2">
                <UIBadge className="px-2.5 py-1 text-[10px]">{selectedDoc.file_type}</UIBadge>
                <UIBadge className="px-2.5 py-1 text-[10px] bg-emerald-500/12 text-emerald-100 border-emerald-400/14">
                  {selectedDoc.collection}
                </UIBadge>
                <UIBadge className="px-2.5 py-1 text-[10px]">{selectedDoc.chunk_count} chunks</UIBadge>
              </div>

              <UIInfoCard className="space-y-3">
                <div className="text-sm font-medium text-[var(--text-primary)]">文档概况</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-[var(--panel-border)] bg-black/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">文件名</div>
                    <div className="mt-2 text-sm text-[var(--text-primary)] break-all">{selectedDoc.filename}</div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--panel-border)] bg-black/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">导入时间</div>
                    <div className="mt-2 text-sm text-[var(--text-primary)]">{selectedDoc.created_at}</div>
                  </div>
                </div>
              </UIInfoCard>
            </div>
          ) : (
            <UIEmptyState
              icon={<Database size={22} />}
              title="选择一份文档查看详情"
              description="导入知识库后，系统能为 Agent 提供更稳定的背景资料和检索结果。"
            />
          )}
        </UIPaneBody>
      </UIMasterDetailContent>
    </UIMasterDetailShell>
  );
}
