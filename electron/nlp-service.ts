import * as fs from 'fs';
import { join } from 'path';

export class NLPService {
  private indexPath: string;
  private segmenter: Intl.Segmenter;
  private stopWords: Set<string>;

  constructor(basePath: string) {
    this.indexPath = join(basePath, 'tfidf_index.json');
    // 使用内置的 Intl.Segmenter 实现分词（支持中英文）
    this.segmenter = new Intl.Segmenter(['zh-CN', 'en-US'], { granularity: 'word' });
    
    // 基础的停用词表
    this.stopWords = new Set([
      // English
      "the", "and", "in", "to", "a", "of", "for", "on", "with", "as", "by", "at", "an", "be", "this", "that", "are", "or", "from", "can", "it", "is", "we", "you", "they", "i", "my", "me", "your", "he", "she", "his", "her", "how", "what", "where", "when", "why", "who", "which", "will", "would", "could", "should", "do", "does", "did", "have", "has", "had", "not", "no", "yes", "but", "if", "so", "then", "than", "there", "their", "them", "these", "those",
      // Chinese
      "的", "了", "和", "是", "就", "都", "而", "及", "与", "着", "或", "一个", "没有", "我们", "你们", "他们", "自己", "这", "那", "这里", "那里", "在", "也", "把", "被", "让", "向", "往", "从", "对", "对于", "关于", "由于", "因为", "所以", "如果", "虽然", "但是", "然而", "那么", "可是", "不过", "只是", "不仅", "而且", "并且", "不但", "反而", "甚至", "以", "或者", "还是", "与其", "不如", "宁可", "也不", "不管", "无论", "即使", "哪怕", "只要", "只有", "除非", "就是", "既然", "为了", "以便", "以免", "免得", "以致", "以至", "以及", "乃至", "直至", "可以", "怎么", "什么", "为什么", "谁", "哪个", "哪些", "怎么做", "可以"
    ]);
  }

  private getTokens(text: string): string[] {
    const segments = [...this.segmenter.segment(text)];
    return segments
      .filter(s => s.isWordLike)
      .map(s => s.segment.toLowerCase())
      // 过滤停用词、单字符、纯数字
      .filter(w => !this.stopWords.has(w) && w.length > 1 && !/^[\d\.]+$/.test(w));
  }

  private loadIndex() {
    if (fs.existsSync(this.indexPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
      } catch (e) {
        console.error('[NLPService] failed to load index', e);
      }
    }
    return { docCount: 0, df: {} };
  }

  private saveIndex(index: any) {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(index), 'utf-8');
    } catch (e) {
      console.error('[NLPService] failed to save index', e);
    }
  }

  /**
   * 提取文本中的 Top K 关键词
   */
  public extractKeywords(text: string, topK: number = 3): string[] {
    const tokens = this.getTokens(text);
    if (tokens.length === 0) return [];

    // 1. Calculate TF (Term Frequency)
    const tf: Record<string, number> = {};
    tokens.forEach(t => {
      tf[t] = (tf[t] || 0) + 1;
    });

    const index = this.loadIndex();
    
    // 2. Update global document frequency (DF)
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(t => {
      index.df[t] = (index.df[t] || 0) + 1;
    });
    index.docCount += 1;
    
    // 异步保存索引，避免阻塞主线程
    setTimeout(() => this.saveIndex(index), 0);

    // 3. Calculate TF-IDF
    const tfidf: Record<string, number> = {};
    const N = index.docCount;
    
    Object.keys(tf).forEach(t => {
      // 使用平滑的 IDF 公式: log((N + 1) / (df + 1)) + 1
      // 这样保证 IDF 总是 >= 1，TF 在语料库较小时也能发挥作用
      const idf = Math.log((N + 1) / (index.df[t] + 1)) + 1;
      tfidf[t] = tf[t] * idf;
    });

    // 4. Sort by score
    const sorted = Object.entries(tfidf)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    return sorted.slice(0, topK);
  }
}
