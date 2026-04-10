// This script is injected into the <webview> to enable DOM picking functionality

const { ipcRenderer } = require('electron');

console.log('[EasyTerminal DOM Picker] Preload script successfully injected and running.');

let isPickerMode = false;
let hoveredElement = null;
let originalOutline = '';

// Helper to generate a unique CSS selector for an element
function getCssSelector(el) {
  if (el.tagName.toLowerCase() === "html") return "HTML";
  
  let str = el.tagName.toLowerCase();
  str += (el.id !== "") ? "#" + el.id : "";
  if (el.className) {
    let classes = el.className.split(/\s/).filter(Boolean);
    for (let i = 0; i < classes.length; i++) {
      str += "." + classes[i];
    }
  }
  return str;
}

// Listen for messages from the host (App.tsx)
ipcRenderer.on('toggle-picker', (event, active) => {
  isPickerMode = active;
  
  if (!isPickerMode && hoveredElement) {
    // Clean up
    hoveredElement.style.outline = originalOutline;
    hoveredElement = null;
  }
});

// Handle mouse movements
window.addEventListener('mouseover', (e) => {
  if (!isPickerMode) return;
  
  e.preventDefault();
  e.stopPropagation();

  if (hoveredElement !== e.target) {
    if (hoveredElement) {
      hoveredElement.style.outline = originalOutline;
    }
    
    hoveredElement = e.target;
    originalOutline = hoveredElement.style.outline;
    
    // Highlight the element
    hoveredElement.style.outline = '2px solid #3b82f6';
    hoveredElement.style.outlineOffset = '-2px';
  }
}, true);

// Handle clicks
window.addEventListener('click', (e) => {
  if (!isPickerMode) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  if (hoveredElement) {
    hoveredElement.style.outline = originalOutline;
    
    // Extract useful DOM data
    const elementData = {
      tagName: hoveredElement.tagName.toLowerCase(),
      id: hoveredElement.id,
      className: hoveredElement.className,
      selector: getCssSelector(hoveredElement),
      outerHTML: hoveredElement.outerHTML,
      textContent: hoveredElement.textContent.trim().substring(0, 200), // Max 200 chars
      href: hoveredElement.href || null,
      src: hoveredElement.src || null,
      bounds: hoveredElement.getBoundingClientRect()
    };
    
    // Send data back to host
    ipcRenderer.sendToHost('element-picked', elementData);
    
    // Turn off picker mode after selection
    isPickerMode = false;
    hoveredElement = null;
    
    // Notify host that picker turned off automatically
    ipcRenderer.sendToHost('picker-status-changed', false);
  }
}, true);

// Add basic context menu prevention when in picker mode
window.addEventListener('contextmenu', (e) => {
  if (isPickerMode) {
    e.preventDefault();
  }
}, true);
