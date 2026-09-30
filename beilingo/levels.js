// ============================================================
// 题型生成器
// 每个函数输入一首诗，输出一个题目数组
// 题目结构：
//   选择题: { type, prompt, options[], answer, explain }
//   排序题: { type, prompt, tokens[], answerTokens[], explain }
//   填空题: { type, prompt, blankAnswer, explain }
// ============================================================

// ---------- Level 1 ----------

// 1. 看诗句选下句
function genChooseNext(poem) {
    const qs = [];
    for (let i = 0; i < poem.lines.length - 1; i++) {
        const line = poem.lines[i];
        const answer = poem.lines[i + 1].text;
        const distractors = pickRandom(
            poem.lines.map(l => l.text),
            3,
            [line.text, answer]
        );
        // 若诗太短抽不满 3 个干扰项，用其他诗的句子补（这里先跳过）
        if (distractors.length < 3) continue;
        qs.push({
            type: 'chooseNext',
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
    for (let i = 1; i < poem.lines.length; i++) {
        const line = poem.lines[i];
        const answer = poem.lines[i - 1].text;
        const distractors = pickRandom(
            poem.lines.map(l => l.text),
            3,
            [line.text, answer]
        );
        if (distractors.length < 3) continue;
        qs.push({
            type: 'choosePrev',
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
    for (const line of poem.lines) {
        if (!line.translation) continue;
        const distractors = pickRandom(
            poem.lines.map(l => l.text),
            3,
            [line.text]
        );
        if (distractors.length < 3) continue;
        qs.push({
            type: 'translationToLine',
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

// 4. 对对卡：给上句，选同联下句（偶数句为联尾）
//    联 = (0,1), (2,3), (4,5)...
function genCoupletCard(poem) {
    const qs = [];
    for (let i = 0; i < poem.lines.length - 1; i += 2) {
        const up = poem.lines[i];
        const down = poem.lines[i + 1];
        const distractors = pickRandom(
            poem.lines.filter((_, idx) => idx !== i + 1).map(l => l.text),
            3,
            [up.text, down.text]
        );
        if (distractors.length < 3) continue;
        qs.push({
            type: 'coupletCard',
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

// 5. 一句排序：打乱一句的字，点字块排回
function genSortLine(poem) {
    const qs = [];
    for (const line of poem.lines) {
        const chars = line.text.split('');
        if (chars.length < 3) continue;
        qs.push({
            type: 'sortLine',
            prompt: '把字排成正确的一句诗：',
            tokens: shuffle(chars),
            answerTokens: chars,
            explain: {
                line: line.text,
                translation: line.translation
            }
        });
    }
    return qs;
}

// ---------- Level 2 ----------

// 6. 整首诗排序
function genSortPoem(poem) {
    return [{
        type: 'sortPoem',
        prompt: `把《${poem.title}》的句子排成正确顺序：`,
        tokens: shuffle(poem.lines.map(l => l.text)),
        answerTokens: poem.lines.map(l => l.text),
        explain: {
            line: poem.lines.map(l => l.text).join('，'),
            translation: ''
        }
    }];
}

// 7. 填空：挖一个词（先按 2 字词挖，找不到就挖单字）
function genFillBlank(poem) {
    const qs = [];
    for (const line of poem.lines) {
        const text = line.text;
        if (text.length < 4) continue;
        // 简单策略：从中间位置挖 2 个字
        const start = Math.floor((text.length - 2) / 2);
        const blank = text.slice(start, start + 2);
        const masked = text.slice(0, start) + '____' + text.slice(start + 2);
        qs.push({
            type: 'fillBlank',
            prompt: `填空：${masked}`,
            blankAnswer: blank,
            explain: {
                line: text,
                translation: line.translation
            }
        });
    }
    return qs;
}

// ---------- 按等级生成题目 ----------

function generateQuestions(poem, level) {
    if (level === 1) {
        return [
            ...genChooseNext(poem),
            ...genChoosePrev(poem),
            ...genTranslationToLine(poem),
            ...genCoupletCard(poem),
            ...genSortLine(poem)
        ];
    }
    if (level === 2) {
        return [
            ...genSortPoem(poem),
            ...genFillBlank(poem)
        ];
    }
    // level 3, 4 未实现
    return [];
}