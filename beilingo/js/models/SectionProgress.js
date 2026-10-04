import { LESSONS_PER_SECTION } from "../config.js";
import { LessonProgress } from "./LessonProgress.js";

export class SectionProgress {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.lessons = Array.from({ length: LESSONS_PER_SECTION }, (_, index) => new LessonProgress(index));
    this.completedAt = null;
  }

  get allCompleted() {
    return this.lessons.every(lesson => lesson.completed);
  }

  markLessonComplete(index) {
    if (!this.lessons[index]) throw new RangeError(`Invalid lesson index: ${index}`);
    this.lessons[index].completed = true;
    if (this.allCompleted && this.completedAt === null) this.completedAt = Date.now();
  }
}
