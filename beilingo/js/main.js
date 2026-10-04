import { Storage } from "./storage/Storage.js";
import { HomeView } from "./ui/HomeView.js";
import { SectionView } from "./ui/SectionView.js";
import { LessonView } from "./ui/LessonView.js";
import { POEM } from "./data/poem.js";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app application root");

const poemPanel = document.querySelector(".poem-panel");
if (!poemPanel) throw new Error("Missing .poem-panel");
poemPanel.innerHTML = `
  <p class="eyebrow">本课诗篇</p>
  <h2 id="poem-panel-title">《${escapeHtml(POEM.title)}》</h2>
  <p class="poem-panel-author">${POEM.author.map(escapeHtml).join(" · ")}</p>
  <ol class="poem-lines">
    ${POEM.couplets.map(([firstLine, secondLine], coupletIndex) => `
      <li>
        <span class="poem-panel-line" data-line-index="${coupletIndex * 2}">${escapeHtml(firstLine)}</span>，
        <span class="poem-panel-line" data-line-index="${coupletIndex * 2 + 1}">${escapeHtml(secondLine)}</span>。
      </li>
    `).join("")}
  </ol>
`;
const poemLinesElement = poemPanel.querySelector(".poem-lines");
poemLinesElement.dataset.originalMarkup = poemLinesElement.innerHTML;

const userState = Storage.load();
let currentSectionId = "s1";
let homeView = null;

function renderHome() {
  homeView?.stop();
  homeView = new HomeView(root, userState, sectionId => {
    currentSectionId = sectionId;
    renderSection();
  });
  homeView.render();
}

function renderSection() {
  homeView?.stop();
  new SectionView(root, userState, currentSectionId, lessonIndex => {
    new LessonView(root, userState, currentSectionId, lessonIndex, renderSection).render();
  }, renderHome).render();
}

renderHome();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
