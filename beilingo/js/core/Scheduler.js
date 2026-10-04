import { INTERVAL } from "../config.js";

export class Scheduler {
  constructor(userState) {
    this.user = userState;
  }

  onAnswer(exercise, correct) {
    this.user.globalCounter += 1;
    const counter = this.user.globalCounter;
    const knowledge = this.user.knowledge[exercise.knowledge];
    const stat = this.user.exerciseStats[exercise.id];

    if (correct) {
      if (knowledge.due_at <= counter - 1) {
        knowledge.step = Math.min(knowledge.step + 1, INTERVAL.length);
        knowledge.due_at = counter + INTERVAL[Math.min(knowledge.step, INTERVAL.length - 1)];
      }
      stat.wrongFlag = false;
    } else {
      knowledge.step = Math.max(knowledge.step - 1, 0);
      knowledge.due_at = counter + INTERVAL[Math.min(knowledge.step, INTERVAL.length - 1)];
      stat.wrongFlag = true;
    }
    stat.appearances += 1;
    stat.lastResult = correct;
    knowledge.lastResult = correct;
  }
}
