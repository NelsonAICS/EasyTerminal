const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Replace Main Area opening
const oldMainStart = `{/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden p-6 z-10">`;

const newMainStart = `{/* Main Area */}
      <div className="flex-1 flex gap-4 relative overflow-hidden p-6 z-10 w-full min-w-0">
        
        {/* Left Column: Terminal & Input */}
        <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">`;

content = content.replace(oldMainStart, newMainStart);

// 2. Extract Editor and Image Overlays
const editorStart = content.indexOf('{/* Editor Overlay */}');
const terminalStart = content.indexOf('{/* Terminal Area with Header */}');

const overlaysContent = content.substring(editorStart, terminalStart);
content = content.substring(0, editorStart) + content.substring(terminalStart);

// Fix the absolute positioning in overlays to make them flex columns
let modifiedOverlays = overlaysContent
  .replace('absolute inset-4 z-30 flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200', 'flex-1 flex flex-col overflow-hidden')
  .replace('absolute inset-4 z-30 flex flex-col glass-panel rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200', 'flex-1 flex flex-col overflow-hidden');

// 3. Insert Right Column at the end of Main Area
const mainAreaEnd = content.indexOf('      {/* Right Sidebar (File Explorer) */}');
const insertPos = content.lastIndexOf('      </div>\n\n', mainAreaEnd);

const rightColumnStr = `
        </div> {/* End of Left Column */}

        {/* Right Column: Preview / Editor / Browser */}
        {(editorFile || previewImage || previewUrl) && (
          <div className="w-[45%] xl:w-[40%] shrink-0 flex flex-col glass-panel rounded-3xl overflow-hidden relative shadow-2xl min-h-0 animate-in slide-in-from-right-4 duration-300 border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl">
            ${modifiedOverlays}
            {/* Browser Preview Overlay */}
            {previewUrl ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] shrink-0">
                  <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)] overflow-hidden">
                    <Globe size={14} className="text-blue-400 shrink-0" />
                    <span className="text-[var(--text-primary)] truncate flex-1" title={previewUrl}>{previewUrl}</span>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => setPreviewUrl(null)} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                      <PanelRightClose size={14} /> Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-white relative overflow-hidden">
                  <webview src={previewUrl} className="w-full h-full border-none outline-none"></webview>
                </div>
              </div>
            ) : null}
          </div>
        )}
`;

content = content.substring(0, insertPos) + rightColumnStr + content.substring(insertPos);

fs.writeFileSync(appTsxPath, content);
console.log('App.tsx refactored successfully.');
