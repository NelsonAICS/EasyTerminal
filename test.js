const text = `
Accessing workspace:

  /Users/nelson

Quick safety check: Is this a project you created or one you trust?

> 1. Yes, I trust this folder
  2. No, exit

Enter to confirm · Esc to cancel
`;

const linesArr = text.split('\n');
let selectedLineIndex = linesArr.findIndex(l => l.match(/^[\s│]*[>❯●◉]/));
const options = [];

if (selectedLineIndex !== -1) {
  let start = selectedLineIndex;
  while (start > 0 && linesArr[start - 1].trim() !== '') {
    start--;
  }
  let end = selectedLineIndex;
  while (end < linesArr.length - 1 && linesArr[end + 1].trim() !== '') {
    end++;
  }
  
  for (let i = start; i <= end; i++) {
    const line = linesArr[i];
    const match = line.match(/^[\s│]*([>❯●◉○]\s*)?(?:(\d+)\.\s+)?([^?]{1,40})$/);
    if (match) {
      options.push({
        label: match[3].trim(),
        number: match[2],
        isSelected: !!match[1] && ['>', '❯', '●', '◉'].some(c => match[1].includes(c))
      });
    }
  }
}
console.log(options);
