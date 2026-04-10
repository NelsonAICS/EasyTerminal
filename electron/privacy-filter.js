"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyFilter = void 0;
var PrivacyFilter = /** @class */ (function () {
    function PrivacyFilter() {
    }
    /**
     * 检查文本是否包含敏感信息（财产、通讯/聊天记录、账号/密码等）。
     * 如果返回 true，则表示该文本含有敏感信息，不应作为 Context 保存。
     */
    PrivacyFilter.isSensitive = function (text) {
        if (!text)
            return false;
        // 1. 财产/金融相关 (Property & Finance)
        var financePatterns = [
            /银行卡号|信用卡|支付宝|微信支付|余额|转账|汇款|收款|付款码|订单号/i,
            /[$¥€£]\s*\d+(?:,\d{3})*(?:\.\d{2})?/, // 金额模式，如 $1000, ¥ 50.00
            /\b\d{16,19}\b/, // 疑似银行卡号 (16-19位纯数字)
            /btc|eth|usdt|钱包地址/i
        ];
        // 2. 账号/凭证相关 (Accounts & Credentials)
        var accountPatterns = [
            /密码|password|pwd|passwd|secret/i,
            /账号|用户名|username|login_id/i,
            /api[_-]?key|access[_-]?token|auth[_-]?token|bearer|jwt/i,
            /sk-[a-zA-Z0-9]{20,}/, // OpenAI 等常见的 Secret Key 格式
            /ak-[a-zA-Z0-9]{20,}/,
            /[\w.-]+@[\w.-]+\.\w+/, // 邮箱地址
            /\b1[3-9]\d{9}\b/, // 中国大陆手机号
            /\b\d{15,18}\b/ // 疑似身份证号
        ];
        // 3. 通讯/聊天记录相关 (Communications & Chats)
        var chatPatterns = [
            /聊天记录|聊天历史|chat history/i,
            /\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/, // 典型的聊天时间戳 [2023-10-12 10:00:00]
            /^\s*(?:[A-Za-z0-9_\u4e00-\u9fa5]+)\s*[:：]\s*.+$/m, // 典型的 "某人: 某句话" 格式
            /微信|QQ|WhatsApp|Telegram|钉钉/i,
            /你好|在吗|在干嘛|吃饭了吗/ // 常见的高频无意义聊天起手语
        ];
        // 验证金融模式
        for (var _i = 0, financePatterns_1 = financePatterns; _i < financePatterns_1.length; _i++) {
            var pattern = financePatterns_1[_i];
            if (pattern.test(text))
                return true;
        }
        // 验证账号凭证模式
        for (var _a = 0, accountPatterns_1 = accountPatterns; _a < accountPatterns_1.length; _a++) {
            var pattern = accountPatterns_1[_a];
            if (pattern.test(text))
                return true;
        }
        // 验证聊天通讯模式
        for (var _b = 0, chatPatterns_1 = chatPatterns; _b < chatPatterns_1.length; _b++) {
            var pattern = chatPatterns_1[_b];
            if (pattern.test(text))
                return true;
        }
        // 若文本特别短且没啥实质内容，也最好不存（比如小于5个字符且非代码）
        if (text.trim().length < 5)
            return true;
        return false;
    };
    return PrivacyFilter;
}());
exports.PrivacyFilter = PrivacyFilter;
