function stripAnsi(str) {
  if (!str) return '';
  let text = str;

  // 1. Remove standard ANSI escape codes (colors, cursor movements)
  text = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

  // 2. Remove OSC (Operating System Command) sequences like window titles
  text = text.replace(/\x1b\].*?(\x07|\x1b\\)/g, '');

  // 3. Remove Braille patterns and common spinner characters used by AI CLI tools
  text = text.replace(/[\u2800-\u28FF⠂⠐✢✳✱✕◌✻✽✶⏺·…╭─╰│]/g, '');

  // 4. Handle carriage returns (\r) which are used for terminal animations/spinners
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    if (!line.includes('\r')) return line;
    const parts = line.split('\r');
    return parts[parts.length - 1]; // Keep only the last overwritten part
  });
  text = processedLines.join('\n');

  // 5. Remove excessive blank lines
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');

  // 6. Remove invisible control characters
  text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return text;
}

const testStr = `c
c
l

026l0q                                        
0q

ClaudeCodehasswitchedfromnpmtonativeinstaller.Run\`
3.No,andtellClaude`;

console.log(stripAnsi(testStr));
