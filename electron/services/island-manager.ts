/**
 * Island Manager — Smart TUI Detection & Island State Management
 *
 * Implements intelligent detection of truly interactive TUI menus, distinguishing them
 * from ordinary numbered lists and other false positives.
 */

import { app } from 'electron';
import Store from 'electron-store';

interface MenuOption {
  key: string;
  label: string;
  description?: string;
  actionSequence?: string[];
}

interface TUIDetectionResult {
  isRealPrompt: boolean;
  confidence: number;
  menuType: 'inquirer' | 'claude' | 'npm' | 'general' | 'none';
  question: string;
  options: MenuOption[];
  selectedIndex: number;
}

interface TUIDetectionConfig {
  sensitivity: number;       // 0-1, threshold for confidence
  smartDetection: boolean;    // use TIU patterns
  ignorePatterns: string[];   // regex strings to ignore
  minOptions: number;        // minimum options to trigger
  maxOptions: number;         // maximum options to show
}

interface IslandState {
  agentState: 'idle' | 'thinking' | 'working' | 'waiting' | 'error';
  taskProgress: {
    current: number;
    total: number;
    label: string;
  };
  lastMessage: string;
}

// ── TUI Pattern Definitions ──────────────────────────────────────

interface TIUPattern {
  type: 'inquirer' | 'claude' | 'npm' | 'general';
  description: string;
  /** Match conditions - all must pass */
  matchers: Array<(lines: string[], text: string) => boolean>;
  /** Extract options from lines */
  optionExtractor: (lines: string[]) => MenuOption[];
  /** Extract question text */
  questionExtractor: (lines: string[]) => string;
  /** Base confidence score (0-1) */
  baseConfidence: number;
}

/**
 * Inquirer.js pattern:
 * - Has arrow key instructions OR "Enter to select"
 * - Has visible option indicators: >, ❯, ●, ◉, ○
 * - Question ends with ?
 * - NOT preceded by a shell prompt ($ or #) in recent lines
 */
const INQUIRER_PATTERN: TIUPattern = {
  type: 'inquirer',
  description: 'Inquirer.js style interactive prompt',
  matchers: [
    // Must have instruction text
    (lines, text) => {
      const instructionPatterns = [
        /Use arrow keys/i,
        /Enter to select/i,
        /↑↓ navigate/i,
        /\u2191\u2193/,  // ↑↓
      ];
      return instructionPatterns.some(p => p.test(text));
    },
    // Must have option indicators
    (lines, text) => {
      // Check for common Inquirer indicators
      const indicatorRegex = /[>❯●◉○]\s+/;
      const matches = text.match(indicatorRegex);
      if (!matches) return false;
      // Count unique indicator lines (not just occurrences)
      const indicatorLines = lines.filter(l => indicatorRegex.test(l));
      return indicatorLines.length >= 1;
    },
    // NOT preceded by active shell prompt (dead prompt check)
    (lines) => {
      // Check if there's a shell prompt AFTER the option block
      const lastPromptIdx = lines.reduce((last, line, idx) => {
        if (/[%$#]\s*$/.test(line) || /aborted/i.test(line)) return idx;
        return last;
      }, -1);
      // If shell prompt appears near end of recent buffer, it's likely dead
      const cursorNearEnd = lastPromptIdx > lines.length - 5 && lastPromptIdx >= 0;
      return !cursorNearEnd;
    },
  ],
  optionExtractor: (lines) => {
    const options: MenuOption[] = [];
    const indicatorRegex = /^[\s│]*(?:#)?([>❯●◉○]\s*)?(?:(\d+)\.\s+)?(.+)$/;

    for (const line of lines) {
      const match = line.match(indicatorRegex);
      if (!match) continue;
      const [, indicator, number, rest] = match;
      const label = rest.trim();

      // Skip instruction lines
      if (/enter to select|use arrow keys|↑↓ navigate|navigate/i.test(label)) continue;
      // Skip empty lines
      if (!label || label.length === 0) continue;
      // Skip very short non-numbered lines that aren't selected
      if (!indicator && number && label.length < 2) continue;
      // Skip lines that are clearly shell paths or commands
      if (/^\//.test(label) && !/[?]$/.test(label)) continue;

      const isSelected = indicator ? /[>❯●◉]/.test(indicator) : false;
      const key = number || (isSelected ? String.fromCharCode(65 + options.length) : '');
      const action = isSelected ? '\r' : (number ? `${number}\r` : '');

      options.push({
        key,
        label,
        actionSequence: action ? [action] : undefined,
      });
    }

    return options;
  },
  questionExtractor: (lines) => {
    // Find the question - text before options that ends with ?
    const questionLines: string[] = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) break;
      // Skip box drawing chars and empty
      if (/^[─-│┃┄┈░▒▓]+$/.test(line)) continue;
      // Skip option indicators
      if (/^[>❯●◉○]\s*/.test(line)) break;
      // Skip numbered items
      if (/^\d+[\.\)]\s/.test(line)) break;
      questionLines.unshift(line);
      if (line.endsWith('?') || /what would you like|select an option|choose one/i.test(line)) {
        break;
      }
    }
    return questionLines
      .map(l => l.replace(/^[\s│┌└├┬┴┼►▼\x00-\x1f]+/, '').trim())
      .filter(l => l.length > 0)
      .join('\n');
  },
  baseConfidence: 0.85,
};

/**
 * Claude Code confirmation pattern:
 * - Has [█ ✓ ✗] checkbox indicators
 * - Often has text in brackets like [y/n] or [Y/n]
 * - Or has "Confirm" / "Proceed" text
 */
const CLAUDE_PATTERN: TIUPattern = {
  type: 'claude',
  description: 'Claude Code / Agent confirmation prompt',
  matchers: [
    (lines, text) => {
      // Checkbox pattern: [  ] or [█] or [✓] or [✗]
      const checkboxRegex = /\[[\s█✓✗xX]+\]/;
      const matches = text.match(checkboxRegex);
      if (!matches) return false;
      return matches.length >= 1;
    },
    (lines) => {
      // Should not be preceded by dead prompt
      const hasShellAfter = lines.slice(-5).some(l =>
        /[%$#]\s*$/.test(l) || /aborted/i.test(l)
      );
      return !hasShellAfter;
    },
  ],
  optionExtractor: (lines) => {
    const options: MenuOption[] = [];
    // Look for checkbox patterns and their associated text
    for (const line of lines) {
      // Match checkbox followed by text: "[  ] Option" or "[y] yes"
      const checkboxMatch = line.match(/\[[\s█✓✗xX]*\][\s-]*(.+)/);
      if (!checkboxMatch) continue;
      const rest = checkboxMatch[1].trim();
      if (!rest) continue;

      // Extract checkbox state
      const checkboxPart = line.match(/(\[[\s█✓✗xX]*\])/)?.[1] || '';
      const isSelected = /[█✓✗]/.test(checkboxPart);

      // Map common confirmations
      if (/^(y|yes|confirm|proceed|approve)/i.test(rest)) {
        options.push({ key: 'y', label: rest, isSelected, actionSequence: ['y', '\r'] });
      } else if (/^(n|no|cancel|deny|reject)/i.test(rest)) {
        options.push({ key: 'n', label: rest, isSelected, actionSequence: ['n', '\r'] });
      } else if (/^q|quit|exit/i.test(rest)) {
        options.push({ key: 'q', label: rest, isSelected, actionSequence: ['q', '\r'] });
      } else {
        options.push({ key: rest[0]?.toLowerCase() || '', label: rest, isSelected });
      }
    }
    return options;
  },
  questionExtractor: (lines) => {
    // Get text before options
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (/^\[/.test(line)) break; // Start of options
      if (/[%$#]\s*$/.test(line)) break; // Shell prompt
      if (line.length > 10) {
        return line.replace(/^[\s│┌└├┬┴┼►▼]+/, '').trim();
      }
    }
    return 'Confirm action';
  },
  baseConfidence: 0.80,
};

/**
 * npm/yarn confirmation pattern:
 * - Contains "y/N" or "yes/no" or "confirm" in text
 * - Simple yes/no without fancy indicators
 */
const NPM_PATTERN: TIUPattern = {
  type: 'npm',
  description: 'npm/yarn confirmation prompt',
  matchers: [
    (lines, text) => {
      const patterns = [
        /\(y\/n\)/i,
        /\[y\/N\]/i,
        /yes\/no/i,
        /y to continue/i,
        /press y/i,
        /want to proceed/i,
        /continue\?/i,
      ];
      return patterns.some(p => p.test(text));
    },
    (lines) => {
      // Should not have dead prompt after
      const hasShellAfter = lines.slice(-3).some(l => /[%$#]\s*$/.test(l));
      return !hasShellAfter;
    },
  ],
  optionExtractor: () => [
    { key: 'y', label: 'Yes', actionSequence: ['y', '\r'] },
    { key: 'n', label: 'No', actionSequence: ['n', '\r'] },
  ],
  questionExtractor: (lines) => {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/[%$#]\s*$/.test(trimmed)) continue;
      if (/^[>❯●◉]/.test(trimmed)) continue;
      if (/^\[/.test(trimmed)) continue;
      if (/\(y\/n\)/i.test(trimmed) || /\[y\/N\]/i.test(trimmed)) {
        return trimmed.replace(/\(y\/n\)/i, '').replace(/\[y\/N\]/i, '').trim() || 'Confirm?';
      }
      if (trimmed.length > 10) {
        return trimmed;
      }
    }
    return 'Continue?';
  },
  baseConfidence: 0.90,
};

/**
 * General interactive pattern (fallback):
 * - Has numbered options in sequence (1., 2., 3.)
 * - BUT must have at least one interactive indicator
 * - AND must NOT match simple numbered lists
 */
const GENERAL_PATTERN: TIUPattern = {
  type: 'general',
  description: 'Generic interactive menu',
  matchers: [
    (lines, text) => {
      // Must have numbered options
      const numberedLines = lines.filter(l => /^\s*\d+[\.\)]\s+\S/.test(l));
      if (numberedLines.length < 2) return false;

      // Must have at least one interactive indicator
      const hasIndicator = /[>❯●◉○?]|press\s+enter|select|choose/i.test(text);
      const hasQuestion = /\?$/.test(text);
      return hasIndicator || hasQuestion;
    },
    (lines) => {
      // Must NOT be a simple numbered list (no recent shell prompt check)
      const hasShellAfter = lines.slice(-3).some(l => /[%$#]\s*$/.test(l));
      return !hasShellAfter;
    },
  ],
  optionExtractor: (lines) => {
    const options: MenuOption[] = [];
    const numberedRegex = /^\s*(\d+)[\.\)]\s+(.+)/;

    for (const line of lines) {
      const match = line.match(numberedRegex);
      if (!match) continue;
      const [, number, label] = match;
      const trimmedLabel = label.trim();

      // Skip if it looks like a path or command
      if (/^\//.test(trimmedLabel) || /^~/.test(trimmedLabel)) continue;
      // Skip very short items that could be file counts or numbers
      if (trimmedLabel.length < 3 && !/[a-zA-Z]/.test(trimmedLabel)) continue;
      // Skip instruction lines
      if (/enter|press|select|choose/i.test(trimmedLabel) && trimmedLabel.length < 20) continue;

      options.push({
        key: number,
        label: trimmedLabel,
        actionSequence: [`${number}\r`],
      });
    }
    return options;
  },
  questionExtractor: (lines) => {
    // Find a question-like line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d+[\.\)]/.test(trimmed)) break; // Stop at options
      if (/^[>❯●◉]/.test(trimmed)) break;
      if (/[%$#]\s*$/.test(trimmed)) continue;
      if (trimmed.length > 5) {
        return trimmed.replace(/^[\s│┌└├┬┴┼►▼]+/, '').trim();
      }
    }
    return 'Select an option';
  },
  baseConfidence: 0.60,
};

const TUI_PATTERNS: TIUPattern[] = [
  NPM_PATTERN,
  INQUIRER_PATTERN,
  CLAUDE_PATTERN,
  GENERAL_PATTERN,
];

// ── False Positive Patterns ────────────────────────────────────────

const FALSE_POSITIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Simple numbered lists (1. 2. 3. without context)
  { pattern: /^(\d+)\.\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+$/gm, reason: 'Simple numbered list without indicators' },
  // Version numbers (1.2.3.4)
  { pattern: /\b\d+\.\d+\.\d+\.\d+\b/, reason: 'Version number pattern' },
  // Version with punctuation (1., 2., 3., 4.)
  { pattern: /^(\d+\.)\s*$/gm, reason: 'Pure numbered sequence' },
  // Line numbers in editor output
  { pattern: /^\s*\d+\s+\|\s*\|?\s*\d+\s+\|?\s*$/, reason: 'Editor line numbers' },
  // File diff line numbers
  { pattern: /^@@\s*-\d+(,\d+)?\s*\+\d+(,\d+)?\s*@@/, reason: 'Git diff hunk header' },
  // git diff line numbers
  { pattern: /^-\d+\s+\+\d+\s+@@/, reason: 'Git diff line numbers' },
  // Copyright statements
  { pattern: /^\d+\.\s+Copyright/i, reason: 'Copyright statement' },
  // Legal document sections
  { pattern: /^\d+\.\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\.$/m, reason: 'Legal document section' },
  // Package dependency lists
  { pattern: /^\d+\)\s+\S+@\d+\.\d+\.\d+/, reason: 'Package dependency list' },
];

// ── Island Manager ────────────────────────────────────────────────

export class IslandManager {
  private store: Store;
  private config: TUIDetectionConfig;
  private state: IslandState = {
    agentState: 'idle',
    taskProgress: { current: 0, total: 0, label: '' },
    lastMessage: '',
  };

  constructor() {
    this.store = new Store({ name: 'island-config' });
    this.config = this.loadConfig();
  }

  private loadConfig(): TUIDetectionConfig {
    return {
      sensitivity: this.store.get('island.sensitivity', 0.75) as number,
      smartDetection: this.store.get('island.smartDetection', true) as boolean,
      ignorePatterns: this.store.get('island.ignorePatterns', []) as string[],
      minOptions: this.store.get('island.minOptions', 2) as number,
      maxOptions: this.store.get('island.maxOptions', 8) as number,
    };
  }

  getConfig(): TUIDetectionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TUIDetectionConfig>): TUIDetectionConfig {
    this.config = { ...this.config, ...updates };
    for (const [key, value] of Object.entries(updates)) {
      this.store.set(`island.${key}`, value);
    }
    return this.config;
  }

  /**
   * Main detection function - analyze terminal output and determine if a real
   * interactive prompt is present.
   */
  detect(lines: string[], text: string): TUIDetectionResult {
    // Quick false positive check
    if (this.isFalsePositive(lines, text)) {
      return {
        isRealPrompt: false,
        confidence: 0,
        menuType: 'none',
        question: '',
        options: [],
        selectedIndex: -1,
      };
    }

    // Check ignore patterns
    for (const patternStr of this.config.ignorePatterns) {
      try {
        const pattern = new RegExp(patternStr);
        if (pattern.test(text)) {
          return {
            isRealPrompt: false,
            confidence: 0,
            menuType: 'none',
            question: '',
            options: [],
            selectedIndex: -1,
          };
        }
      } catch {
        // Invalid regex, skip
      }
    }

    // Try each pattern in order
    for (const pattern of TUI_PATTERNS) {
      const allMatchersPass = pattern.matchers.every(m => m(lines, text));
      if (!allMatchersPass) continue;

      const options = pattern.optionExtractor(lines).slice(0, this.config.maxOptions);
      const question = pattern.questionExtractor(lines);

      // Minimum options check
      if (options.length < this.config.minOptions) {
        continue;
      }

      // Calculate confidence
      let confidence = pattern.baseConfidence;

      // Boost confidence for strong indicators
      if (text.includes('Use arrow keys')) confidence += 0.08;
      if (text.includes('Enter to select')) confidence += 0.07;
      if (text.includes('●') || text.includes('◉')) confidence += 0.05; // Selected indicators

      // Reduce confidence for potential dead prompts
      const hasRecentShellPrompt = lines.slice(-3).some(l => /[%$#]\s*$/.test(l));
      if (hasRecentShellPrompt) confidence -= 0.15;

      // Normalize to [0, 1]
      confidence = Math.max(0, Math.min(1, confidence));

      // Apply sensitivity threshold
      if (confidence < this.config.sensitivity) {
        continue;
      }

      const selectedIndex = options.findIndex(o => o.actionSequence);

      return {
        isRealPrompt: true,
        confidence,
        menuType: pattern.type,
        question,
        options,
        selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
      };
    }

    return {
      isRealPrompt: false,
      confidence: 0,
      menuType: 'none',
      question: '',
      options: [],
      selectedIndex: -1,
    };
  }

  /**
   * Quick check if text matches any known false positive pattern
   */
  private isFalsePositive(lines: string[], text: string): boolean {
    // Check simple numbered lists (1. 2. 3. without any context)
    const simpleNumberedLines = lines.filter(l => /^\s*\d+\.\s+\S+\s*$/.test(l));
    if (simpleNumberedLines.length >= 3) {
      // Only reject if ALL recent lines are simple numbered
      const recentLines = lines.slice(-10);
      const allSimple = recentLines.every(l => /^\s*$/.test(l) || /^\s*\d+\.\s+\S+\s*$/.test(l));
      if (allSimple) return true;
    }

    // Version numbers (1.2.3.4)
    const hasVersionPattern = /\b\d+\.\d+\.\d+\.\d+\b/.test(text);
    if (hasVersionPattern) return true;

    // Pure list without any interactive context
    const numberedCount = (text.match(/\b\d+\.\s+/g) || []).length;
    const hasInteractivity = /[>❯●◉?]|select|choose|press|enter/i.test(text);
    if (numberedCount >= 4 && !hasInteractivity) return true;

    // Recent shell prompt = dead prompt
    const hasRecentShell = lines.slice(-2).some(l => /[%$#]\s*$/.test(l));
    if (hasRecentShell) return true;

    // Check false positive patterns
    for (const fp of FALSE_POSITIVE_PATTERNS) {
      if (fp.pattern.test(text)) return true;
    }

    return false;
  }

  // ── Island State Management ──────────────────────────────────────

  getState(): IslandState {
    return { ...this.state };
  }

  setAgentState(state: IslandState['agentState']): void {
    this.state.agentState = state;
  }

  setTaskProgress(current: number, total: number, label: string): void {
    this.state.taskProgress = { current, total, label };
  }

  setLastMessage(message: string): void {
    this.state.lastMessage = message;
  }

  /**
   * Format a TUIDetectionResult into a structured prompt for the Island UI
   */
  formatPromptPayload(
    result: TUIDetectionResult,
    sessionId: string,
    sessionName: string
  ): {
    message: string;
    options: Array<{
      key: string;
      label: string;
      description?: string;
      actionSequence?: string[];
    }>;
    sessionId: string;
    sessionName: string;
  } {
    const options = result.options.map((opt, idx) => ({
      key: opt.key || String(idx + 1),
      label: opt.label,
      description: opt.description,
      actionSequence: opt.actionSequence,
    }));

    return {
      message: result.question || 'Agent Interaction Required',
      options,
      sessionId,
      sessionName,
    };
  }
}

// Singleton instance
let islandManagerInstance: IslandManager | null = null;

export function getIslandManager(): IslandManager {
  if (!islandManagerInstance) {
    islandManagerInstance = new IslandManager();
  }
  return islandManagerInstance;
}
