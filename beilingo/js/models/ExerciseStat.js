export class ExerciseStat {
  constructor(exerciseId) {
    this.exerciseId = exerciseId;
    this.appearances = 0;
    this.wrongFlag = false;
    this.lastResult = null;
  }

  toJSON() {
    return {
      exerciseId: this.exerciseId,
      appearances: this.appearances,
      wrongFlag: this.wrongFlag,
      lastResult: this.lastResult
    };
  }

  static fromJSON(obj) {
    const stat = new ExerciseStat(obj.exerciseId);
    stat.appearances = obj.appearances;
    stat.wrongFlag = obj.wrongFlag;
    stat.lastResult = obj.lastResult;
    return stat;
  }
}
