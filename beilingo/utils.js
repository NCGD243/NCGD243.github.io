// ========== 基础工具 ==========

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom(arr, n, exclude = []) {
    const pool = arr.filter(x => !exclude.includes(x));
    return shuffle(pool).slice(0, n);
}

function normalize(str) {
    return (str || '').replace(/[^\u4e00-\u9fa5]/g, '');
}

function isAnswerCorrect(input, answer) {
    return normalize(input) === normalize(answer);
}

// ========== 拼音排序（带兜底） ==========
const pinyinCollator = (() => {
    try {
        const c = new Intl.Collator('zh-Hans-u-co-pinyin');
        // 测试是否真的按拼音（"阿" a 应排在 "波" b 前）
        if (c.compare('阿', '波') < 0) return c;
        return null;
    } catch {
        return null;
    }
})();

function sortCharsPinyin(arr) {
    if (pinyinCollator) return [...arr].sort(pinyinCollator.compare);
    return [...arr].sort(); // Unicode 兜底
}

// ========== 生成点选字库 ==========
// answerChars: 答案字数组（含顺序，可重复），如 ['明','月']
// commonChars: 常用字数组（干扰字来源）
// 返回：拼音排序后的字库（含答案字 + 干扰字）
function buildCharPool(answerChars, commonChars) {
    const size = Math.max(answerChars.length * 2, 20);
    const pool = [...answerChars];

    // 从常用字随机抽，跳过已在 pool 里的（简单去重，但保留答案字的重复）
    const used = new Set(answerChars);
    const shuffled = shuffle(commonChars);
    for (const ch of shuffled) {
        if (pool.length >= size) break;
        if (used.has(ch)) continue;
        pool.push(ch);
        used.add(ch);
    }

    return sortCharsPinyin(pool);
}