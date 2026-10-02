// ========== 全局状态 ==========
let poems = [];
let commonChars = [];
let currentPoem = null;
let currentLevel = 0;
let queue = [];
let total = 0;
let done = 0;

const app = document.getElementById('app');
const STORAGE_KEY = 'beilingo.progress';

// ========== 进度存取 ==========
function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
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
function getLevelStatus(poem, level) {
    if (isLevelPassed(poem.id, level)) return 'done';
    if (level === 1) return 'open';
    return isLevelPassed(poem.id, level - 1) ? 'open' : 'locked';
}

// ========== 加载数据 ==========
async function loadData() {
    const [poemsRes, charsRes] = await Promise.all([
        fetch('data/poems.json'),
        fetch('data/common_chars.txt')
    ]);
    if (!poemsRes.ok) throw new Error('poems.json 加载失败: ' + poemsRes.status);
    if (!charsRes.ok) throw new Error('common_chars.txt 加载失败: ' + charsRes.status);
    poems = await poemsRes.json();
    const txt = await charsRes.text();
    commonChars = [...new Set(txt.replace(/\s/g, '').split(''))];
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
            startLevel(poem, parseInt(btn.dataset.level));
        };
    });
}

// ========== 开始某等级 ==========
function startLevel(poem, level) {
    currentPoem = poem;
    currentLevel = level;
    queue = generateQuestions(poem, level, commonChars);

    if (queue.length === 0) {
        app.innerHTML = `
      <button class="back" onclick="renderHome()">← 返回</button>
      <p>Lv${level} 即将上线</p>
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

    if (q.type === 'choice') {
        body = `
      <div class="question">${q.prompt}</div>
      <div id="options">
        ${q.options.map(o => `<button class="option" data-val="${o}">${o}</button>`).join('')}
      </div>
    `;
    } else if (q.type === 'pickFill') {
        body = `
    <div class="question">${q.prompt}</div>
    ${q.hint ? `<div class="hint">${q.hint}</div>` : ''}
    <div class="answer-area" id="answerArea"></div>
    <div class="pool-area" id="poolArea"></div>
    <button class="btn primary" id="submitPick" style="margin-top:12px">提交</button>
  `;
    } else if (q.type === 'sortPoem') {
        body = `
      <div class="question">${q.prompt}</div>
      <div class="answer-area" id="answerArea"></div>
      <div class="pool-area" id="poolArea"></div>
      <button class="btn primary" id="submitSort" style="margin-top:12px">提交</button>
    `;
    }

    app.innerHTML = `
    <button class="back" onclick="renderHome()">← 返回选诗</button>
    <div class="progress">第 ${done + 1} / ${total} 题 · Lv${currentLevel} · 《${currentPoem.title}》</div>
    ${body}
    <div class="explain" id="explain"></div>
  `;

    if (q.type === 'choice') {
        document.querySelectorAll('.option').forEach(btn => {
            btn.onclick = () => checkChoice(btn, q);
        });
    } else if (q.type === 'pickFill') {
        setupPickFill(q);
    } else if (q.type === 'sortPoem') {
        setupSortPoem(q);
    }
}

// ---------- 选择题 ----------
function checkChoice(btn, q) {
    const correct = btn.dataset.val === q.answer;
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

// ---------- 点选填空（pickFill） ----------
function setupPickFill(q) {
    const answerArea = document.getElementById('answerArea');
    const poolArea = document.getElementById('poolArea');
    const need = q.answerChars.length;

    // 渲染答案区占位
    function renderAnswerPlaceholder() {
        answerArea.innerHTML = '';
        for (let i = 0; i < need; i++) {
            const slot = document.createElement('div');
            slot.className = 'token';
            slot.style.borderStyle = 'dashed';
            slot.style.color = '#ccc';
            slot.textContent = '＿';
            slot.dataset.slot = i;
            slot.dataset.filled = '';
            answerArea.appendChild(slot);
        }
    }

    // 填字到答案区
    function fillChar(ch) {
        const slot = [...answerArea.querySelectorAll('.token')]
            .find(s => !s.dataset.filled);
        if (!slot) return false;
        slot.textContent = ch;
        slot.dataset.filled = ch;
        slot.style.borderStyle = 'solid';
        slot.style.color = '#222';
        return true;
    }

    // 点答案区的字，退回字库
    function bindSlotClick(slot) {
        slot.onclick = () => {
            if (!slot.dataset.filled) return;
            const ch = slot.dataset.filled;
            slot.dataset.filled = '';
            slot.textContent = '＿';
            slot.style.borderStyle = 'dashed';
            slot.style.color = '#ccc';
            // 恢复字库中的该字按钮
            const poolBtn = [...poolArea.querySelectorAll('.token')]
                .find(b => b.dataset.char === ch && b.disabled);
            if (poolBtn) poolBtn.disabled = false;
        };
    }

    // 渲染字库
    function renderPool() {
        poolArea.innerHTML = '';
        q.pool.forEach(ch => {
            const btn = document.createElement('button');
            btn.className = 'token';
            btn.textContent = ch;
            btn.dataset.char = ch;
            btn.onclick = () => {
                if (btn.disabled) return;
                if (fillChar(ch)) btn.disabled = true;
            };
            poolArea.appendChild(btn);
        });
    }

    renderAnswerPlaceholder();
    answerArea.querySelectorAll('.token').forEach(bindSlotClick);
    renderPool();

    document.getElementById('submitPick').onclick = () => {
        const userChars = [...answerArea.querySelectorAll('.token')].map(s => s.dataset.filled || '');
        const correct = userChars.every((c, i) => c === q.answerChars[i]);
        if (correct) {
            done++;
            answerArea.style.background = '#d4f8d4';
            setTimeout(() => { queue.shift(); renderQuestion(); }, 600);
        } else {
            answerArea.style.background = '#ffd6d6';
            showExplain(q, `正确顺序：${q.answerChars.join('')}`);
        }
    };
}

// ---------- 整诗排序（sortPoem，句块） ----------
function setupSortPoem(q) {
    const answerArea = document.getElementById('answerArea');
    const poolArea = document.getElementById('poolArea');

    function renderPool() {
        poolArea.innerHTML = '';
        q.lines.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'line-token';
            btn.textContent = text;
            btn.onclick = () => {
                poolArea.removeChild(btn);
                const el = document.createElement('button');
                el.className = 'line-token';
                el.textContent = text;
                el.onclick = () => {
                    answerArea.removeChild(el);
                    // 放回 pool
                    const back = document.createElement('button');
                    back.className = 'line-token';
                    back.textContent = text;
                    back.onclick = () => { poolArea.removeChild(back); answerArea.appendChild(el); el.onclick = arguments.callee; };
                    poolArea.appendChild(back);
                };
                answerArea.appendChild(el);
            };
            poolArea.appendChild(btn);
        });
    }

    renderPool();

    document.getElementById('submitSort').onclick = () => {
        const userLines = [...answerArea.querySelectorAll('.line-token')].map(e => e.textContent);
        const correct = userLines.length === q.answerLines.length &&
            userLines.every((t, i) => t === q.answerLines[i]);
        if (correct) {
            done++;
            answerArea.style.background = '#d4f8d4';
            setTimeout(() => { queue.shift(); renderQuestion(); }, 600);
        } else {
            answerArea.style.background = '#ffd6d6';
            showExplain(q, `正确顺序：${q.answerLines.join('，')}`);
        }
    };
}

// ---------- 讲解 ----------
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
        await loadData();
        renderHome();
    } catch (e) {
        app.innerHTML = `<p style="color:red">加载失败：${e.message}</p>
      <p style="color:#888">本地请用服务器打开。</p>`;
    }
})();