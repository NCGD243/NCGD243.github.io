import { SectionUnlocker } from "../core/SectionUnlocker.js";

export class SectionView {
  constructor(root, userState, onOpenSection, onHome) {
    this.root = root;
    this.user = userState;
    this.onOpenSection = onOpenSection;
    this.onHome = onHome;
  }

  render() {
    const { sections, sectionLessons, sectionExercises } = this.user.curriculum;
    const unlocker = new SectionUnlocker(this.user);
    this.root.innerHTML = `
        <section class="section-grid" aria-label="学习阶段">
          ${sections.map((section, index) => {
            const lessonCount = sectionLessons[section.id].length;
            const progress = this.user.sections[section.id];
            const completedLessons = progress.lessons.filter(lesson => lesson.completed).length;
            const unlocked = unlocker.isUnlocked(section.id);
            const complete = progress.allCompleted;
            const status = complete ? "已完成" : unlocked ? "进入学习" : "等待解锁";
            return `<article class="section-card ${unlocked ? "is-unlocked" : "is-locked"} ${complete ? "is-complete" : ""}">
              <div class="section-number">阶段 ${index + 1}</div>
              <h2>${escapeHtml(section.name)}</h2>
              <p class="section-detail">${sectionDescription(section.id)}</p>
              <p class="section-status">${complete ? "✓ " : ""}${status}</p>
              ${unlocked
                ? `<button class="primary-button enter-section" data-section="${section.id}">${complete ? "复习课程" : "进入阶段"}</button>`
                : `<p class="locked-note">完成上一阶段后解锁</p>`}
              <div class="section-progress progress-track" role="progressbar"
                aria-label="课程完成进度：${completedLessons} / ${lessonCount} 课完成"
                aria-valuenow="${completedLessons}" aria-valuemin="0" aria-valuemax="${lessonCount}">
                <span style="width:${Math.round((completedLessons / lessonCount) * 100)}%"></span>
              </div>
            </article>`;
          }).join("")}
        </section>

    `;
    this.root.querySelectorAll(".enter-section").forEach(button => {
      button.addEventListener("click", () => this.onOpenSection(button.dataset.section));
    });
  }
}

function sectionDescription(id) {
  return {
    s1: "听读诗句，熟悉全诗",
    s2: "理解词语与诗意",
    s3: "根据拼音辨认字形",
    s4: "根据提示默写诗句"
  }[id];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
