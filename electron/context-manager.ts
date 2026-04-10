import * as fs from 'fs';
import { join } from 'path';
import * as os from 'os';

import { app } from 'electron';

import { NLPService } from './nlp-service';
import { PrivacyFilter } from './privacy-filter';

// Extremely basic robust ANSI stripper
function stripAnsi(str: string): string {
  if (!str) return '';
  let text = str;

  // 1. 仅移除基础的 ANSI 颜色和控制码（保证 Markdown 源码的基本可读性）
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

  // 2. 按照您的要求，简单粗暴地去掉所有 \r (回车符)
  text = text.replace(/\r/g, '');

  return text;
}

export class ContextManager {
  public basePath: string;
  public sessionsPath: string;
  public snippetsPath: string;
  public projectsPath: string;
  private nlpService: NLPService;
  
  private lastSavedText: string = '';
  private lastSavedTime: number = 0;

  constructor() {
    // Let's create a '.easy_context' folder right inside the project directory for development,
    // and fallback to standard appData in production.
    if (app.isPackaged) {
      this.basePath = join(app.getPath('userData'), 'EasyTerminal_Context');
    } else {
      this.basePath = join(process.cwd(), '.easy_context');
    }
    
    this.sessionsPath = join(this.basePath, 'Sessions');
    this.snippetsPath = join(this.basePath, 'Snippets');
    this.projectsPath = join(this.basePath, 'Projects');
    
    this.initDirs();
    this.nlpService = new NLPService(this.basePath);
  }

  private initDirs() {
    [this.basePath, this.sessionsPath, this.snippetsPath, this.projectsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.error(`[ContextManager] Failed to create dir: ${dir}`, e);
        }
      }
    });
  }

  public createSessionLogger(sessionId: string, sessionName: string) {
    const dateObj = new Date();
    const dateStr = dateObj.toISOString().replace(/[:.]/g, '-');
    const safeName = sessionName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const fileName = `Session_${safeName}_${dateStr}.md`;
    const filePath = join(this.sessionsPath, fileName);

    // Initial frontmatter and Markdown structure
    const frontmatter = `---
id: "${sessionId}"
title: "${sessionName} (${dateObj.toLocaleString()})"
type: "session"
source: "EasyTerminal"
created_at: "${dateObj.toISOString()}"
tags: ["terminal-session"]
---

## Terminal Session Output

\`\`\`text
`;
    
    let stream: fs.WriteStream | null = null;
    try {
      fs.writeFileSync(filePath, frontmatter, 'utf-8');
      stream = fs.createWriteStream(filePath, { flags: 'a', encoding: 'utf-8' });
    } catch (e) {
      console.error('[ContextManager] Failed to initialize session stream', e);
      // Return a dummy logger if file creation fails
      return { write: () => {}, end: () => {} };
    }

    let buffer = '';
    let flushTimeout: NodeJS.Timeout | null = null;

    const flush = () => {
      if (buffer.length > 0 && stream && !stream.destroyed) {
        stream.write(buffer);
        buffer = '';
      }
    };

    return {
      write: (data: string) => {
        const cleanData = stripAnsi(data);
        buffer += cleanData;

        // Buffer full (1024 chars), flush immediately
        if (buffer.length > 1024) {
          if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
          }
          flush();
        } 
        // Throttle (idle for 1s), flush lazily
        else if (!flushTimeout) {
          flushTimeout = setTimeout(() => {
            flush();
            flushTimeout = null;
          }, 1000);
        }
      },
      end: () => {
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        flush();
        if (stream && !stream.destroyed) {
          stream.write('\n\`\`\`\n\n*Session closed at ' + new Date().toLocaleString() + '*\n');
          stream.end(() => {
            // After file is fully written and closed, run NLP tag extraction
            try {
              const fullContent = fs.readFileSync(filePath, 'utf-8');
              // We only want to extract keywords from the actual content, skipping frontmatter if possible
              const contentToAnalyze = fullContent.replace(/^---[\s\S]+?---/, '');
              const keywords = this.nlpService.extractKeywords(contentToAnalyze, 3);
              
              if (keywords.length > 0) {
                // Update frontmatter tags
                const tagsStr = `["terminal-session", ${keywords.map(k => `"${k}"`).join(', ')}]`;
                const updatedContent = fullContent.replace(/tags:\s*\["terminal-session"\]/, `tags: ${tagsStr}`);
                fs.writeFileSync(filePath, updatedContent, 'utf-8');
                console.log(`[ContextManager] Added TF-IDF tags to session: ${keywords.join(', ')}`);
              }
            } catch (e) {
              console.error('[ContextManager] Failed to run TF-IDF tag extraction', e);
            }
          });
        }
      },
      destroy: () => {
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        if (stream && !stream.destroyed) {
          stream.end(() => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[ContextManager] Destroyed session log: ${filePath}`);
              }
            } catch (e) {
              console.error(`[ContextManager] Failed to delete session log: ${filePath}`, e);
            }
          });
        } else {
           try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[ContextManager] Destroyed session log: ${filePath}`);
              }
            } catch (e) {
              console.error(`[ContextManager] Failed to delete session log: ${filePath}`, e);
            }
        }
      }
    };
  }
  public saveContextSnippet(content: string, source: string = 'clipboard'): { filePath: string, isSensitive: boolean } | null {
    try {
      if (!content || !content.trim()) return null;

      // 0. 重复抓取拦截 (Deduplication)
      // 如果抓取的内容和上一次完全一致，且间隔不超过 3 秒，直接忽略，避免写入重复内容
      const now = Date.now();
      if (this.lastSavedText === content && (now - this.lastSavedTime < 3000)) {
        console.log(`[ContextManager] Ignored duplicate snippet save from ${source}`);
        return null;
      }
      this.lastSavedText = content;
      this.lastSavedTime = now;

      // 1. 敏感信息脱敏与过滤 (Privacy Check)
      // 现在不再拦截，而是只发出警告，由外部决定是否弹窗提示
      const isSensitive = PrivacyFilter.isSensitive(content);
      if (isSensitive) {
        console.log(`[ContextManager] Flagged sensitive content from ${source} (Saving anyway with warning)`);
      }

      const dateObj = new Date();
      // 以天为单位建档，格式如：2026-04-08
      const dayStr = dateObj.toISOString().split('T')[0];
      const fileName = `Snippets_${dayStr}.md`;
      const filePath = join(this.snippetsPath, fileName);

      // 提取这句内容的关键词
      const newKeywords = this.nlpService.extractKeywords(content, 3);
      const timeStr = dateObj.toLocaleTimeString();
      const appendBlock = `\n\n## [${timeStr}] ${source}\n*Tags: ${newKeywords.join(', ')}*\n\n${content}`;

      if (fs.existsSync(filePath)) {
        // 如果当天的文件已存在，则以追加模式写入，并合并 Tags
        let existingContent = fs.readFileSync(filePath, 'utf-8');
        
        // 提取原有的 Tags 并合并
        const tagsMatch = existingContent.match(/tags:\s*\[(.*?)\]/);
        let currentTags: string[] = [];
        if (tagsMatch) {
          currentTags = tagsMatch[1].split(',').map(t => t.trim().replace(/^"|"$/g, '')).filter(t => t && t !== 'snippet');
        }
        
        // 去重合并，并限制最多保留 15 个全局 Tag 避免头部过长
        const mergedTags = Array.from(new Set([...currentTags, ...newKeywords])).slice(0, 15);
        const tagsStr = `["snippet", ${mergedTags.map(k => `"${k}"`).join(', ')}]`;
        
        existingContent = existingContent.replace(/tags:\s*\[.*?\]/, `tags: ${tagsStr}`);
        fs.writeFileSync(filePath, existingContent + appendBlock, 'utf-8');
        console.log(`[ContextManager] Appended snippet to ${fileName}`);
      } else {
        // 如果当天文件不存在，则创建新的日记文件
        const tagsStr = `["snippet", ${newKeywords.map(k => `"${k}"`).join(', ')}]`;
        const frontmatter = `---
id: "snippets_${dayStr}"
title: "Snippets ${dayStr}"
type: "daily_snippets"
created_at: "${dateObj.toISOString()}"
tags: ${tagsStr}
---

# Daily Snippets - ${dayStr}`;
        fs.writeFileSync(filePath, frontmatter + appendBlock, 'utf-8');
        console.log(`[ContextManager] Created new daily snippet file: ${fileName}`);
      }

      return { filePath, isSensitive };
    } catch (e) {
      console.error('[ContextManager] Failed to save snippet', e);
      return null;
    }
  }

}

export const contextManager = new ContextManager();
