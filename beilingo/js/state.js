/* =========================================================
 *  state.js —— 全局状态 + localStorage 存档
 * ========================================================= */

let state = null; // 由 loadState() 初始化

/**
 * 创建全新的初始状态
 */
function createFreshState() {
    const knowledgeStates = {};
    ALL_KNOWLEDGE.forEach(k => {
        knowledgeStates[k] = {
            knowledge: k,
            step: 0,
            due_at: 3,           // 全局题次
            lastResult: null
        };
    });

    const exerciseStats = {};
    EXERCISES.forEach(e => {
        exerciseStats[e.id] = {
            exerciseId: e.id,
            appearances: 0,
            lastResult: null,
            wrongFlag: false
        };
    });

    return {
        globalCounter: 0,
        currentLesson: 1,
        lessonCompleted: [false, false, false, false, false, false],
        sectionCompleted: false,
        knowledgeStates,
        exerciseStats,
        currentLessonProgress: null // 中途退出用
    };
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
        console.warn("保存失败", err);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            state = createFreshState();
            return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed.knowledgeStates || !parsed.exerciseStats) {
            state = createFreshState();
            return;
        }
        state = parsed;
        // 补齐字段
        if (!Array.isArray(state.lessonCompleted) ||
            state.lessonCompleted.length !== 6) {
            state.lessonCompleted = [false,false,false,false,false,false];
        }
        if (typeof state.globalCounter !== "number") state.globalCounter = 0;
        if (typeof state.currentLesson !== "number") state.currentLesson = 1;
        state.sectionCompleted = !!state.sectionCompleted;

        // 补齐可能新增的知识点
        ALL_KNOWLEDGE.forEach(k => {
            if (!state.knowledgeStates[k]) {
                state.knowledgeStates[k] = {
                    knowledge: k, step: 0, due_at: 3, lastResult: null
                };
            }
        });
        // 补齐可能新增的题
        EXERCISES.forEach(e => {
            if (!state.exerciseStats[e.id]) {
                state.exerciseStats[e.id] = {
                    exerciseId: e.id, appearances: 0, lastResult: null, wrongFlag: false
                };
            }
        });
    } catch (err) {
        console.warn("读取失败", err);
        state = createFreshState();
    }
}

/**
 * 重置全部进度（调试用，或在设置里加按钮）
 */
function resetAllState() {
    state = createFreshState();
    saveState();
}