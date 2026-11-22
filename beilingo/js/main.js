import { Storage } from "./storage/Storage.js";
import { loadExercises } from "./data/exercises.js";
import { loadPoem } from "./data/poem.js";
import { HomeView } from "./ui/HomeView.js";
import { SectionView } from "./ui/SectionView.js";
import { LessonSelectView } from "./ui/LessonSelectView.js";
import { LessonView } from "./ui/LessonView.js";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app application root");
const layout = document.querySelector(".learning-layout");
if (!layout) throw new Error("Missing .learning-layout");
window.addEventListener("resize", () => {
  if (layout.classList.contains("is-poem-open")) {
    setPoemTitleWidth(document.querySelector(".poem-panel"));
  }
});

let currentSectionId = "s1";
let userState = null;
let activeLessonView = null;

function renderHome() {
  activeLessonView = null;
  document.body.classList.remove("is-fixed-view");
  document.body.classList.remove("is-lesson");
  layout.classList.add("is-home");
  layout.classList.remove("is-lesson", "is-poem-open");
  new HomeView(root, renderPoemSections).render();
}

async function renderPoemSections(poemEntry) {
  const [poem, curriculum] = await Promise.all([
    loadPoem(poemEntry),
    loadExercises(poemEntry)
  ]);
  userState = Storage.load(poem, curriculum);
  currentSectionId = "s1";
  document.body.classList.add("is-fixed-view");
  layout.classList.remove("is-home");
  renderPoemPanel(poem);
  renderSectionDashboard();
}

function renderSectionDashboard() {
  new SectionView(root, userState, sectionId => {
    currentSectionId = sectionId;
    renderLessons();
  }, renderHome).render();
}

function renderLessons() {
  new LessonSelectView(root, userState, currentSectionId, lessonIndex => {
    activeLessonView = new LessonView(root, userState, currentSectionId, lessonIndex, () => {
      activeLessonView = null;
      renderLessons();
    });
    activeLessonView.render();
  }, renderSectionDashboard).render();
}

function renderPoemPanel(poem) {
  const poemPanel = document.querySelector(".poem-panel");
  if (!poemPanel) throw new Error("Missing .poem-panel");
  poemPanel.innerHTML = `
    <button class="text-button poem-home-button" type="button">← 返回选诗</button>
    <button class="poem-panel-close" type="button" aria-label="关闭诗歌面板">×</button>
    <div class="poem-panel-content">
      <p class="eyebrow">本课诗篇</p>
      <h2 id="poem-panel-title">${escapeHtml(poem.title)}</h2>
      <p class="poem-panel-author">${poem.author.map(escapeHtml).join(" · ")}</p>
      <ol class="poem-lines">
        ${poem.couplets.map(([firstLine, secondLine], coupletIndex) => `
          <li>
            <span class="poem-panel-line" data-line-index="${coupletIndex * 2}">${escapeHtml(firstLine)}</span>，
            <span class="poem-panel-line" data-line-index="${coupletIndex * 2 + 1}">${escapeHtml(secondLine)}</span>。
          </li>
        `).join("")}
      </ol>
    </div>
  `;
  const poemLinesElement = poemPanel.querySelector(".poem-lines");
  poemLinesElement.dataset.originalMarkup = poemLinesElement.innerHTML;
  setPoemTitleWidth(poemPanel);
  poemPanel.querySelector(".poem-panel-close").addEventListener("click", () => {
    layout.classList.remove("is-poem-open");
  });
  poemPanel.querySelector(".poem-home-button").addEventListener("click", () => {
    if (activeLessonView?.active) {
      activeLessonView.showQuitDialog(renderHome);
      return;
    }
    renderHome();
  });
}

function setPoemTitleWidth(poemPanel) {
  if (!poemPanel) return;
  const poemTitle = poemPanel.querySelector("#poem-panel-title");
  if (!poemTitle) return;
  const widestCouplet = [...poemPanel.querySelectorAll(".poem-lines li")]
    .reduce((widest, couplet) => {
      const range = document.createRange();
      range.selectNodeContents(couplet);
      return Math.max(widest, range.getBoundingClientRect().width);
    }, 0);
  if (widestCouplet > 0) {
    poemTitle.style.maxWidth = `${Math.ceil(widestCouplet)}px`;
  }
}

renderHome();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
