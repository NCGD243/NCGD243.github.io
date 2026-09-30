// 打乱数组
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 从数组里随机抽 n 个不重复（不含 exclude）
function pickRandom(arr, n, exclude = []) {
    const pool = arr.filter(x => !exclude.includes(x));
    return shuffle(pool).slice(0, n);
}

// 只保留汉字，用于判分（忽略标点、空格、大小写）
function normalize(str) {
    return (str || '').replace(/[^\u4e00-\u9fa5]/g, '');
}

// 判断用户输入是否正确
function isAnswerCorrect(input, answer) {
    return normalize(input) === normalize(answer);
}