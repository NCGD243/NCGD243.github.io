export class LessonSelectView {
  constructor(root, userState, sectionId, onOpenLesson, onHome) {
    this.root = root;
    this.user = userState;
    this.sectionId = sectionId;
    this.onOpenLesson = onOpenLesson;
    this.onHome = onHome;
  }

  render() {
    const { sections, sectionLessons } = this.user.curriculum;
    const sectionIndex = sections.findIndex(section => section.id === this.sectionId);
    const section = sections[sectionIndex];
    const progress = this.user.sections[this.sectionId];
    const lessonCount = sectionLessons[this.sectionId].length;
    this.root.innerHTML = `
      <button class="text-button back-button" type="button">← 返回阶段</button>
      <header class="page-heading">
        <p class="eyebrow">阶段 ${sectionIndex + 1}</p>
        <h1>${escapeHtml(section.name)}</h1>
      </header>
      <section class="lesson-grid" aria-label="${escapeHtml(section.name)}课程">
        ${Array.from({ length: lessonCount }, (_, index) => {
          const done = progress.lessons[index].completed;
          const unlocked = done || index === 0 || progress.lessons[index - 1].completed;
          return `<button class="lesson-card ${done ? "is-complete" : unlocked ? "is-unlocked" : "is-locked"}"
            data-lesson="${index}" ${unlocked ? "" : "disabled"}>
            <span class="lesson-icon">${done ? "✓" : unlocked ? "◇" : "🔒"}</span>
            <span>第 ${index + 1} 课</span>
            <small>${done ? "已完成" : unlocked ? "开始练习" : "完成上一课解锁"}</small>
          </button>`;
        }).join("")}
      </section>
    `;
    this.root.querySelector(".back-button").addEventListener("click", this.onHome);
    this.root.querySelectorAll(".lesson-card:not(:disabled)").forEach(button => {
      button.addEventListener("click", () => this.onOpenLesson(Number(button.dataset.lesson)));
    });
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
