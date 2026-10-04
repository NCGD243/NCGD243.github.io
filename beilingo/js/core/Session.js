import { Picker } from "./Picker.js";
import { Scheduler } from "./Scheduler.js";
import { MAX_RETRY_PER_LESSON } from "../config.js";

export class Session {
  constructor(userState, sectionId, lessonIndex, exercises) {
    this.user = userState;
    this.sectionId = sectionId;
    this.lessonIndex = lessonIndex;
    this.scheduler = new Scheduler(userState);
    this.queue = new Picker(userState, exercises).pick(lessonIndex);
    this.retryCount = {};
    this.answeredCount = 0;
    this.current = null;
  }

  hasNext() {
    return this.queue.length > 0;
  }

  next() {
    this.current = this.queue.shift() ?? null;
    return this.current;
  }

  answer(correct) {
    if (!this.current) throw new Error("There is no current exercise to answer");
    const exercise = this.current;
    this.scheduler.onAnswer(exercise, correct);
    if (!correct) {
      this.retryCount[exercise.id] = (this.retryCount[exercise.id] ?? 0) + 1;
      if (this.retryCount[exercise.id] <= MAX_RETRY_PER_LESSON) this.queue.push(exercise);
    }
    this.answeredCount += 1;
    this.current = null;
  }

  isFinished() {
    return !this.hasNext() && this.current === null;
  }

  get totalCount() {
    return this.answeredCount + this.queue.length + (this.current ? 1 : 0);
  }
}
