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
let selectedLineIndex = linesArr.findIndex(l => l.match(/^[\s│]*[>❯●◉]/));
const options = [];
let question = 'Agent Interaction Required';

if (selectedLineIndex !== -1) {
  // Check if this is an input prompt instead of a select prompt
  // An input prompt usually has `❯ ` followed by empty or text, but NOT followed by an option number
  const isSelectPrompt = !!linesArr[selectedLineIndex].match(/^[\s│]*([>❯●◉○]\s*)(?:(\d+)\.\s+)?(.+)$/);
  
  if (!isSelectPrompt) {
     console.log("It's an input prompt, looking for options above.");
     // Look upwards for A) B) or 1. 2. options
     let optEnd = selectedLineIndex - 1;
     while (optEnd >= 0 && (linesArr[optEnd].trim() === '' || linesArr[optEnd].includes('---') || linesArr[optEnd].includes('输入'))) {
       optEnd--;
     }
     
     let optStart = optEnd;
     while (optStart >= 0) {
       const line = linesArr[optStart];
       // Match "A) Yes", "1. Yes", "A. Yes"
       if (!line.match(/^[\s│]*([A-Z]|\d+)[).]\s+(.+)$/) && line.trim() !== '') {
         break;
       }
       optStart--;
     }
     optStart++; // Adjust back to the first matching line
     
     for (let i = optStart; i <= optEnd; i++) {
        const line = linesArr[i];
        const match = line.match(/^[\s│]*([A-Z]|\d+)[).]\s+(.+)$/);
        if (match) {
           options.push({
             key: match[1],
             label: match[2].trim(),
             action: match[1] + '\r'
           });
        }
     }
     
     // Extract question above options
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
