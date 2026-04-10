import { PrivacyFilter } from './electron/privacy-filter.ts';
console.log(PrivacyFilter.isSensitive('我的银行卡号是1234567812345678')); // true
console.log(PrivacyFilter.isSensitive('你好，在干嘛？')); // true
console.log(PrivacyFilter.isSensitive('export const a = 1;')); // false
