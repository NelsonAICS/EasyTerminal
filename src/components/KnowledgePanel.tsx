// KnowledgePanel — Knowledge base management: upload, browse, search

import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, FileText, Trash2, Database, X, RefreshCw } from 'lucide-react';
import { type KnowledgeDoc, type RetrievalResult } from '../types/agent-extension';

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

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleSearch = async () => {
    if (!ipcRenderer || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const results = await ipcRenderer.invoke('kb:retrieve', searchQuery, 5, activeCollection || undefined);
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleUpload = async () => {
    if (!ipcRenderer) return;
    // Open file dialog via the renderer's dialog capability
    const result = await ipcRenderer.invoke('dialog:open-file');
    if (!result) return;
    setUploading(true);
    try {
      await ipcRenderer.invoke('kb:add-document', result, activeCollection || 'default');
      loadDocs();
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
    loadDocs();
  };

  return (
    <div className="flex h-full">
      {/* Left: Document List */}
      <div className="w-72 border-r border-white/10 flex flex-col bg-black/20 shrink-0">
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="语义检索知识库..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-white/20 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCollection(null)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${!activeCollection ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >全部</button>
            {collections.map(c => (
              <button
                key={c}
                onClick={() => setActiveCollection(c)}
                className={`text-[10px] px-2 py-0.5 rounded-full ${activeCollection === c ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border-b border-white/10">
            <div className="px-3 py-1.5 flex items-center justify-between bg-green-500/5">
              <span className="text-[10px] text-green-400 font-medium">检索结果</span>
              <button onClick={() => setSearchResults([])} className="text-white/30 hover:text-white">
                <X size={12} />
              </button>
            </div>
            {searchResults.map((r, i) => (
              <div key={i} className="px-3 py-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <FileText size={11} className="text-green-400/60 shrink-0" />
                  <span className="text-[10px] text-white/60 truncate">{r.doc?.filename}</span>
                  <span className="text-[9px] text-white/30 ml-auto">{(r.score * 100).toFixed(0)}%</span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{r.chunk.content.substring(0, 100)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto">
          {docs.map(d => (
            <div
              key={d.id}
              onClick={() => setSelectedDoc(d)}
              className={`px-3 py-2.5 cursor-pointer border-b border-white/5 transition-colors ${
                selectedDoc?.id === d.id ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-green-400/70 shrink-0" />
                <span className="text-xs text-white truncate flex-1">{d.filename}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-white/40">{d.chunk_count} chunks</span>
                <span className="text-[10px] text-white/30">{d.file_type}</span>
                <span className="text-[10px] text-white/30">{d.collection}</span>
              </div>
            </div>
          ))}
          {docs.length === 0 && searchResults.length === 0 && (
            <div className="p-4 text-center text-white/30 text-xs">
              <Database size={20} className="mx-auto mb-2 opacity-40" />
              知识库为空
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? '上传解析中...' : '上传文档'}
          </button>
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedDoc ? (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <FileText size={20} className="text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">{selectedDoc.filename}</h3>
                <p className="text-xs text-white/40">
                  {selectedDoc.file_type} · {selectedDoc.chunk_count} chunks · {selectedDoc.collection}
                </p>
              </div>
              <button onClick={() => handleDelete(selectedDoc.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="text-[10px] text-white/30">
              添加于 {selectedDoc.created_at}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
            <Database size={32} />
            <p className="text-xs">选择文档查看详情，或上传新文档</p>
            <p className="text-[10px] text-white/20">支持 Markdown、代码、纯文本文件</p>
          </div>
        )}
      </div>
    </div>
  );
}
