export class KnowledgeState {
  constructor(id) {
    this.id = id;
    this.step = 0;
    this.due_at = 3;
    this.lastResult = null;
  }

  isDue(globalCounter) {
    return this.due_at <= globalCounter;
  }

  toJSON() {
    return { id: this.id, step: this.step, due_at: this.due_at, lastResult: this.lastResult };
  }

  static fromJSON(obj) {
    const state = new KnowledgeState(obj.id);
    state.step = obj.step;
    state.due_at = obj.due_at;
    state.lastResult = obj.lastResult;
    return state;
  }
}
