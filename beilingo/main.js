// ========== 全局状态 ==========
let poems = [];
let currentPoem = null;
let currentLevel = 0;
let queue = [];        // 待答题目
let total = 0;
let done = 0;

const app = document.getElementById('app');
const STORAGE_KEY = 'beilingo.progress';

// ========== 进度存取 ==========
function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}
function saveProgress(p) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function isLevelPassed(poemId, level) {
    const p = loadProgress();
    return !!(p[poemId] && p[poemId]['level' + level]);
}
function markLevelPassed(poemId, level) {
    const p = loadProgress();
    if (!p[poemId]) p[poemId] = {};
    p[poemId]['level' + level] = true;
    saveProgress(p);
}

// ========== 等级解锁状态 ==========
// 返回 'done' | 'open' | 'locked'
function getLevelStatus(poem, level) {
    if (isLevelPassed(poem.id, level)) return 'done';
    if (level === 1) return 'open';
    return isLevelPassed(poem.id, level - 1) ? 'open' : 'locked';
}

// ========== 加载数据 ==========
async function loadPoems() {
    const res = await fetch('data/poems.json');
    if (!res.ok) throw new Error('加载 poems.json 失败: ' + res.status);
    poems = await res.json();
}

// ========== 主页 ==========
function renderHome() {
    currentPoem = null;
    app.innerHTML = `
    <h1>📖 背诗 · Beilingo</h1>
    <p style="color:#888">选择一首开始练习</p>
    ${poems.map(p => {
        const maxLevel = p.length === 'long' ? 4 : 3;
        const levels = [];
        for (let lv = 1; lv <= maxLevel; lv++) {
            const st = getLevelStatus(p, lv);
            levels.push(`<button class="level-btn ${st}" data-poem="${p.id}" data-level="${lv}">
          ${st === 'done' ? '✓ ' : ''}Lv${lv}
        </button>`);
        }
        return `
        <div class="poem-card">
          <div class="title">${p.title}</div>
          <div class="meta">${p.dynasty} · ${p.author} · ${p.lines.length}句 · ${p.length === 'long' ? '长诗' : '短诗'}</div>
          <div class="level-row">${levels.join('')}</div>
        </div>
      `;
    }).join('')}
  `;

    document.querySelectorAll('.level-btn').forEach(btn => {
        if (btn.classList.contains('locked')) return;
        btn.onclick = () => {
            const poem = poems.find(p => p.id === btn.dataset.poem);
            const lv = parseInt(btn.dataset.level);
            startLevel(poem, lv);
        };
    });
}

// ========== 开始某等级练习 ==========
function startLevel(poem, level) {
    currentPoem = poem;
    currentLevel = level;
    queue = generateQuestions(poem, level);

    if (queue.length === 0) {
        app.innerHTML = `
      <button class="back" onclick="renderHome()">← 返回</button>
      <p>本等级暂无题目（Level ${level} 即将上线）</p>
    `;
        return;
    }

    total = queue.length;
    done = 0;
    renderQuestion();
}

// ========== 渲染当前题 ==========
function renderQuestion() {
    if (queue.length === 0) return renderDone();

    const q = queue[0];
    let body = '';

    if (q.type === 'chooseNext' || q.type === 'choosePrev'
        || q.type === 'translationToLine' || q.type === 'coupletCard') {
        body = `
      <div class="question">${q.prompt}</div>
      <div id="options">
        ${q.options.map(o => `<button class="option" data-val="${o}">${o}</button>`).join('')}
      </div>
    `;
    } else if (q.type === 'sortLine' || q.type === 'sortPoem') {
        body = `
      <div class="question">${q.prompt}</div>
      <div class="tokens-answer" id="answerArea"></div>
      <div class="tokens-pool" id="poolArea"></div>
      <button class="btn primary" id="submitSort" style="margin-top:12px">提交</button>
    `;
    } else if (q.type === 'fillBlank') {
        body = `
      <div class="question">${q.prompt}</div>
      <input type="text" class="fill-input" id="fillInput" placeholder="输入缺失的词" autocomplete="off">
      <button class="btn primary" id="submitFill" style="margin-top:12px">提交</button>
    `;
    }

    app.innerHTML = `
    <button class="back" onclick="renderHome()">← 返回选诗</button>
    <div class="progress">第 ${done + 1} / ${total} 题 · Lv${currentLevel} · 《${currentPoem.title}》</div>
    ${body}
    <div class="explain" id="explain"></div>
  `;

    // 绑定事件
    if (q.type === 'sortLine' || q.type === 'sortPoem') {
        setupSort(q);
    } else if (q.type === 'fillBlank') {
        setupFill(q);
    } else {
        document.querySelectorAll('.option').forEach(btn => {
            btn.onclick = () => checkChoice(btn, q);
        });
    }
}

// ---------- 选择题判分 ----------
function checkChoice(btn, q) {
    const chosen = btn.dataset.val;
    const correct = chosen === q.answer;

    document.querySelectorAll('.option').forEach(b => {
        b.onclick = null;
        if (b.dataset.val === q.answer) b.classList.add('correct');
    });

    if (correct) {
        done++;
        setTimeout(() => { queue.shift(); renderQuestion(); }, 600);
    } else {
        btn.classList.add('wrong');
        showExplain(q, `正确答案：${q.answer}`);
    }
}

// ---------- 排序题 ----------
function setupSort(q) {
    const answerArea = document.getElementById('answerArea');
    const poolArea = document.getElementById('poolArea');

    // 把 tokens 渲染到 pool
    function renderPool(tokens) {
        poolArea.innerHTML = tokens.map((t, i) =>
            `<button class="token" data-idx="${i}">${t}</button>`
        ).join('');
        poolArea.querySelectorAll('.token').forEach(btn => {
            btn.onclick = () => {
                const t = btn.textContent;
                poolArea.removeChild(btn);
                addToAnswer(t);
            };
        });
    }

    function addToAnswer(t) {
        const el = document.createElement('button');
        el.className = 'token';
        el.textContent = t;
        el.onclick = () => {
            answerArea.removeChild(el);
            const btn = document.createElement('button');
            btn.className = 'token';
            btn.textContent = t;
            btn.onclick = () => {
                poolArea.removeChild(btn);
                addToAnswer(t);
            };
            poolArea.appendChild(btn);
        };
        answerArea.appendChild(el);
    }

    renderPool(q.tokens);

    document.getElementById('submitSort').onclick = () => {
        const userTokens = [...answerArea.querySelectorAll('.token')].map(e => e.textContent);
        const correct = userTokens.length === q.answerTokens.length &&
            userTokens.every((t, i) => t === q.answerTokens[i]);
        if (correct) {
            done++;
            setTimeout(() => { queue.shift(); renderQuestion(); }, 600);
            // 视觉反馈
            answerArea.style.background = '#d4f8d4';
        } else {
            answerArea.style.background = '#ffd6d6';
            showExplain(q, `正确顺序：${q.answerTokens.join('')}`);
        }
    };
}

// ---------- 填空题 ----------
function setupFill(q) {
    const input = document.getElementById('fillInput');
    input.focus();
    const submit = () => {
        const val = input.value.trim();
        if (!val) return;
        const correct = isAnswerCorrect(val, q.blankAnswer);
        if (correct) {
            done++;
            input.style.borderColor = '#4caf50';
            setTimeout(() => { queue.shift(); renderQuestion(); }, 600);
        } else {
            input.style.borderColor = '#f44336';
            input.disabled = true;
            showExplain(q, `正确答案：${q.blankAnswer}`);
        }
    };
    document.getElementById('submitFill').onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
}

// ---------- 讲解 + 重考 ----------
function showExplain(q, correctText) {
    const ex = document.getElementById('explain');
    ex.style.display = 'block';
    ex.innerHTML = `
    <strong>答错了。${correctText}</strong><br><br>
    <b>${q.explain.line}</b><br>
    ${q.explain.translation ? '意思：' + q.explain.translation : ''}
    <br><br>
    <button class="btn" id="retry">知道了，再考我一次</button>
  `;
    document.getElementById('retry').onclick = () => {
        queue.push(queue.shift());
        renderQuestion();
    };
}

// ---------- 完成 ----------
function renderDone() {
    markLevelPassed(currentPoem.id, currentLevel);
    app.innerHTML = `
    <div class="done">🎉 Lv${currentLevel} 通过！<br>《${currentPoem.title}》</div>
    <div style="margin-top:24px">
      <button class="btn primary" onclick="startLevel(currentPoem, ${currentLevel})">再来一遍</button>
      <button class="btn" onclick="renderHome()">返回选诗</button>
    </div>
  `;
}

// ========== 启动 ==========
(async function init() {
    try {
        await loadPoems();
        renderHome();
    } catch (e) {
        app.innerHTML = `<p style="color:red">加载失败：${e.message}</p>
      <p style="color:#888">本地请用服务器打开（WebStorm 内置服务器或 python3 -m http.server）。</p>`;
    }
})();