const stopWords = new Set(["的", "了", "和", "是", "就", "都", "而", "及", "与", "着", "或", "一个", "没有", "我们", "你们", "他们", "自己", "这", "那", "这儿", "那儿", "这里", "那里", "it", "is", "the", "and", "in", "to", "a", "of", "for", "on", "with", "as", "by", "at", "an", "be", "this", "that", "are", "or", "from", "can"]);
const segmenter = new Intl.Segmenter(['zh-CN', 'en-US'], { granularity: 'word' });

function getTokens(text) {
    const segments = [...segmenter.segment(text)].filter(s => s.isWordLike).map(s => s.segment.toLowerCase());
    return segments.filter(w => !stopWords.has(w) && w.length > 1);
}

console.log(getTokens("你好，这是一个纯本地的TF-IDF测试！Agent真好用。"));
