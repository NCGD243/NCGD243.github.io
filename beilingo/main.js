// ========== 全局状态 ==========
let poems = [];
let currentPoem = null;
let queue = [];
let total = 0;
let done = 0;

const app = document.getElementById('app');

// ========== 加载数据 ==========
async function loadPoems() {
    const res = await fetch('data/poems.json');
    if (!res.ok) throw new Error('加载 poems.json 失败: ' + res.status);
    poems = await res.json();
}

// ========== 主页：选诗 ==========
function renderHome() {
    currentPoem = null;
    app.innerHTML = `
    <h1>📖 背诗</h1>
    <p style="color:#888">选择一首开始练习</p>
    ${poems.map(p => `
      <button class="poem-card" data-id="${p.id}">
        <div class="title">${p.title}</div>
        <div class="meta">${p.dynasty} · ${p.author} · ${p.lines.length}句</div>
      </button>
    `).join('')}
  `;

    document.querySelectorAll('.poem-card').forEach(btn => {
        btn.onclick = () => {
            currentPoem = poems.find(p => p.id === btn.dataset.id);
            startPractice();
        };
    });
}

// ========== 开始练习某首诗 ==========
function startPractice() {
    queue = currentPoem.lines
        .map((_, i) => i)
        .filter(i => currentPoem.lines[i].next !== null);
    total = queue.length;
    done = 0;
    renderQuestion();
}

// ========== 渲染一道题 ==========
function renderQuestion() {
    if (queue.length === 0) return renderDone();

    const idx = queue[0];
    const line = currentPoem.lines[idx];

    const others = currentPoem.lines
        .filter(l => l.next && l.next !== line.next)
        .map(l => l.next);
    const options = shuffle([line.next, ...shuffle(others).slice(0, 3)]);

    app.innerHTML = `
    <button class="back" onclick="renderHome()">← 返回选诗</button>
    <div class="progress">第 ${done + 1} / ${total} 题 · 《${currentPoem.title}》</div>
    <div class="question">"${line.text}" 的下一句是？</div>
    <div id="options">
      ${options.map(o => `<button class="option" data-val="${o}">${o}</button>`).join('')}
    </div>
    <div class="explain" id="explain"></div>
  `;

    document.querySelectorAll('.option').forEach(btn => {
        btn.onclick = () => checkAnswer(btn, line);
    });
}

// ========== 判分 ==========
function checkAnswer(btn, line) {
    const chosen = btn.dataset.val;
    const correct = chosen === line.next;

    document.querySelectorAll('.option').forEach(b => {
        b.onclick = null;
        if (b.dataset.val === line.next) b.classList.add('correct');
    });

    if (correct) {
        done++;
        setTimeout(() => {
            queue.shift();
            renderQuestion();
        }, 600);
    } else {
        btn.classList.add('wrong');
        const ex = document.getElementById('explain');
        ex.style.display = 'block';
        ex.innerHTML = `
      <strong>答错了，正确答案是：${line.next}</strong><br><br>
      <b>${line.text}，${line.next}</b><br>
      意思：${line.translation}
      <br><br>
      <button class="option" id="retry" style="text-align:center">知道了，再考我一次</button>
    `;
        document.getElementById('retry').onclick = () => {
            queue.push(queue.shift());
            renderQuestion();
        };
    }
}

// ========== 完成 ==========
function renderDone() {
    app.innerHTML = `
    <div class="done">🎉 全部答对！<br>《${currentPoem.title}》</div>
    <div style="text-align:center;margin-top:24px">
      <button class="option" onclick="startPractice()">再来一遍</button>
      <button class="option" onclick="renderHome()">返回选诗</button>
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
      <p style="color:#888">如果你是本地双击打开的，请改用 WebStorm 内置服务器或 <code>python3 -m http.server</code>。</p>`;
    }
})();