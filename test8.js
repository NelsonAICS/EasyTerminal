const text = `
Security guide

> 1. Yes, I trust this folder
  2. No, exit
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
    
    // We check if prevLine has a marker or is indented.
    // If neither, we break, UNLESS the current line is just "  2. No" and prevLine is "> 1. Yes"
    // Wait, if start is `> 1. Yes`, prevLine is `Security guide`.
    // `Security guide` has no marker and no indent, so it breaks!
    // So `start` correctly stops at `> 1. Yes`.
    
    const hasMarker = /^[\s│]*([>❯●◉○]\s+|\d+\.\s+)/.test(prevLine);
    const isIndented = /^[\s│]*\s{2,}/.test(prevLine);
    
    if (prevLine.trim() !== '' && !hasMarker && !isIndented) break;
    start--;
  }
  
  let end = selectedLineIndex;
  while (end < linesArr.length - 1) {
    if (linesArr[end + 1].includes('Enter to select') || linesArr[end + 1].includes('Esc to cancel')) break;
    
    const nextLine = linesArr[end + 1];
    const hasMarker = /^[\s│]*([>❯●◉○]\s+|\d+\.\s+)/.test(nextLine);
    const isIndented = /^[\s│]*\s{2,}/.test(nextLine);
    if (nextLine.trim() !== '' && !hasMarker && !isIndented) break;
    
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
