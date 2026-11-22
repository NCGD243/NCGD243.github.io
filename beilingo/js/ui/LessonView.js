import { Session } from "../core/Session.js";
import { Storage } from "../storage/Storage.js";
import { QuestionRenderer } from "./QuestionRenderer.js";
import { QuitDialog } from "./QuitDialog.js";

export class LessonView {
  constructor(root, userState, sectionId, lessonIndex, onExit) {
    this.root = root;
    this.user = userState;
    this.sectionId = sectionId;
    this.lessonIndex = lessonIndex;
    this.onExit = onExit;
    this.layout = root.closest(".learning-layout");
    if (!this.layout) throw new Error("Missing .learning-layout");
    this.session = new Session(
      userState,
      sectionId,
      lessonIndex,
      userState.curriculum.sectionExercises[sectionId]
    );
    this.renderer = new QuestionRenderer();
    this.active = true;
  }

  render() {
    this.layout.classList.add("is-poem-open");
    this.renderNext();
  }

  renderNext() {
    if (!this.active) return;
    document.body.classList.add("is-lesson");
    this.layout.classList.add("is-lesson");
    if (this.session.isFinished()) {
      this.finish();
      return;
    }
    const exercise = this.session.next();
    const lessonCount = this.user.curriculum.sectionLessons[this.sectionId].length;
    const sectionName = this.user.curriculum.sections.find(section =>
      section.id === this.sectionId)?.name ?? "";
    const count = this.session.answeredCount + 1;
    const total = Math.max(count, this.session.totalCount);
    this.root.innerHTML = `
      <section class="lesson-panel">

          <button class="close-button" type="button" aria-label="退出本课">×</button>
          <button class="poem-toggle-button" type="button" aria-label="打开诗歌面板">诗</button>

        <div class="progress-track" role="progressbar" aria-valuenow="${Math.min(count - 1, total)}"
          aria-valuemin="0" aria-valuemax="${total}">
          <span style="width:${Math.round(((count - 1) / total) * 100)}%"></span>
        </div>
        <div class="question-area"></div>
      </section>
    `;
    this.root.querySelector(".close-button").addEventListener("click", () => this.showQuitDialog());
    this.root.querySelector(".poem-toggle-button").addEventListener("click", () => {
      this.layout.classList.add("is-poem-open");
    });
    this.renderer.render(this.root.querySelector(".question-area"), exercise, correct => {
      if (!this.active) return;
      this.session.answer(correct);
      Storage.save(this.user);
      this.renderNext();
    }, this.session.queue.length === 0, this.user);
  }

  showQuitDialog(onAbandon = this.onExit) {
    const dialog = new QuitDialog(
      () => dialogElement.remove(),
      () => {
        this.active = false;
        this.renderer.restorePoemPanel();
        this.closePoemPanel();
        dialogElement.remove();
        onAbandon();
      }
    );
    const dialogElement = dialog.render();
    this.root.append(dialogElement);
  }

  finish() {
    this.renderer.restorePoemPanel();
    this.closePoemPanel();
    const section = this.user.sections[this.sectionId];
    section.markLessonComplete(this.lessonIndex);
    Storage.save(this.user);
    this.active = false;
    const complete = section.allCompleted;
    this.root.innerHTML = `
      <section class="finish-card">
        <div class="finish-mark">${complete ? "✦" : "✓"}</div>
        <p class="eyebrow">${escapeHtml(this.user.curriculum.sections.find(section =>
          section.id === this.sectionId)?.name ?? "")}</p>
        <h1>${complete ? "阶段全部完成！" : `第 ${this.lessonIndex + 1} 课完成！`}</h1>
        <p>${complete
          ? "太棒了！下一阶段现已开放。"
          : "做得很好，下一课已经解锁。"}
        </p>
        <button class="primary-button return-button" type="button">返回课程</button>
      </section>
    `;
    this.root.querySelector(".return-button").addEventListener("click", this.onExit);
  }

  closePoemPanel() {
    this.layout.classList.remove("is-lesson", "is-poem-open");
    document.body.classList.remove("is-lesson");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
