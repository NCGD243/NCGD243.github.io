/* =========================================================
 *  algorithm.js —— 抽题算法 + 答题后的状态更新
 * ========================================================= */

/* ---------- 工具 ---------- */
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* ---------- 计分 ---------- */

/**
 * 计算一道题的综合得分（第 2 课起使用）
 *
 * score = 0.30 薄弱度 + 0.25 到期度 + 0.20 未覆盖率
 *       + 0.15 错题惩罚 - 0.10 已掌握惩罚 + 0.05 随机扰动
 */
function computeScore(exercise) {
    const S = state.knowledgeStates[exercise.knowledge];
    const st = state.exerciseStats[exercise.id];

    const maxApp = Math.max(
        1,
        ...EXERCISES.map(e => state.exerciseStats[e.id].appearances)
    );

    // 薄弱度：step 越低越薄弱
    const weak = 1 - S.step / MAX_STEP;

    // 到期度
    let due = 0;
    if (S.due_at <= state.globalCounter) {
        due = Math.min((state.globalCounter - S.due_at) / 20, 1);
    }

    // 未覆盖率
    const uncover = 1 - st.appearances / maxApp;

    // 错题惩罚
    const wrong = st.wrongFlag ? 1 : 0;

    // 已掌握惩罚
    const mastered = S.step >= 5 ? (S.step - 4) / 2 : 0;

    // 随机扰动
    const noise = Math.random() * 0.05;

    return 0.30 * weak
        + 0.25 * due
        + 0.20 * uncover
        + 0.15 * wrong
        - 0.10 * mastered
        + noise;
}

/* ---------- 抽题 ---------- */

/**
 * 第一课：随机 + 覆盖
 * 每个知识点抽 2–3 题，保证 4 个知识点都覆盖，共 10 题
 */
function pickExercisesForLesson1() {
    const byK = {};
    ALL_KNOWLEDGE.forEach(k => {
        byK[k] = EXERCISES.filter(e => e.knowledge === k);
    });

    // 4 个知识点，2+2+3+3 = 10
    const counts = shuffle([2, 2, 3, 3]);
    const picked = [];

    ALL_KNOWLEDGE.forEach((k, i) => {
        const pool = shuffle(byK[k]);
        for (let j = 0; j < counts[i] && j < pool.length; j++) {
            picked.push(pool[j]);
        }
    });

    // 不足 10 题 → 从剩余补足
    const rest = shuffle(EXERCISES.filter(e => !picked.includes(e)));
    while (picked.length < SECTION.exercisesPerLesson && rest.length) {
        picked.push(rest.shift());
    }

    return sortByTypeDifficulty(picked);
}

/**
 * 第二课起：分层配额抽题
 *
 * 1. 错题必出：最多 4 题（wrongFlag = true）
 * 2. 到期复习：最多 3 题（due_at <= globalCounter）
 * 3. 薄弱高分：最多 2 题（按 score 降序）
 * 4. 未覆盖补足：至少 1 题（appearances 最少的）
 * 5. 去重后不足 10 题 → 从剩余按 score 补足
 * 6. 最后按三段排序：热身(2) + 主战场(6) + 收尾(2)
 */
function pickExercisesForLessonN() {
    const N = SECTION.exercisesPerLesson;
    const picked = [];
    const pickedIds = new Set();

    const tryAdd = (e) => {
        if (!e) return false;
        if (pickedIds.has(e.id)) return false;
        pickedIds.add(e.id);
        picked.push(e);
        return true;
    };

    // 1. 错题必出（最多 4 题）
    const wrongs = EXERCISES.filter(e => state.exerciseStats[e.id].wrongFlag);
    shuffle(wrongs).slice(0, 4).forEach(tryAdd);

    // 2. 到期复习（最多 3 题）
    if (picked.length < N) {
        const dueList = EXERCISES.filter(e => {
            if (pickedIds.has(e.id)) return false;
            const S = state.knowledgeStates[e.knowledge];
            return S.due_at <= state.globalCounter;
        });
        shuffle(dueList).slice(0, 3).forEach(tryAdd);
    }

    // 3. 薄弱高分（最多 2 题）
    if (picked.length < N) {
        const candidates = EXERCISES
            .filter(e => !pickedIds.has(e.id))
            .map(e => ({ e, s: computeScore(e) }))
            .sort((a, b) => b.s - a.s);
        candidates.slice(0, 2).forEach(({ e }) => tryAdd(e));
    }

    // 4. 未覆盖补足（至少 1 题）
    if (picked.length < N) {
        const least = EXERCISES
            .filter(e => !pickedIds.has(e.id))
            .sort((a, b) =>
                state.exerciseStats[a.id].appearances -
                state.exerciseStats[b.id].appearances
            );
        if (least.length) tryAdd(least[0]);
    }

    // 5. 按 score 补足到 10 题
    if (picked.length < N) {
        const rest = EXERCISES
            .filter(e => !pickedIds.has(e.id))
            .map(e => ({ e, s: computeScore(e) }))
            .sort((a, b) => b.s - a.s);
        while (picked.length < N && rest.length) {
            tryAdd(rest.shift().e);
        }
    }

    // 6. 三段排序
    return arrangeLessonOrder(picked);
}

/**
 * 第一课题型排序：listen → rhythm → image → audio
 */
function sortByTypeDifficulty(list) {
    return list.slice().sort((a, b) => {
        const ta = TYPE_ORDER[a.type] ?? 99;
        const tb = TYPE_ORDER[b.type] ?? 99;
        return ta - tb;
    });
}

/**
 * 第 2 课起三段排序：热身(2) + 主战场(6) + 收尾(2)
 * - 热身：step 高的
 * - 主战场：错题、到期、薄弱
 * - 收尾：appearances 最少的
 */
function arrangeLessonOrder(list) {
    const N = SECTION.exercisesPerLesson;

    // 按 step 降序 → 热身候选
    const byStepDesc = list.slice().sort((a, b) => {
        const sa = state.knowledgeStates[a.knowledge].step;
        const sb = state.knowledgeStates[b.knowledge].step;
        return sb - sa;
    });
    const warm = byStepDesc.slice(0, 2);

    // 主战场：错题 → 到期 → score 高的
    const used = new Set(warm.map(e => e.id));
    const mid = [];

    const wrongs = list.filter(e => !used.has(e.id) && state.exerciseStats[e.id].wrongFlag);
    wrongs.forEach(e => { if (mid.length < 6) { mid.push(e); used.add(e.id); } });

    if (mid.length < 6) {
        const dues = list.filter(e => {
            if (used.has(e.id)) return false;
            return state.knowledgeStates[e.knowledge].due_at <= state.globalCounter;
        });
        dues.forEach(e => { if (mid.length < 6) { mid.push(e); used.add(e.id); } });
    }

    if (mid.length < 6) {
        const scored = list
            .filter(e => !used.has(e.id))
            .map(e => ({ e, s: computeScore(e) }))
            .sort((a, b) => b.s - a.s);
        scored.forEach(({ e }) => { if (mid.length < 6) { mid.push(e); used.add(e.id); } });
    }

    // 收尾：appearances 最少的
    const tail = list
        .filter(e => !used.has(e.id))
        .sort((a, b) =>
            state.exerciseStats[a.id].appearances -
            state.exerciseStats[b.id].appearances
        )
        .slice(0, N - warm.length - mid.length);

    return [...warm, ...mid, ...tail];
}

/**
 * 统一入口
 */
function pickExercises(lesson) {
    if (lesson === 1) return pickExercisesForLesson1();
    return pickExercisesForLessonN();
}

/* ---------- 答题后的状态更新 ---------- */

/**
 * 判断某知识点的间隔是否到期
 */
function isDue(S) {
    return S.due_at <= state.globalCounter;
}

/**
 * 处理一次答题
 * @param {Object} exercise 当前题
 * @param {boolean} correct 是否正确
 */
function applyAnswer(exercise, correct) {
    state.globalCounter += 1;

    const S = state.knowledgeStates[exercise.knowledge];
    const st = state.exerciseStats[exercise.id];

    if (correct) {
        // 只有"到期复习"出现且答对，才升级 step
        if (isDue(S)) {
            S.step = Math.min(S.step + 1, MAX_STEP);
            S.due_at = state.globalCounter + INTERVAL[Math.min(S.step, INTERVAL.length - 1)];
        }
        S.lastResult = true;
        st.wrongFlag = false;
    } else {
        const severity = ERROR_SEVERITY[exercise.type] ?? 1;
        S.step = Math.max(S.step - severity, 0);
        S.due_at = state.globalCounter + INTERVAL[Math.min(S.step, INTERVAL.length - 1)];
        S.lastResult = false;
        st.wrongFlag = true;
    }

    st.appearances += 1;
    st.lastResult = correct;
}