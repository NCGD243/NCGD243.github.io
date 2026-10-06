import { SECTION_LESSONS } from "../data/exercises.js";
import { LessonProgress } from "./LessonProgress.js";

export class SectionProgress {
  constructor(sectionId) {
    this.sectionId = sectionId;
    const lessons = SECTION_LESSONS[sectionId];
    if (!Array.isArray(lessons) || lessons.length < 1) {
      throw new RangeError(`Invalid section data: ${sectionId}`);
    }
    this.lessons = lessons.map((_, index) => new LessonProgress(index));
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
