import {
  INTERVAL, W_WEAK, W_DUE, W_UNCOVERED, W_WRONG, W_MASTERED, W_RANDOM
} from "../config.js";

export class Scorer {
  constructor(userState, exercises) {
    this.user = userState;
    this.exercises = exercises;
    this.maxAppearances = Math.max(1, ...exercises.map(exercise =>
      this.user.exerciseStats[exercise.id]?.appearances ?? 0));
  }

  computeScore(exercise) {
    const stat = this.user.exerciseStats[exercise.id];
    const knowledge = this.user.knowledge[exercise.knowledge];
    const weak = 1 - knowledge.step / INTERVAL.length;
    const due = knowledge.due_at <= this.user.globalCounter
      ? Math.min((this.user.globalCounter - knowledge.due_at) / 20, 1)
      : 0;
    const uncovered = 1 - (stat?.appearances ?? 0) / this.maxAppearances;
    const wrong = stat?.wrongFlag || knowledge.lastResult === false ? 1 : 0;
    const mastered = knowledge.step >= 5 ? (knowledge.step - 4) / 2 : 0;
    return W_WEAK * weak + W_DUE * due + W_UNCOVERED * uncovered
      + W_WRONG * wrong - W_MASTERED * mastered + W_RANDOM * Math.random();
  }
}
