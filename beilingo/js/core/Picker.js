export class Picker {
  constructor(userState, exercises) {
    this.user = userState;
    this.exercises = exercises;
  }

  pick(lessonIndex) {
    const eligible = this.exercises.filter(exercise =>
      exercise.lessonIndex === lessonIndex);
    if (eligible.length === 0) {
      throw new RangeError(`No exercises found for lesson ${lessonIndex + 1}`);
    }
    return eligible[0].shuffle ? shuffle(eligible) : eligible;
  }
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}
