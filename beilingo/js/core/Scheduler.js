import { INTERVAL, WRONG_FLAG_CLEAR_CORRECT_COUNT } from "../config.js";

export class Scheduler {
  constructor(userState) {
    this.user = userState;
  }

  onAnswer(exercise, correct) {
    this.user.globalCounter += 1;
    const counter = this.user.globalCounter;
    const knowledge = exercise.knowledge ? this.user.knowledge[exercise.knowledge] : null;
    const stat = this.user.exerciseStats[exercise.id];
    if (!stat) throw new Error(`Missing exercise stat: ${exercise.id}`);

    if (correct) {
      if (knowledge && knowledge.due_at <= counter - 1) {
        knowledge.step = Math.min(knowledge.step + 1, INTERVAL.length);
        knowledge.due_at = counter + INTERVAL[Math.min(knowledge.step, INTERVAL.length - 1)];
      }
      if (stat.wrongFlag) {
        stat.correctStreak = (stat.correctStreak ?? 0) + 1;
        if (stat.correctStreak >= WRONG_FLAG_CLEAR_CORRECT_COUNT) {
          stat.wrongFlag = false;
          stat.correctStreak = 0;
        }
      } else {
        stat.correctStreak = 0;
      }
    } else {
      if (knowledge) {
        knowledge.step = Math.max(knowledge.step - 1, 0);
        knowledge.due_at = counter + INTERVAL[Math.min(knowledge.step, INTERVAL.length - 1)];
      }
      stat.wrongFlag = true;
      stat.correctStreak = 0;
    }
    stat.appearances += 1;
    stat.lastResult = correct;
    if (knowledge) knowledge.lastResult = correct;
  }
}
