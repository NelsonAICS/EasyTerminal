const text = `
● 你选择了 Yes！请告诉我你想要我帮你做什么？

──────────────────────────────────────────────────────────

你帮我给一个场景让我交互式选择yes or no
❯ say goodbye
`;

const linesArr = text.split('\n');
let selectedLineIndex = -1;
let isPureInputPrompt = false;

for (let i = linesArr.length - 1; i >= 0; i--) {
  if (linesArr[i].match(/^[\s│]*[>❯●◉]/)) {
    selectedLineIndex = i;
    if (linesArr[i].match(/^[\s│]*[>❯●◉]\s*$/)) {
      isPureInputPrompt = true;
    }
    break;
  }
}

const options = [];
let question = '';

if (selectedLineIndex !== -1 && !isPureInputPrompt) {
  let start = selectedLineIndex;
  while (start > 0) {
    const prevLine = linesArr[start - 1];
    if (prevLine.includes('选择：') || prevLine.includes('?')) break;
    
    const hasMarker = /^[\s│]*([>❯●◉○]\s+|\d+\.\s+)/.test(prevLine);
    const isIndented = /^[\s│]*\s{2,}/.test(prevLine);
    
    if (prevLine.trim() !== '' && !hasMarker && !isIndented) break;
    start--;
  }
  
  let end = selectedLineIndex;
  while (end < linesArr.length - 1) {
    if (linesArr[end + 1].includes('Enter to select') || linesArr[end + 1].includes('Esc to cancel')) break;
    end++;
  }
  
  for (let i = start; i <= end; i++) {
    const line = linesArr[i];
    if (line.trim() === '') continue;
    const match = line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?([^?]+)$/);
    if (match) {
      options.push({ label: match[3].trim() });
    }
  }
  
  let qEnd = start - 1;
  while (qEnd >= 0 && (linesArr[qEnd].trim() === '' || /^[─-]{2,}$/.test(linesArr[qEnd].trim()) || /^│\s*[─-]{2,}/.test(linesArr[qEnd]))) {
    qEnd--;
  }
  
  if (qEnd >= 0) {
    let qStart = qEnd;
    while (qStart > 0 && linesArr[qStart - 1].trim() !== '' && !/^[─-]{2,}$/.test(linesArr[qStart - 1].trim()) && !/^│\s*[─-]{2,}/.test(linesArr[qStart - 1])) {
      qStart--;
    }
    question = linesArr.slice(qStart, qEnd + 1).map(l => l.replace(/^[\s│□]+/, '').trim()).filter(l => l !== '').join('\n').trim();
  }
}

const isRealPrompt = options.length > 1 || options.some(opt => /^(yes|no|y|n|cancel|exit|confirm|approve|deny|ok|continue)$/i.test(opt.label));

console.log({ options, question, isRealPrompt });
