import { SECTION_UNLOCK_DELAY_MS } from "../config.js";
import { SECTIONS } from "../data/exercises.js";

export class SectionUnlocker {
  constructor(userState) {
    this.user = userState;
  }

  isUnlocked(sectionId) {
    const index = SECTIONS.findIndex(section => section.id === sectionId);
    if (index === 0) return true;
    if (index < 0) return false;
    const completedAt = this.user.sections[SECTIONS[index - 1].id]?.completedAt;
    return completedAt !== null && completedAt !== undefined
      && Date.now() - completedAt >= SECTION_UNLOCK_DELAY_MS;
  }

  remainingMs(sectionId) {
    const index = SECTIONS.findIndex(section => section.id === sectionId);
    if (index === 0) return 0;
    if (index < 0) return null;
    const completedAt = this.user.sections[SECTIONS[index - 1].id]?.completedAt;
    if (completedAt === null || completedAt === undefined) return null;
    return Math.max(0, completedAt + SECTION_UNLOCK_DELAY_MS - Date.now());
  }
}
