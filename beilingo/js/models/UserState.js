import { ExerciseStat } from "./ExerciseStat.js";
import { KnowledgeState } from "./KnowledgeState.js";
import { SectionProgress } from "./SectionProgress.js";
import { LessonProgress } from "./LessonProgress.js";

export class UserState {
  constructor(poem, curriculum) {
    if (!poem?.id || !Array.isArray(poem.couplets) || !Array.isArray(curriculum?.sections)) {
      throw new TypeError("Poem and curriculum data are required to create user state");
    }
    this.poemId = poem.id;
    this.curriculum = curriculum;
    this.globalCounter = 0;
    this.knowledge = Object.fromEntries(
      poem.couplets.flat().map((_, index) => {
        const id = `S${index + 1}`;
        return [id, new KnowledgeState(id)];
      })
    );
    this.exerciseStats = {};
    this.sections = Object.fromEntries(curriculum.sections.map(({ id, lessons }) => [
      id,
      new SectionProgress(id, lessons)
    ]));
    for (const exercises of Object.values(curriculum.sectionExercises)) {
      for (const exercise of exercises) this.exerciseStats[exercise.id] = new ExerciseStat(exercise.id);
    }
  }

  toJSON() {
    return {
      globalCounter: this.globalCounter,
      knowledge: Object.fromEntries(Object.entries(this.knowledge).map(([id, value]) => [id, value.toJSON()])),
      exerciseStats: Object.fromEntries(Object.entries(this.exerciseStats).map(([id, value]) => [id, value.toJSON()])),
      sections: Object.fromEntries(Object.entries(this.sections).map(([id, section]) => [id, {
        sectionId: section.sectionId,
        lessons: section.lessons.map(({ index, completed }) => ({ index, completed })),
        completedAt: section.completedAt
      }]))
    };
  }

  static fromJSON(obj, poem, curriculum) {
    const state = new UserState(poem, curriculum);
    if (!obj || typeof obj !== "object") throw new TypeError("Invalid saved state");
    state.globalCounter = Number.isInteger(obj.globalCounter) && obj.globalCounter >= 0 ? obj.globalCounter : 0;

    for (const id of Object.keys(state.knowledge)) {
      const saved = obj.knowledge?.[id];
      if (saved) {
        const parsed = KnowledgeState.fromJSON({ ...saved, id });
        if (Number.isFinite(parsed.step) && Number.isFinite(parsed.due_at)) state.knowledge[id] = parsed;
      }
    }
    for (const [id, stat] of Object.entries(state.exerciseStats)) {
      const saved = obj.exerciseStats?.[id];
      if (saved) state.exerciseStats[id] = ExerciseStat.fromJSON({ ...saved, exerciseId: id });
    }
    for (const [id, section] of Object.entries(state.sections)) {
      const saved = obj.sections?.[id];
      if (!saved || !Array.isArray(saved.lessons)) continue;
      section.lessons = Array.from({ length: section.lessons.length }, (_, index) => {
        const lesson = new LessonProgress(index);
        lesson.completed = Boolean(saved.lessons[index]?.completed);
        return lesson;
      });
      section.completedAt = Number.isFinite(saved.completedAt) ? saved.completedAt : null;
    }
    return state;
  }
}
