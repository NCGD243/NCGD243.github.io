export class SectionUnlocker {
  constructor(userState) {
    this.user = userState;
    this.sections = userState.curriculum.sections;
  }

  isUnlocked(sectionId) {
    const index = this.sections.findIndex(section => section.id === sectionId);
    if (index === 0) return true;
    if (index < 0) return false;
    return this.user.sections[this.sections[index - 1].id]?.allCompleted === true;
  }
}
