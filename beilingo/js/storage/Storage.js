import { STORAGE_KEY } from "../config.js";
import { UserState } from "../models/UserState.js";

export class Storage {
  static load(poem, curriculum) {
    const storageKey = this.keyFor(poem.id);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new UserState(poem, curriculum);
    try {
      return UserState.fromJSON(JSON.parse(raw), poem, curriculum);
    } catch (error) {
      console.warn("存档损坏，已重置。", error);
      return new UserState(poem, curriculum);
    }
  }

  static save(userState) {
    localStorage.setItem(this.keyFor(userState.poemId), JSON.stringify(userState.toJSON()));
  }

  static keyFor(poemId) {
    return `${STORAGE_KEY}_${poemId}`;
  }
}
