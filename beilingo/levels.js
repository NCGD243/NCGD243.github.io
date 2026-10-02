// ============================================================
// levels.js — 题型生成器
// ============================================================
// 题目结构（三种）：
//
// 1. 选择题
//    { type: 'choice', prompt, options[], answer, explain }
//
// 2. 点选填空（一句 / 一联）
//    { type: 'pickFill', prompt, answerChars[], pool[], explain }
//    - answerChars: 正确字序（数组，含重复）
//    - pool: 字库（拼音排序，含答案字 + 干扰字）
//
// 3. 整诗排序（句块）
//    { type: 'sortPoem', prompt, lines[], answerLines[], explain }
//
// 依赖 utils.js 里的：shuffle / pickRandom / buildCharPool
// ============================================================

// ------------------------------------------------------------
// Level 1
// ------------------------------------------------------------

// 1. 看诗句选下句
function genChooseNext(poem) {
    const qs = [];
    const allTexts = poem.lines.map(l => l.text);
    for (let i = 0; i < poem.lines.length - 1; i++) {
        const line = poem.lines[i];
        const answer = poem.lines[i + 1].text;
        const distractors = pickRandom(allTexts, 3, [line.text, answer]);
        if (distractors.length < 3) continue;
        qs.push({
            type: 'choice',
            prompt: `"${line.text}" 的下一句是？`,
            options: shuffle([answer, ...distractors]),
            answer,
            explain: {
                line: `${line.text}，${answer}`,
                translation: line.translation
            }
        });
    }
    return qs;
}

// 2. 看诗句选上句
function genChoosePrev(poem) {
    const qs = [];
    const allTexts = poem.lines.map(l => l.text);
    for (let i = 1; i < poem.lines.length; i++) {
        const line = poem.lines[i];
        const answer = poem.lines[i - 1].text;
        const distractors = pickRandom(allTexts, 3, [line.text, answer]);
        if (distractors.length < 3) continue;
        qs.push({
            type: 'choice',
            prompt: `"${line.text}" 的上一句是？`,
            options: shuffle([answer, ...distractors]),
            answer,
            explain: {
                line: `${answer}，${line.text}`,
                translation: line.translation
            }
        });
    }
    return qs;
}

// 3. 看译文选原句
function genTranslationToLine(poem) {
    const qs = [];
    const allTexts = poem.lines.map(l => l.text);
    for (const line of poem.lines) {
        if (!line.translation) continue;
        const distractors = pickRandom(allTexts, 3, [line.text]);
        if (distractors.length < 3) continue;
        qs.push({
            type: 'choice',
            prompt: `"${line.translation}" 对应哪一句？`,
            options: shuffle([line.text, ...distractors]),
            answer: line.text,
            explain: {
                line: line.text,
                translation: line.translation
            }
        });
    }
    return qs;
}

// 4. 对对卡：给上句，选同联下句
//    联 = (0,1), (2,3), (4,5) ...
function genCoupletCard(poem) {
    const qs = [];
    const allTexts = poem.lines.map(l => l.text);
    for (let i = 0; i < poem.lines.length - 1; i += 2) {
        const up = poem.lines[i];
        const down = poem.lines[i + 1];
        const distractors = pickRandom(allTexts, 3, [up.text, down.text]);
        if (distractors.length < 3) continue;
        qs.push({
            type: 'choice',
            prompt: `对对卡：「${up.text}」的同联下句是？`,
            options: shuffle([down.text, ...distractors]),
            answer: down.text,
            explain: {
                line: `${up.text}，${down.text}`,
                translation: up.translation
            }
        });
    }
    return qs;
}

// 5. 一句填空：整句挖空，从字库点选拼回
function genOneLineFill(poem, commonChars) {
    const qs = [];
    for (const line of poem.lines) {
        const chars = line.text.split('');
        if (chars.length < 3) continue;
        qs.push({
            type: 'pickFill',
            prompt: '把这一句拼回：',
            answerChars: chars,
            pool: buildCharPool(chars, commonChars),
            explain: {
                line: line.text,
                translation: line.translation
            }
        });
    }
    return qs;
}

// ------------------------------------------------------------
// Level 2
// ------------------------------------------------------------

// 6. 整诗排序（句块，点选）
function genSortPoem(poem) {
    const answerLines = poem.lines.map(l => l.text);
    return [{
        type: 'sortPoem',
        prompt: `把《${poem.title}》的句子排成正确顺序：`,
        lines: shuffle(answerLines),   // 初始打乱
        answerLines,
        explain: {
            line: answerLines.join('，'),
            translation: ''
        }
    }];
}

// 7. 一联填空：上下两句全挖，从字库点选拼回
//    联 = (0,1), (2,3), (4,5) ...
// 7. 一联填空：上下两句全挖，从字库点选拼回
//    联 = (0,1), (2,3), (4,5) ...
//    给出相邻句作为上下文提示（第一联给下一句，其余给上一句）
function genCoupletFill(poem, commonChars) {
    const qs = [];
    for (let i = 0; i < poem.lines.length - 1; i += 2) {
        const up = poem.lines[i].text;
        const down = poem.lines[i + 1].text;
        const chars = (up + down).split('');
        if (chars.length < 4) continue;

        // 上下文提示
        let hint = '';
        if (i > 0) {
            hint = `上一句：「${poem.lines[i - 1].text}」`;
        } else if (i + 2 < poem.lines.length) {
            hint = `下一句：「${poem.lines[i + 2].text}」`;
        }

        qs.push({
            type: 'pickFill',
            prompt: '把这一联拼回（上下两句）：',
            hint,
            answerChars: chars,
            pool: buildCharPool(chars, commonChars),
            explain: {
                line: `${up}，${down}`,
                translation: poem.lines[i].translation
            }
        });
    }
    return qs;
}

// ------------------------------------------------------------
// 按等级生成题目
// ------------------------------------------------------------
function generateQuestions(poem, level, commonChars) {
    if (level === 1) {
        return [
            ...genChooseNext(poem),
            ...genChoosePrev(poem),
            ...genTranslationToLine(poem),
            ...genCoupletCard(poem),
            ...genOneLineFill(poem, commonChars)
        ];
    }
    if (level === 2) {
        return [
            ...genSortPoem(poem),
            ...genCoupletFill(poem, commonChars)
        ];
    }
    // Level 3 / 4 未实现
    return [];
}