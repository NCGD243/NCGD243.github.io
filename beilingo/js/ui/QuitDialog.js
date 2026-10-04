export class QuitDialog {
  constructor(onContinue, onAbandon) {
    this.onContinue = onContinue;
    this.onAbandon = onAbandon;
  }

  render() {
    const overlay = document.createElement("div");
    overlay.className = "dialog-backdrop";
    overlay.innerHTML = `
      <section class="quit-dialog" role="dialog" aria-modal="true" aria-labelledby="quit-title">
        <div class="dialog-emoji" aria-hidden="true">😢</div>
        <h2 id="quit-title">别走呀，这首还没背完呢～</h2>
        <div class="dialog-actions">
          <button class="primary-button continue-button">继续做题</button>
          <button class="secondary-button abandon-button">放弃（本课进度清零）</button>
        </div>
      </section>
    `;
    overlay.addEventListener("click", event => {
      if (event.target === overlay) this.onContinue();
    });
    overlay.querySelector(".continue-button").addEventListener("click", this.onContinue);
    overlay.querySelector(".abandon-button").addEventListener("click", this.onAbandon);
    return overlay;
  }
}
