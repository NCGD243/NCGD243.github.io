import { SECTION_EXERCISES, SECTION_LESSONS, SECTIONS } from "../data/exercises.js";
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
    this.session = new Session(userState, sectionId, lessonIndex, SECTION_EXERCISES[sectionId]);
    this.renderer = new QuestionRenderer();
    this.active = true;
  }

  render() {
    this.renderNext();
  }

  renderNext() {
    if (!this.active) return;
    if (this.session.isFinished()) {
      this.finish();
      return;
    }
    const exercise = this.session.next();
    const lessonCount = SECTION_LESSONS[this.sectionId].length;
    const count = this.session.answeredCount + 1;
    const total = Math.max(count, this.session.totalCount);
    this.root.innerHTML = `
      <section class="lesson-panel">
        <div class="lesson-topbar">
          <div>
            <p class="eyebrow">${escapeHtml(sectionName(this.sectionId))}</p>
            <h1>第 ${this.lessonIndex + 1} 课 <span>/ 共 ${lessonCount} 课</span></h1>
          </div>
          <button class="close-button" type="button" aria-label="退出本课">×</button>
        </div>
        <div class="progress-label"><span>本课进度</span><span>${Math.min(count, total)} / ${total}</span></div>
        <div class="progress-track" role="progressbar" aria-valuenow="${Math.min(count - 1, total)}"
          aria-valuemin="0" aria-valuemax="${total}">
          <span style="width:${Math.round(((count - 1) / total) * 100)}%"></span>
        </div>
        <div class="question-area"></div>
      </section>
    `;
    this.root.querySelector(".close-button").addEventListener("click", () => this.showQuitDialog());
    this.renderer.render(this.root.querySelector(".question-area"), exercise, correct => {
      if (!this.active) return;
      this.session.answer(correct);
      Storage.save(this.user);
      this.renderNext();
    }, this.session.queue.length === 0, this.user);
  }

  showQuitDialog() {
    const dialog = new QuitDialog(
      () => dialogElement.remove(),
      () => {
        this.active = false;
        this.renderer.clearPoemHighlight();
        dialogElement.remove();
        this.onExit();
      }
    );
    const dialogElement = dialog.render();
    this.root.append(dialogElement);
  }

  finish() {
    this.renderer.clearPoemHighlight();
    const section = this.user.sections[this.sectionId];
    section.markLessonComplete(this.lessonIndex);
    Storage.save(this.user);
    this.active = false;
    const complete = section.allCompleted;
    this.root.innerHTML = `
      <section class="finish-card">
        <div class="finish-mark">${complete ? "✦" : "✓"}</div>
        <p class="eyebrow">${escapeHtml(sectionName(this.sectionId))}</p>
        <h1>${complete ? "阶段全部完成！" : `第 ${this.lessonIndex + 1} 课完成！`}</h1>
        <p>${complete
          ? "太棒了！已记录本阶段完成时间，下一阶段会按设定间隔解锁。"
          : "做得很好，下一课已经解锁。"}
        </p>
        <button class="primary-button return-button" type="button">返回课程</button>
      </section>
    `;
    this.root.querySelector(".return-button").addEventListener("click", this.onExit);
  }
}

function sectionName(id) {
  return SECTIONS.find(section => section.id === id)?.name ?? "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
