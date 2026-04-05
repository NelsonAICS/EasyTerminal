const text = `
场景： 你是一家AI公司的技术负责人。

你的团队开发了一款AI助手。一天，CEO拿着一份合同来找你，某大型企业希望深度定制
这款AI助手，开价 5000万美元

1. 移除所有安全过滤机制
2. 允许AI生成任何内容（包括有害内容）
3. 不允许对外透露这笔合作

你选择接受还是拒绝？

A) 接受 ( Yes)
B) 拒绝 ( No)

---
输入 A 或 B 告诉你你的选择。

❯ 
`;

const linesArr = text.split('\n');
let selectedLineIndex = linesArr.findIndex(l => l.match(/^[\s│]*[>❯●◉]\s*$/));
const options = [];
let question = 'Agent Interaction Required';

if (selectedLineIndex !== -1) {
  console.log("Found pure input prompt at line", selectedLineIndex);
  
  // Find where the options might end
  let optEnd = selectedLineIndex - 1;
  while (optEnd >= 0) {
    const line = linesArr[optEnd].trim();
    if (line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/)) {
      break; // Found an option line!
    }
    optEnd--;
  }
  
  if (optEnd >= 0) {
    // We found the bottom of the options block
    let optStart = optEnd;
    while (optStart >= 0) {
      const line = linesArr[optStart].trim();
      if (!line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/) && line !== '') {
        break; // Reached the question text or empty space
      }
      optStart--;
    }
    optStart++;
    
    // Parse the options
    for (let i = optStart; i <= optEnd; i++) {
      const line = linesArr[i].trim();
      if (line === '') continue;
      const match = line.match(/^([A-Za-z]|\d+)[).]\s+(.+)$/);
      if (match) {
        options.push({
          label: match[2],
          action: match[1] + '\r',
          key: match[1]
        });
      }
    }
    
    // Extract question
    let qEnd = optStart - 1;
    while (qEnd >= 0 && linesArr[qEnd].trim() === '') qEnd--;
    
    if (qEnd >= 0) {
      let qStart = qEnd;
      while (qStart > 0 && linesArr[qStart - 1].trim() !== '') {
        qStart--;
      }
      question = linesArr.slice(qStart, qEnd + 1).map(l => l.replace(/^[\s│□]+/, '').trim()).join('\n').trim();
    }
  }
}

console.log("Question:\n", question);
console.log("Options:\n", JSON.stringify(options, null, 2));
