/* =========================================================
 *  main.js —— 入口 + 流程控制
 * ========================================================= */

/* 当前一课会话状态 */
let session = null;

/* ---------- 启动 ---------- */
window.addEventListener("DOMContentLoaded", () => {
    boot();
});

async function boot() {
    const loadingEl = document.getElementById("loading");
    const errorEl = document.getElementById("loadError");

    try {
        await loadData();
        loadState();

        if (loadingEl) loadingEl.classList.add("hidden");

        // 每次启动时清空未完成的课内进度（临时数据）
        state.currentLessonProgress = null;
        saveState();

        renderHome();
    } catch (err) {
        console.error(err);
        if (loadingEl) loadingEl.classList.add("hidden");
        if (errorEl) errorEl.classList.remove("hidden");
    }
}

/* ---------- 开始一课 ---------- */
function startLesson(lesson) {
    session = {
        lesson,
        queue: pickExercises(lesson), // 抽题
        retryQueue: [],               // 本课错题重考队列
        retryCount: {},               // 每题已重考次数
        index: 0,
        finishedCount: 0,
        total: 0                      // 由 queue.length 决定，重考会增加
    };
    session.total = session.queue.length;

    showCurrentQuestion();
}

/* ---------- 显示当前题 ---------- */
function showCurrentQuestion() {
    // 队列为空 → 本课完成
    if (session.index >= session.queue.length) {
        finishLesson();
        return;
    }

    const exercise = session.queue[session.index];
    const cur = session.index + 1;
    const total = session.queue.length;

    renderLessonShell(session.lesson, cur, total, null);
    renderQuestion(exercise, (correct) => handleAnswer(exercise, correct));
}

/* ---------- 处理答题结果 ---------- */
function handleAnswer(exercise, correct) {
    applyAnswer(exercise, correct);

    // 错题：加入重考队列（限制次数）
    if (!correct) {
        const tried = session.retryCount[exercise.id] || 0;
        if (tried < MAX_RETRY) {
            session.retryCount[exercise.id] = tried + 1;
            session.queue.push(exercise); // 插到队尾（本课末尾）
        }
    }

    session.index += 1;

    // 保存当前课内进度（简单版）
    state.currentLessonProgress = {
        lesson: session.lesson,
        index: session.index,
        total: session.queue.length
    };
    saveState();

    showCurrentQuestion();
}

/* ---------- 完成本课 ---------- */
function finishLesson() {
    const lesson = session.lesson;

    // 标记本课完成
    state.lessonCompleted[lesson - 1] = true;
    state.currentLesson = Math.min(lesson + 1, SECTION.lessonsTotal);
    state.currentLessonProgress = null;

    // 是否阶段全部完成
    const allDone = state.lessonCompleted.every(Boolean);
    if (allDone) state.sectionCompleted = true;

    saveState();

    if (allDone) {
        renderSectionFinish();
    } else {
        renderLessonFinish(lesson, renderHome);
    }
}