/* =========================================================
 *  ui.js —— 渲染界面 + 题型交互
 * ========================================================= */

const appEl = document.getElementById("app");
const quitOverlay = document.getElementById("quitOverlay");

/* ---------- 通用工具 ---------- */
function el(html) {
    const div = document.createElement("div");
    div.innerHTML = html.trim();
    return div.firstElementChild;
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/* ---------- 主界面：课次地图 ---------- */
function renderHome() {
    const lessonsHtml = [];
    for (let i = 1; i <= SECTION.lessonsTotal; i++) {
        const done = state.lessonCompleted[i - 1];
        const prevDone = i === 1 ? true : state.lessonCompleted[i - 2];
        const unlocked = done || prevDone;

        let cls = "lesson-btn";
        let icon = "";
        if (done) { cls += " done"; icon = "✓"; }
        else if (unlocked) { cls += " unlocked"; icon = "🔓"; }
        else { cls += " locked"; icon = "🔒"; }

        lessonsHtml.push(`
      <button class="${cls}" data-lesson="${i}" ${unlocked ? "" : "disabled"}>
        <span class="icon">${icon}</span>
        <span>课 ${i}</span>
      </button>
    `);
    }

    const html = `
    <div class="header">
      <h1>《${escapeHtml(POEM.title)}》</h1>
      <div class="sub">${escapeHtml(POEM.author)} · 阶段 1：${escapeHtml(SECTION.name)}</div>
    </div>
    <div class="lesson-map">${lessonsHtml.join("")}</div>
  `;

    appEl.innerHTML = "";
    appEl.appendChild(el(`<div>${html}</div>`));

    // 绑定
    appEl.querySelectorAll(".lesson-btn.unlocked, .lesson-btn.done").forEach(btn => {
        btn.addEventListener("click", () => {
            const lesson = parseInt(btn.dataset.lesson, 10);
            startLesson(lesson);
        });
    });
}

/* ---------- 答题界面 ---------- */
function renderLessonShell(lesson, progressCur, progressTotal, innerHtml) {
    const wrap = el(`
    <div class="card">
      <div class="topbar">
        <div class="lesson-info">第 ${lesson} 课 / 共 ${SECTION.lessonsTotal} 课</div>
        <button class="close-btn" id="closeBtn">✕</button>
      </div>
      <div class="progress-wrap">
        <div class="progress-text">
          <span>进度</span>
          <span>${progressCur} / ${progressTotal}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>
      <div id="questionArea"></div>
    </div>
  `);
    appEl.innerHTML = "";
    appEl.appendChild(wrap);

    // 进度条宽度
    const pct = Math.min(100, Math.round((progressCur / progressTotal) * 100));
    wrap.querySelector("#progressFill").style.width = pct + "%";

    // 关闭按钮
    wrap.querySelector("#closeBtn").addEventListener("click", () => {
        quitOverlay.classList.add("show");
    });

    // 放入题目内容
    const qArea = wrap.querySelector("#questionArea");
    qArea.innerHTML = "";
    if (innerHtml) qArea.appendChild(innerHtml);
    return qArea;
}

/* ---------- 渲染具体某一题 ---------- */
function renderQuestion(exercise, onAnswer) {
    const qArea = document.getElementById("questionArea");
    qArea.innerHTML = "";

    let content;
    switch (exercise.type) {
        case "listen":  content = buildListen(exercise);  break;
        case "rhythm":  content = buildChoice(exercise, "请选择正确的节奏划分：", true);  break;
        case "image":   content = buildChoice(exercise, "看描述，选出对应诗句：", false, exercise.prompt); break;
        case "audio":   content = buildChoice(exercise, "听音频，选出对应的诗句：", false); break;
        default:        content = buildChoice(exercise, "请选择：", false);
    }
    qArea.appendChild(content);

    // 播放按钮
    const playBtn = content.querySelector(".play-btn");
    if (playBtn) {
        playBtn.addEventListener("click", () => speakLine(exercise.line || POEM.lines[0]));
    }

    // 选项绑定
    const optionBtns = content.querySelectorAll(".option");
    optionBtns.forEach((btn, idx) => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            handleChoose(exercise, idx, optionBtns, content, onAnswer);
        });
    });

    // listen 的"我读完了"
    const doneBtn = content.querySelector("#listenDone");
    if (doneBtn) {
        doneBtn.addEventListener("click", () => {
            onAnswer(true); // 默认算对
        });
    }
}

/* ---------- 各题型 DOM 构造 ---------- */
function buildListen(exercise) {
    return el(`
    <div>
      <div class="q-hint">先听一遍，再大声跟读。</div>
      <button class="play-btn" id="playBtn">🔊 播放</button>
      <div class="q-line">${escapeHtml(exercise.line)}</div>
      <button class="primary-btn" id="listenDone">我读完了</button>
      <div class="feedback" id="feedback"></div>
    </div>
  `);
}

function buildChoice(exercise, promptText, showLine, customPrompt) {
    const head = customPrompt
        ? `<div class="q-prompt">${escapeHtml(customPrompt)}</div>`
        : `<div class="q-hint">${escapeHtml(promptText)}</div>`;

    const lineBlock = showLine
        ? `<div class="q-line">${escapeHtml(exercise.line)}</div>`
        : "";

    const opts = exercise.options.map((o, i) =>
        `<button class="option" data-idx="${i}">${escapeHtml(o)}</button>`
    ).join("");

    // 听音题要有播放按钮
    const playBlock = exercise.type === "audio"
        ? `<button class="play-btn" id="playBtn">🔊 播放音频</button>`
        : "";

    return el(`
    <div>
      ${head}
      ${playBlock}
      ${lineBlock}
      <div class="options">${opts}</div>
      <div class="feedback" id="feedback"></div>
    </div>
  `);
}

/* ---------- 选项处理（含对错反馈） ---------- */
function handleChoose(exercise, chosenIdx, optionBtns, container, onAnswer) {
    const correct = chosenIdx === exercise.answer;

    optionBtns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === exercise.answer) btn.classList.add("correct");
        else if (i === chosenIdx) btn.classList.add("wrong");
    });

    const fb = container.querySelector("#feedback");
    if (fb) {
        fb.className = "feedback show " + (correct ? "ok" : "no");
        fb.textContent = correct
            ? "✓ 正确！"
            : `✗ 答错了，正确答案是：${exercise.options[exercise.answer]}`;
    }

    // 停顿 900ms 后继续
    setTimeout(() => onAnswer(correct), correct ? 700 : 1300);
}

/* ---------- 语音合成 ---------- */
function speakLine(text) {
    if (!("speechSynthesis" in window)) {
        alert("当前浏览器不支持语音朗读");
        return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
}

/* ---------- 挽留弹窗 ---------- */
function closeQuitModal() {
    quitOverlay.classList.remove("show");
}

function abandonLesson() {
    quitOverlay.classList.remove("show");
    // 清空本课临时进度
    state.currentLessonProgress = null;
    saveState();
    renderHome();
}

/* ---------- 完成页 ---------- */
function renderLessonFinish(lesson, onNext) {
    appEl.innerHTML = "";
    const wrap = el(`
    <div class="card finish">
      <div class="big">🎉</div>
      <h2>第 ${lesson} 课完成！</h2>
      <p>休息一下，继续下一课吧～</p>
      <button class="primary-btn" id="nextBtn">返回首页</button>
    </div>
  `);
    appEl.appendChild(wrap);
    wrap.querySelector("#nextBtn").addEventListener("click", onNext);
}

function renderSectionFinish() {
    appEl.innerHTML = "";
    const wrap = el(`
    <div class="card finish">
      <div class="big">🏆</div>
      <h2>阶段 1：感知 · 全部完成！</h2>
      <p>你已经背下《${escapeHtml(POEM.title)}》啦～</p>
      <button class="primary-btn" id="backBtn">回到首页</button>
    </div>
  `);
    appEl.appendChild(wrap);
    wrap.querySelector("#backBtn").addEventListener("click", renderHome);
}