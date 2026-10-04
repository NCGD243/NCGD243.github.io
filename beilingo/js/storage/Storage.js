import { STORAGE_KEY } from "../config.js";
import { UserState } from "../models/UserState.js";

export class Storage {
  static load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new UserState();
    try {
      return UserState.fromJSON(JSON.parse(raw));
    } catch (error) {
      console.warn("存档损坏，已重置。", error);
      return new UserState();
    }
  }

  static save(userState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userState.toJSON()));
  }
}
