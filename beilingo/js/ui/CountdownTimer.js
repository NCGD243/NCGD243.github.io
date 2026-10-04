import { SECTION_UNLOCK_DELAY_MS } from "../config.js";

export class CountdownTimer {
  constructor(element, getRemainingMs, onUnlock) {
    this.element = element;
    this.getRemainingMs = getRemainingMs;
    this.onUnlock = onUnlock;
    this.wasLocked = true;
    this.intervalId = null;
    this.refresh();
    if (this.wasLocked) {
      this.intervalId = window.setInterval(
        () => this.refresh(),
        Math.max(1000, Math.min(30000, SECTION_UNLOCK_DELAY_MS))
      );
    }
  }

  refresh() {
    const remaining = this.getRemainingMs();
    if (remaining === null) {
      this.element.textContent = "完成上一阶段后解锁";
      return;
    }
    if (remaining <= 0) {
      this.element.textContent = "已解锁";
      if (this.wasLocked) {
        this.wasLocked = false;
        this.stop();
        this.onUnlock();
      }
      return;
    }
    this.element.textContent = `还有 ${formatRemaining(remaining)} 解锁`;
  }

  stop() {
    if (this.intervalId !== null) window.clearInterval(this.intervalId);
    this.intervalId = null;
  }
}

function formatRemaining(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} 分钟`;
  }
  return `${seconds} 秒`;
}
