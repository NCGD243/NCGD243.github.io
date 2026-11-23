import { POEMS, loadPoem } from "../data/poem.js";

export class HomeView {
  constructor(root, onSelectPoem) {
    this.root = root;
    this.onSelectPoem = onSelectPoem;
    this.poemInfoRequests = new Map();
  }

  render() {
    this.root.innerHTML = `
      <header class="site-header">
        <p class="eyebrow">古诗背诵练习</p>
        <h1>选择一首诗</h1>
        <p class="home-intro">选一首诗，开始分阶段学习与练习。</p>
      </header>
      <section class="poem-grid" aria-label="可学习的诗篇">
        ${POEMS.length ? POEMS.map(({ level, name }) => `
          <button class="poem-card" type="button" data-level="${escapeHtml(level)}"
            data-poem="${escapeHtml(name)}" aria-label="${escapeHtml(name)}">
            <span class="poem-card-level">${escapeHtml(level)}</span>
            <span class="poem-card-title">《${escapeHtml(name)}》</span>
            <span class="poem-card-action">开始学习 →</span>
            <span class="poem-card-info" aria-live="polite">悬停查看诗歌信息</span>
          </button>
        `).join("") : `<p class="home-empty">还没有可学习的诗篇。</p>`}
      </section>
      <p class="home-load-status" role="status" aria-live="polite"></p>
    `;
    this.root.querySelectorAll(".poem-card").forEach(button => {
      const poemEntry = { level: button.dataset.level, name: button.dataset.poem };
      button.addEventListener("pointerenter", () => this.loadPoemInfo(button, poemEntry));
      button.addEventListener("focus", () => this.loadPoemInfo(button, poemEntry));
      button.addEventListener("click", () => this.selectPoem(button, poemEntry));
    });
  }

  loadPoemInfo(card, poemEntry) {
    const cacheKey = JSON.stringify([poemEntry.level, poemEntry.name]);
    if (this.poemInfoRequests.has(cacheKey)) return;
    const info = card.querySelector(".poem-card-info");
    info.textContent = "正在读取诗歌信息…";
    const request = loadPoem(poemEntry).then(poem => {
      info.replaceChildren();
      const author = document.createElement("span");
      author.className = "poem-card-author";
      author.textContent = poem.author.join(" · ");
      const lines = document.createElement("span");
      lines.className = "poem-card-lines";
      lines.textContent = poem.couplets.map(couplet => couplet.join("，")).join("。");
      info.append(author, lines);
    }).catch(error => {
      console.error(`读取《${poemEntry.name}》信息失败。`, error);
      info.textContent = "诗歌信息读取失败";
      this.poemInfoRequests.delete(cacheKey);
    });
    this.poemInfoRequests.set(cacheKey, request);
  }

  selectPoem(card, poemEntry) {
    this.root.querySelectorAll(".poem-card").forEach(item => {
      item.disabled = true;
    });
    const status = this.root.querySelector(".home-load-status");
    status.textContent = `正在加载《${poemEntry.name}》…`;
    Promise.resolve(this.onSelectPoem(poemEntry)).catch(error => {
      console.error(`加载《${poemEntry.name}》失败。`, error);
      status.textContent = `加载《${poemEntry.name}》失败，请检查文件后重试。`;
      this.root.querySelectorAll(".poem-card").forEach(item => {
        item.disabled = false;
      });
      card.focus();
    });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
