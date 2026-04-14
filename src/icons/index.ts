// Icon metadata and SVG imports
// Generated from cc-switch icons

export interface IconMetadata {
  name: string;
  displayName: string;
  category: string;
  keywords: string[];
  defaultColor?: string;
}

export const iconMetadata: Record<string, IconMetadata> = {
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    category: "ai-provider",
    keywords: ["claude"],
    defaultColor: "#D4915D",
  },
  openai: {
    name: "openai",
    displayName: "OpenAI",
    category: "ai-provider",
    keywords: ["gpt", "chatgpt"],
    defaultColor: "#1E1E1E",
  },
  gemini: {
    name: "gemini",
    displayName: "Gemini",
    category: "ai-provider",
    keywords: ["google", "gemini"],
    defaultColor: "#4285F4",
  },
  deepseek: {
    name: "deepseek",
    displayName: "DeepSeek",
    category: "ai-provider",
    keywords: ["deepseek", "coder"],
    defaultColor: "#1E1E1E",
  },
  zhipu: {
    name: "zhipu",
    displayName: "智谱",
    category: "ai-provider",
    keywords: ["zhipu", "chatglm"],
    defaultColor: "#00A672",
  },
  minimax: {
    name: "minimax",
    displayName: "MiniMax",
    category: "ai-provider",
    keywords: ["minimax", "haige"],
    defaultColor: "#FF6B6B",
  },
  kimi: {
    name: "kimi",
    displayName: "Kimi",
    category: "ai-provider",
    keywords: ["kimi", "moonshot"],
    defaultColor: "#1E1E1E",
  },
  doubao: {
    name: "doubao",
    displayName: "豆包",
    category: "ai-provider",
    keywords: ["doubao", "bytedance", "volcengine"],
    defaultColor: "#3370FF",
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama",
    category: "ai-provider",
    keywords: ["ollama", "local"],
    defaultColor: "#FF7043",
  },
  claude: {
    name: "claude",
    displayName: "Claude",
    category: "ai-provider",
    keywords: ["claude", "anthropic"],
    defaultColor: "#D4915D",
  },
  codex: {
    name: "codex",
    displayName: "Codex",
    category: "ai-provider",
    keywords: ["codex", "openai", "chatgpt"],
    defaultColor: "#1E1E1E",
  },
  openclaw: {
    name: "openclaw",
    displayName: "OpenClaw",
    category: "ai-provider",
    keywords: ["openclaw", "claw"],
    defaultColor: "#10A37F",
  },
  opencode: {
    name: "opencode",
    displayName: "OpenCode",
    category: "ai-provider",
    keywords: ["opencode", "omo"],
    defaultColor: "#1E1E1E",
  },
  custom: {
    name: "custom",
    displayName: "自定义",
    category: "other",
    keywords: ["custom"],
    defaultColor: "#666666",
  },
  claude_code: {
    name: "claude_code",
    displayName: "Claude Code",
    category: "app",
    keywords: ["claude", "code"],
    defaultColor: "#D4915D",
  },
};

// SVG icons as strings
import anthropicSvg from './anthropic.svg?raw';
import openaiSvg from './openai.svg?raw';
import geminiSvg from './gemini.svg?raw';
import deepseekSvg from './deepseek.svg?raw';
import zhipuSvg from './zhipu.svg?raw';
import minimaxSvg from './minimax.svg?raw';
import kimiSvg from './kimi.svg?raw';
import doubaoSvg from './doubao.svg?raw';
import ollamaSvg from './ollama.svg?raw';
import claudeSvg from './claude.svg?raw';
import opencodeLogoLightSvg from './opencode-logo-light.svg?raw';
import clawSvg from './claw.svg?raw';

export const icons: Record<string, string> = {
  anthropic: anthropicSvg,
  openai: openaiSvg,
  gemini: geminiSvg,
  deepseek: deepseekSvg,
  zhipu: zhipuSvg,
  minimax: minimaxSvg,
  kimi: kimiSvg,
  doubao: doubaoSvg,
  ollama: ollamaSvg,
  claude: claudeSvg,
  // Aliases
  claude_code: anthropicSvg,
  codex: openaiSvg,
  openclaw: clawSvg,
  opencode: opencodeLogoLightSvg,
  custom: openaiSvg, // fallback
};

export function getIcon(name: string): string | undefined {
  return icons[name];
}

export function hasIcon(name: string): boolean {
  return name in icons;
}

export function getIconMetadata(name: string): IconMetadata | undefined {
  return iconMetadata[name];
}

export function getIconUrl(_name: string): string | undefined {
  // For URL-based icons (not used in EasyTerminal)
  return undefined;
}

export function isUrlIcon(name: string): boolean {
  return name.startsWith('http://') || name.startsWith('https://');
}
