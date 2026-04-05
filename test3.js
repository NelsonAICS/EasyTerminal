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
  // Find question: look up from selectedLineIndex until we hit a non-empty line that doesn't look like an option
  for (let i = selectedLineIndex - 1; i >= 0; i--) {
    const line = linesArr[i].trim();
    if (line !== '' && !line.match(/^([>❯●◉○]\s*)?(?:(\d+)\.\s+)?/)) {
      // We found the last line of the question block
      let startQ = i;
      while (startQ > 0 && linesArr[startQ - 1].trim() !== '' && !linesArr[startQ - 1].trim().startsWith('□')) {
        startQ--;
      }
      question = linesArr.slice(startQ, i + 1).map(l => l.replace(/^[\s│□]+/, '').trim()).join('\n').trim();
      break;
    }
  }

  // Find options block
  let start = selectedLineIndex;
  while (start > 0) {
    const prevLine = linesArr[start - 1];
    if (prevLine.includes('选择：') || prevLine.includes('?')) break;
    // Stop if the previous line is not empty and not an option or indented text
    if (prevLine.trim() !== '' && !prevLine.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?/) && !prevLine.match(/^[\s│]{4,}/)) break;
    start--;
  }
  
  let end = selectedLineIndex;
  while (end < linesArr.length - 1) {
    if (linesArr[end + 1].includes('Enter to select') || linesArr[end + 1].includes('Esc to cancel')) break;
    end++;
  }
  
  let currentOpt = null;
  for (let i = start; i <= end; i++) {
    const line = linesArr[i];
    if (line.trim() === '') continue;
    
    const match = line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?([^?]+)$/);
    if (match) {
      const indicator = match[1];
      const number = match[2];
      const label = match[3].trim();
      const isSelected = !!indicator && ['>', '❯', '●', '◉'].some(c => indicator.includes(c));
      
      // If it has an indicator or number, it's a main option
      if (indicator || number) {
        currentOpt = { label, number, isSelected, description: '' };
        options.push(currentOpt);
      } 
      // If it doesn't have an indicator/number but is indented, it's a description for the current option
      else if (currentOpt && line.match(/^[\s│]{4,}/)) {
        currentOpt.description += (currentOpt.description ? ' ' : '') + label;
      }
    }
  }
}

console.log("Question:\n", question);
console.log("Options:\n", JSON.stringify(options, null, 2));
