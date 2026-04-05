const text = `
□ 功能决策

假设你正在开发一个社交媒体应用，现在需要决定是否添加「阅后即焚」功能。你选择：

> 1. Yes
     添加「阅后即焚」功能，增强隐私保护
  2. No
     不添加，保持现有功能简洁
  3. Type something.

  4. Chat about this

Enter to select · ↑/↓ to navigate · Esc to cancel
`;

const linesArr = text.split('\n');
let selectedLineIndex = linesArr.findIndex(l => l.match(/^[\s│]*[>❯●◉]/));
const options = [];
let question = 'Agent Interaction Required';

if (selectedLineIndex !== -1) {
  // Find question (looking upwards for the first non-empty line that doesn't look like an option, or a line ending in ':')
  for (let i = selectedLineIndex - 1; i >= 0; i--) {
    const line = linesArr[i].trim();
    if (line !== '' && !line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?/)) {
      // Find the start of the paragraph
      let startQ = i;
      while (startQ > 0 && linesArr[startQ - 1].trim() !== '' && !linesArr[startQ - 1].trim().startsWith('□')) {
        startQ--;
      }
      question = linesArr.slice(startQ, i + 1).map(l => l.trim()).join(' ');
      break;
    }
  }

  // Find options block
  let start = selectedLineIndex;
  // We don't want to stop at empty lines if the options are separated by empty lines (like "4. Chat about this")
  // Instead, scan forwards and backwards until we hit instructions ("Enter to select") or questions
  while (start > 0) {
    if (linesArr[start - 1].includes('选择：') || linesArr[start - 1].includes('?')) break;
    if (linesArr[start - 1].trim() !== '' && !linesArr[start - 1].match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?/)) break;
    start--;
  }
  
  let end = selectedLineIndex;
  while (end < linesArr.length - 1) {
    if (linesArr[end + 1].includes('Enter to select') || linesArr[end + 1].includes('Esc to cancel')) break;
    end++;
  }
  
  for (let i = start; i <= end; i++) {
    const line = linesArr[i];
    // Relaxed regex to capture options even if they have sub-descriptions
    const match = line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?([^?]+)$/);
    if (match && line.trim() !== '') {
      const indicator = match[1];
      const number = match[2];
      const label = match[3].trim();
      const isSelected = !!indicator && ['>', '❯', '●', '◉'].some(c => indicator.includes(c));
      
      // If it has an indicator or number, it's a main option
      if (indicator || number) {
        options.push({ label, number, isSelected, description: '' });
      } 
      // If it doesn't have an indicator/number but is indented, it might be a description for the previous option
      else if (options.length > 0 && line.match(/^[\s│]{4,}/)) {
        options[options.length - 1].description += (options[options.length - 1].description ? ' ' : '') + label;
      }
    }
  }
}

console.log("Question:", question);
console.log("Options:", options);
