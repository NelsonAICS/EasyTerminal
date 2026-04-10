export class PrivacyFilter {
  /**
   * 检查文本是否包含敏感信息（财产、账号/密码等）。
   * 如果返回 true，则表示该文本含有敏感信息，不应作为 Context 保存。
   */
  public static isSensitive(text: string): boolean {
    if (!text) return false;

    // 1. 财产/金融相关 (Property & Finance)
    const financePatterns = [
      /银行卡号|信用卡|支付宝|微信支付|余额|转账|汇款|收款|付款码|订单号/i,
      /[$¥€£]\s*\d+(?:,\d{3})*(?:\.\d{2})?/, // 金额模式，如 $1000, ¥ 50.00
      /\b\d{16,19}\b/, // 疑似银行卡号 (16-19位纯数字)
      /btc|eth|usdt|钱包地址/i
    ];

    // 2. 账号/凭证相关 (Accounts & Credentials)
    const accountPatterns = [
      /密码|password|pwd|passwd|secret/i,
      /账号|用户名|username|login_id/i,
      /api[_-]?key|access[_-]?token|auth[_-]?token|bearer|jwt/i,
      /sk-[a-zA-Z0-9]{20,}/, // OpenAI 等常见的 Secret Key 格式
      /ak-[a-zA-Z0-9]{20,}/,
      /[\w.-]+@[\w.-]+\.\w+/, // 邮箱地址
      /\b1[3-9]\d{9}\b/, // 中国大陆手机号
      /\b\d{15,18}\b/ // 疑似身份证号
    ];

    // 验证金融模式
    for (const pattern of financePatterns) {
      if (pattern.test(text)) return true;
    }

    // 验证账号凭证模式
    for (const pattern of accountPatterns) {
      if (pattern.test(text)) return true;
    }

    // 若文本特别短且没啥实质内容，也最好不存（比如小于5个字符且非代码）
    if (text.trim().length < 5) return true;

    return false;
  }
}
