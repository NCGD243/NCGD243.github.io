import { speak } from "../utils/speech.js";
import { AUTO_PLAY_DELAY_MS, POEM_BLOCK_MOVE_DURATION_MS } from "../config.js";
import { getCharacterSea } from "../data/characterLibrary.js";

const correctAnswerAudio = new Audio(new URL("../data/soundeffects/correct.wav", import.meta.url));

export class QuestionRenderer {
  render(container, exercise, onAnswer) {
    this.restorePoemPanel();
    this.highlightPoem(exercise);
    if (exercise.type === "pinyin") this.maskPoemCharacter(exercise);
    if (exercise.type === "recite") this.maskPoemLine(exercise);
    const content = document.createElement("section");
    content.className = "question";
    if (exercise.type === "listen") this.renderListen(content, exercise, onAnswer);
    else if (exercise.type === "listenSequence") this.renderListenSequence(content, exercise, onAnswer);
    else if (exercise.type === "meaning") this.renderMeaning(content, exercise, onAnswer);
    else if (exercise.type === "order") this.renderOrder(content, exercise, onAnswer);
    else if (exercise.type === "pinyin") this.renderPinyin(content, exercise, onAnswer);
    else if (exercise.type === "recite") this.renderRecite(content, exercise, onAnswer);
    else throw new Error(`Unsupported exercise type: ${exercise.type}`);
    container.replaceChildren(content);
  }

  highlightPoem(exercise) {
    const lines = document.querySelectorAll(".poem-panel-line");
    lines.forEach(line => {
      line.classList.toggle(
        "is-highlighted",
        exercise.type === "order" ||
          line.dataset.lineIndex === String(Number(exercise.knowledge.slice(1)) - 1)
      );
    });
  }

  highlightSequenceLine(lineIndex) {
    document.querySelectorAll(".poem-panel-line").forEach(line => {
      line.classList.toggle("is-highlighted", line.dataset.lineIndex === String(lineIndex));
    });
  }

  maskPoemCharacter(exercise) {
    const lineIndex = Number(exercise.knowledge.slice(1)) - 1;
    const line = document.querySelector(`.poem-panel-line[data-line-index="${lineIndex}"]`);
    const target = exercise.options[exercise.answer];
    if (!line || !target) return;

    const text = line.textContent;
    const targetIndex = text.indexOf(target);
    if (targetIndex < 0) return;

    const blank = document.createElement("span");
    blank.className = "poem-character-blank";
    blank.setAttribute("aria-label", "空缺");
    line.replaceChildren(
      document.createTextNode(text.slice(0, targetIndex)),
      blank,
      document.createTextNode(text.slice(targetIndex + target.length))
    );
  }

  maskPoemLine(exercise) {
    const lineIndex = Number(exercise.knowledge.slice(1)) - 1;
    const line = document.querySelector(`.poem-panel-line[data-line-index="${lineIndex}"]`);
    if (!line) return;

    const blank = document.createElement("span");
    blank.className = "poem-line-blank";
    blank.setAttribute("aria-label", "本句默写中");
    line.replaceChildren(blank);
  }

  clearPoemHighlight() {
    this.restorePoemPanel();
    document.querySelectorAll(".poem-panel-line.is-highlighted").forEach(line => {
      line.classList.remove("is-highlighted");
    });
  }

  restorePoemPanel() {
    const poemLines = document.querySelector(".poem-lines");
    if (!poemLines?.dataset.originalMarkup) return;
    poemLines.classList.remove("poem-order-target");
    poemLines.innerHTML = poemLines.dataset.originalMarkup;
  }

  renderListen(container, exercise, onAnswer) {
    container.innerHTML = `
      <p class="question-instruction">先听一遍，再大声跟读。</p>
      <button class="play-button" type="button">🔊 播放诗句</button>
      <p class="poem-line">${escapeHtml(exercise.line)}</p>
      <button class="primary-button answer-button" type="button">我读完了</button>
    `;
    container.querySelector(".play-button").addEventListener("click", () => speak(exercise.line));
    container.querySelector(".answer-button").addEventListener("click", () => onAnswer(true));
    window.setTimeout(() => speak(exercise.line), AUTO_PLAY_DELAY_MS);
  }

  renderListenSequence(container, exercise, onAnswer) {
    let lineIndex = 0;
    container.innerHTML = `
      <p class="question-instruction">听读整首诗，跟读后点击下一句</p>
      <p class="sequence-progress"></p>
      <p class="poem-line sequence-line"></p>
      <button class="primary-button sequence-next" type="button">下一句</button>
    `;

    const progress = container.querySelector(".sequence-progress");
    const poemLine = container.querySelector(".sequence-line");
    const nextButton = container.querySelector(".sequence-next");
    const showCurrentLine = () => {
      const line = exercise.lines[lineIndex];
      progress.textContent = `${lineIndex + 1} / ${exercise.lines.length}`;
      poemLine.textContent = line;
      nextButton.textContent = lineIndex === exercise.lines.length - 1 ? "完成跟读" : "下一句";
      this.highlightSequenceLine(Number(exercise.knowledge.slice(1)) - 1 + lineIndex);
      speak(line);
    };

    nextButton.addEventListener("click", () => {
      if (lineIndex === exercise.lines.length - 1) {
        nextButton.disabled = true;
        onAnswer(true);
        return;
      }
      lineIndex += 1;
      showCurrentLine();
    });
    window.setTimeout(showCurrentLine, AUTO_PLAY_DELAY_MS);
  }

  renderMeaning(container, exercise, onAnswer) {
    const choices = shuffleOptions(exercise);
    container.innerHTML = `
      <p class="question-instruction">选择词语的正确解释</p>
      <p class="question-prompt">${escapeHtml(exercise.word)}</p>
      <p class="context-line">${escapeHtml(exercise.line)}</p>
      ${optionsMarkup(choices.options)}
    `;
    this.bindOptions(container, choices, onAnswer);
  }

  renderOrder(container, exercise, onAnswer) {
    const lines = shuffleItems(exercise.lines.map((line, index) => ({ line, index })));
    const poemTarget = document.querySelector(".poem-lines");
    let submitted = false;

    if (!poemTarget) throw new Error("Missing poem panel ordering target");
    poemTarget.classList.add("poem-order-target");
    poemTarget.innerHTML = Array.from({ length: Math.ceil(exercise.lines.length / 2) }, (_, coupletIndex) => `
      <li>
        <span class="poem-order-slot" data-slot="${coupletIndex * 2}"></span>，
        <span class="poem-order-slot" data-slot="${coupletIndex * 2 + 1}"></span>。
      </li>
    `).join("");
    container.innerHTML = `
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      <ul class="order-source" aria-label="待排序诗句">
        ${lines.map(({ line, index }) => this.orderItemMarkup(line, index)).join("")}
      </ul>
      <button class="primary-button order-submit" type="button">提交排序</button>
    `;

    const source = container.querySelector(".order-source");
    const slots = [...poemTarget.querySelectorAll(".poem-order-slot")];
    const sourceSlots = new WeakMap();

    const updateLists = () => {
      container.querySelector(".order-submit").disabled = slots.some(slot => !slot.querySelector(".order-item"));
    };

    source.addEventListener("click", event => {
      if (submitted) return;
      const item = event.target.closest(".order-item");
      const firstEmptySlot = slots.find(slot => !slot.querySelector(".order-item"));
      if (!item || !firstEmptySlot) return;
      const startRect = item.getBoundingClientRect();
      const sourceSlot = item.parentElement;
      sourceSlots.set(item, sourceSlot);
      sourceSlot.classList.add("is-empty");
      firstEmptySlot.append(item);
      animateMove(item, startRect);
      updateLists();
    });
    poemTarget.addEventListener("click", event => {
      if (submitted) return;
      const item = event.target.closest(".order-item");
      if (!item) return;
      const startRect = item.getBoundingClientRect();
      const sourceSlot = sourceSlots.get(item);
      if (!sourceSlot) return;
      sourceSlot.classList.remove("is-empty");
      sourceSlot.append(item);
      animateMove(item, startRect);
      updateLists();
    });
    container.querySelector(".order-submit").addEventListener("click", event => {
      const correct = slots.every((slot, index) => Number(slot.querySelector(".order-item")?.dataset.line) === index);
      submitted = true;
      [source, poemTarget].forEach(list => list.querySelectorAll(".order-item").forEach(item => {
        item.disabled = true;
      }));
      event.currentTarget.disabled = true;
      this.showAnswerFeedback(container, correct, `正确顺序：${exercise.lines.join("，")}`, onAnswer);
    });
    updateLists();
  }

  renderPinyin(container, exercise, onAnswer) {
    const choices = shuffleOptions(exercise);
    container.innerHTML = `
      <p class="question-instruction">根据拼音选择正确的字</p>
      <p class="pinyin">${escapeHtml(exercise.pinyin)}</p>
      <p class="question-prompt">${escapeHtml(exercise.hint)}</p>
      ${optionsMarkup(choices.options)}
    `;
    this.bindOptions(container, choices, onAnswer);
  }

  async renderRecite(container, exercise, onAnswer) {
    const answerCharacters = Array.from(normalize(exercise.answer));
    container.innerHTML = `
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      <p class="question-instruction">点击下方字块组成诗句</p>
      <p class="recite-answer" aria-live="polite"></p>
      <div class="character-sea" aria-label="可选汉字"></div>
      <button class="secondary-button recite-clear" type="button">清空</button>
      <button class="primary-button answer-button" type="button" disabled>提交答案</button>
    `;
    const sea = container.querySelector(".character-sea");
    const answerDisplay = container.querySelector(".recite-answer");
    const submitButton = container.querySelector(".answer-button");
    const clearButton = container.querySelector(".recite-clear");

    sea.textContent = "正在准备字库…";
    let characters;
    try {
      characters = await getCharacterSea(answerCharacters.join(""));
    } catch (error) {
      sea.textContent = "字库加载失败，请刷新页面重试。";
      throw error;
    }
    if (!container.isConnected) return;

    sea.innerHTML = characters.map((character, index) =>
      `<button class="character-tile" type="button" data-index="${index}">${escapeHtml(character)}</button>`
    ).join("");
    const selected = [];
    const renderSelectedAnswer = () => {
      answerDisplay.replaceChildren(...selected.map(({ character }, index) => {
        const button = document.createElement("button");
        button.className = "recite-selected-character";
        button.type = "button";
        button.dataset.index = String(index);
        button.textContent = character;
        button.setAttribute("aria-label", `${character}，点击移除`);
        return button;
      }));
    };
    const renderAnswer = () => {
      renderSelectedAnswer();
      submitButton.disabled = selected.length !== answerCharacters.length;
    };

    sea.addEventListener("click", event => {
      const tile = event.target.closest(".character-tile");
      if (!tile || tile.disabled || selected.length >= answerCharacters.length) return;
      tile.disabled = true;
      selected.push({ character: tile.textContent, tile });
      renderAnswer();
    });
    answerDisplay.addEventListener("click", event => {
      const index = Number(event.target.dataset.index);
      if (!Number.isInteger(index) || !selected[index]) return;
      selected[index].tile.disabled = false;
      selected.splice(index, 1);
      renderAnswer();
    });
    clearButton.addEventListener("click", () => {
      selected.forEach(({ tile }) => {
        tile.disabled = false;
      });
      selected.length = 0;
      renderAnswer();
    });
    submitButton.addEventListener("click", () => {
      const correct = selected.map(({ character }) => character).join("") === answerCharacters.join("");
      sea.querySelectorAll("button").forEach(button => {
        button.disabled = true;
      });
      clearButton.disabled = true;
      submitButton.disabled = true;
      answerDisplay.replaceChildren(document.createTextNode(selected.map(({ character }) => character).join("")));
      this.showAnswerFeedback(container, correct, `正确答案：${exercise.answer}`, onAnswer);
    });
    renderAnswer();
  }

  bindOptions(container, exercise, onAnswer) {
    container.querySelectorAll(".option-button").forEach((button, index) => {
      button.addEventListener("click", () => {
        const correct = index === exercise.answer;
        container.querySelectorAll(".option-button").forEach((option, optionIndex) => {
          option.disabled = true;
          if (optionIndex === exercise.answer) option.classList.add("is-correct");
          else if (optionIndex === index) option.classList.add("is-wrong");
        });
        this.showAnswerFeedback(container, correct, `正确答案：${exercise.options[exercise.answer]}`, onAnswer);
      });
    });
  }

  showAnswerFeedback(container, correct, wrongMessage, onAnswer) {
    this.showFeedback(container, correct, wrongMessage);
    if (correct) {
      correctAnswerAudio.currentTime = 0;
      correctAnswerAudio.play().catch(error => {
        console.warn("无法播放答对音效。", error);
      });
      window.setTimeout(() => onAnswer(true), 650);
      return;
    }

    const continueButton = document.createElement("button");
    continueButton.className = "primary-button continue-button";
    continueButton.type = "button";
    continueButton.textContent = "继续";
    continueButton.addEventListener("click", () => onAnswer(false), { once: true });
    container.append(continueButton);
  }

  showFeedback(container, correct, wrongMessage) {
    const feedback = document.createElement("p");
    feedback.className = `feedback ${correct ? "is-correct" : "is-wrong"}`;
    feedback.textContent = correct ? "✓ 正确！" : `✗ ${wrongMessage}`;
    container.append(feedback);
  }

  orderItemMarkup(line, index) {
    return `<li class="order-bank-slot"><button class="order-item" type="button" data-line="${index}">
      <span class="order-text">${escapeHtml(line)}</span>
    </button></li>`;
  }
}

function optionsMarkup(options) {
  return `<div class="options">${options.map(option =>
    `<button class="option-button" type="button">${escapeHtml(option)}</button>`
  ).join("")}</div>`;
}

function normalize(value) {
  return value.replace(/[，。！？、\s]/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function shuffleItems(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function shuffleOptions(exercise) {
  const indexedOptions = shuffleItems(exercise.options.map((option, index) => ({ option, index })));
  return {
    ...exercise,
    options: indexedOptions.map(({ option }) => option),
    answer: indexedOptions.findIndex(({ index }) => index === exercise.answer)
  };
}

function animateMove(element, startRect) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const endRect = element.getBoundingClientRect();
  element.animate([
    {
      transform: `translate(${startRect.left - endRect.left}px, ${startRect.top - endRect.top}px)`
    },
    { transform: "translate(0, 0)" }
  ], {
    duration: POEM_BLOCK_MOVE_DURATION_MS,
    easing: "ease-out"
  });
}
