const outputs = [
  "Tokens: 14.3k Cost: $0.04",
  "Usage: 1,500 tokens",
  "Billing: $1.25",
  "Spend: $0.001",
  "Tokens: 15.2K\nCost: $0.05",
  "API Usage Billing\nTokens: 123\nCost: $0.01"
];

for (const out of outputs) {
  const costMatch = out.match(/(?:Cost|Billing|Spend|Usage)[\s\S]{0,20}?\$([0-9.]+)/i);
  const tokenMatch = out.match(/(?:Tokens|Usage)[\s\S]{0,20}?(?:In|Out|Total)?[\s:=-]+([0-9]+[.,]?[0-9]*[kKmM]?)/i);
  console.log("TEXT:", out.replace(/\n/g, '\\n'));
  console.log("  Cost:", costMatch ? costMatch[1] : null);
  console.log("  Tokens:", tokenMatch ? tokenMatch[1] : null);
}
