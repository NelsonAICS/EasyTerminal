const text = "Hello World\r\nProgress: 10%\rProgress: 50%\rProgress: 100%\r\nDone!\r\n";
const lines = text.split('\n');
const processedLines = lines.map(line => {
  let cleanLine = line;
  if (cleanLine.endsWith('\r')) {
    cleanLine = cleanLine.slice(0, -1);
  }
  if (!cleanLine.includes('\r')) return cleanLine;
  
  const parts = cleanLine.split('\r');
  return parts[parts.length - 1];
});
console.log(processedLines.join('\n'));
