import { SECTION_EXERCISES, SECTION_LESSONS, SECTIONS } from "../data/exercises.js";
import { POEM } from "../data/poem.js";
import { SectionUnlocker } from "../core/SectionUnlocker.js";
import { CountdownTimer } from "./CountdownTimer.js";

export class HomeView {
  constructor(root, userState, onOpenSection) {
    this.root = root;
    this.user = userState;
    this.onOpenSection = onOpenSection;
    this.timers = [];
    this.active = false;
  }

  render() {
    this.active = true;
    this.timers.forEach(timer => timer.stop());
    this.timers = [];
    const unlocker = new SectionUnlocker(this.user);
    this.root.innerHTML = `
      <header class="site-header">
        <p class="eyebrow">古诗背诵 · ${SECTIONS.length} 阶段练习</p>
        <h1>《${escapeHtml(POEM.title)}》</h1>
      </header>
      <section class="section-grid" aria-label="学习阶段">
        ${SECTIONS.map((section, index) => {
          const lessonCount = SECTION_LESSONS[section.id].length;
          const progress = this.user.sections[section.id];
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
              : `<p class="countdown" data-countdown="${section.id}"></p>`}
            <p class="lesson-summary">${progress.lessons.filter(lesson => lesson.completed).length} / ${lessonCount} 课完成</p>
          </article>`;
        }).join("")}
      </section>
      <footer class="site-footer">各阶段题库题数（${SECTIONS.map(section =>
        `${section.name} ${SECTION_EXERCISES[section.id].length} 题`
      ).join(" · ")}）；学习进度保存在本设备</footer>
    `;
    this.root.querySelectorAll(".enter-section").forEach(button => {
      button.addEventListener("click", () => this.onOpenSection(button.dataset.section));
    });
    this.root.querySelectorAll("[data-countdown]").forEach(element => {
      const sectionId = element.dataset.countdown;
      this.timers.push(new CountdownTimer(
        element,
        () => unlocker.remainingMs(sectionId),
        () => {
          if (this.active) this.render();
        }
      ));
    });
  }

  stop() {
    this.active = false;
    this.timers.forEach(timer => timer.stop());
    this.timers = [];
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
