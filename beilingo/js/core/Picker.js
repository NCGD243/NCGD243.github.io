import { Scorer } from "./Scorer.js";
import {
  EXERCISES_PER_LESSON, QUOTA_WRONG, QUOTA_DUE, QUOTA_WEAK, QUOTA_UNCOVERED
} from "../config.js";

export class Picker {
  constructor(userState, exercises) {
    this.user = userState;
    this.exercises = exercises;
  }

  pick(lessonIndex) {
    const required = this.exercises.filter(exercise =>
      exercise.type === "order" || exercise.type === "listenSequence");
    const requiredIds = new Set(required.map(exercise => exercise.id));
    if (lessonIndex === 0) {
      const optional = shuffle(this.exercises.filter(exercise => !requiredIds.has(exercise.id)));
      return [...required, ...optional.slice(0, Math.max(0, EXERCISES_PER_LESSON - required.length))];
    }

    const scorer = new Scorer(this.user, this.exercises);
    const score = exercise => scorer.computeScore(exercise);
    const selected = [...required];
    const selectedIds = new Set(requiredIds);
    const addFrom = (pool, limit, sort = (a, b) => score(b) - score(a)) => {
      pool.filter(exercise => !selectedIds.has(exercise.id))
        .sort(sort)
        .slice(0, limit)
        .forEach(exercise => {
          selected.push(exercise);
          selectedIds.add(exercise.id);
        });
    };

    addFrom(this.exercises.filter(exercise =>
      this.user.exerciseStats[exercise.id].wrongFlag ||
      this.user.knowledge[exercise.knowledge].lastResult === false), QUOTA_WRONG);
    addFrom(this.exercises.filter(exercise =>
      this.user.knowledge[exercise.knowledge].isDue(this.user.globalCounter)), QUOTA_DUE);
    addFrom(this.exercises.filter(exercise =>
      this.user.knowledge[exercise.knowledge].step < 3), QUOTA_WEAK);
    addFrom(this.exercises, QUOTA_UNCOVERED, (a, b) =>
      this.user.exerciseStats[a.id].appearances - this.user.exerciseStats[b.id].appearances);
    addFrom(this.exercises, EXERCISES_PER_LESSON - selected.length);

    selected.sort((a, b) =>
      this.user.knowledge[b.knowledge].step - this.user.knowledge[a.knowledge].step);
    if (selected.length > 4) return [...selected.slice(0, 2), ...shuffle(selected.slice(2))];
    return selected;
  }
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}
