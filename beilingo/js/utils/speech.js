export function speak(text, { rate = 0.85 } = {}) {
  if (!("speechSynthesis" in window)) {
    window.alert("当前浏览器不支持语音朗读。");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}
