import fs

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace Main Area opening
old_main_start = """      {/* Main Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden p-6 z-10">"""
new_main_start = """      {/* Main Area */}
      <div className="flex-1 flex gap-4 relative overflow-hidden p-6 z-10">
        
        {/* Left Column: Terminal & Input */}
        <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300">"""

content = content.replace(old_main_start, new_main_start)

# Remove the Editor Overlay and Image Preview Overlay, we'll append them to the Right Column
import re

# Find Editor Overlay block
editor_overlay_start = content.find("{/* Editor Overlay */}")
image_overlay_end = content.find("{/* Terminal Area with Header */}")

if editor_overlay_start != -1 and image_overlay_end != -1:
    overlays_content = content[editor_overlay_start:image_overlay_end]
    content = content[:editor_overlay_start] + content[image_overlay_end:]
    
    # We need to change the overlays to relative position instead of absolute inset-4
    overlays_content = overlays_content.replace('absolute inset-4 z-30', 'flex-1')
    
    # Create the Right Column
    right_column = """
        {/* Right Column: Preview / Editor / Browser */}
        {(editorFile || previewImage || previewUrl) && (
          <div className="w-[45%] xl:w-[40%] shrink-0 flex flex-col glass-panel rounded-3xl overflow-hidden relative shadow-2xl min-h-0 animate-in slide-in-from-right-4 duration-300 border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl mb-[85px]">
            """ + overlays_content + """
            {/* Browser Preview Overlay */}
            {previewUrl ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--panel-border)] bg-[var(--panel-bg)]">
                  <div className="flex items-center gap-3 text-sm font-mono text-[var(--text-secondary)]">
                    <Globe size={14} className="text-blue-400" />
                    <span className="text-[var(--text-primary)] truncate max-w-[200px]">{previewUrl}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setPreviewUrl(null)} className="text-xs font-mono px-4 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full border border-red-500/20 transition-colors flex items-center gap-1.5">
                      <PanelRightClose size={14} /> Close
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-white relative">
                  <webview src={previewUrl} className="w-full h-full" style={{ border: 'none' }}></webview>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
"""

    # We need to insert the right column at the very end of the Main Area.
    # Where does the Left Column end? After Bottom Input Area.
    
    # Let's find Bottom Input Area closing.
    bottom_input_end = content.find("{/* Add Tool Popover */}")
    
    if bottom_input_end != -1:
        # We need to find the closing div of Bottom Input Area.
        # Actually, let's just insert the Right Column right before the final `</div>` of the Main Area.
        # Let's find the `</div>` that closes Main Area.
        
        main_area_close = content.find("      {/* Help Modal */}")
        if main_area_close != -1:
            # Go back until the `</div>`
            insert_pos = content.rfind("</div>\n      )}", 0, main_area_close)
            if insert_pos != -1:
                insert_pos = content.rfind("</div>\n    </div>\n  )\n}", 0, main_area_close)
                # Wait, this is getting complicated.
                pass

with open('src/App.tsx', 'w') as f:
    f.write(content)
