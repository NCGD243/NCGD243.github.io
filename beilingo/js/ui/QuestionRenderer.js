import { speak } from "../utils/speech.js";
import { AUTO_PLAY_DELAY_MS, POEM_BLOCK_MOVE_DURATION_MS } from "../config.js";
import { getCharacterSea } from "../data/characterLibrary.js";

const correctAnswerAudio = new Audio(new URL("../data/soundeffects/correct.wav", import.meta.url));

export class QuestionRenderer {
  render(container, exercise, onAnswer, isLast = false, userState = null) {
    this.restorePoemPanel();
    this.highlightPoem(exercise);
    const content = document.createElement("section");
    content.className = "question";
    const stat = userState?.exerciseStats?.[exercise.id];
    switch (exercise.type) {
      case "read":
        this.renderRead(content, exercise, onAnswer, isLast);
        break;
      case "option":
        this.renderOption(content, exercise, onAnswer);
        break;
      case "order":
        this.renderOrder(content, exercise, onAnswer);
        break;
      case "spell":
        this.renderSpell(content, exercise, onAnswer);
        break;
      default:
        throw new Error(`Unsupported exercise type: ${exercise.type}`);
    }
    if (stat?.wrongFlag) {
      const flag = document.createElement("p");
      flag.className = "mistake-badge";
      flag.textContent = "错题";
      content.prepend(flag);
    }
    container.replaceChildren(content);
  }

  highlightPoem(exercise) {
    const lines = document.querySelectorAll(".poem-panel-line");
    const targetLine = exercise.type === "read"
      ? exercise.line
      : exercise.knowledge
        ? lines[Number(exercise.knowledge.slice(1)) - 1]?.textContent
        : null;
    lines.forEach(line => {
      line.classList.toggle(
        "is-highlighted",
        exercise.type === "order" ||
          (targetLine !== null && targetLine !== undefined && line.textContent === targetLine)
      );
    });
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

  renderRead(container, exercise, onAnswer, isLast) {
    const characters = Array.from(exercise.line);
    const syllables = exercise.showPinyin ? exercise.pinyin.trim().split(/\s+/) : [];
    if (exercise.showPinyin && characters.length !== syllables.length) {
      throw new Error(`Pinyin count does not match line length for ${exercise.id}`);
    }
    container.innerHTML = `
      <p class="question-instruction">${escapeHtml(exercise.prompt)}</p>
      <div class="listen-character-grid" aria-label="诗句及拼音">
        ${characters.map((character, index) => `
          <span class="listen-character-cell">
            ${exercise.showPinyin ? `<span class="listen-pinyin">${escapeHtml(syllables[index])}</span>` : ""}
            <span class="tianzi-cell"><span class="tianzi-character">${escapeHtml(character)}</span></span>
          </span>
        `).join("")}
      </div>
      <button class="play-button" type="button">🔊 朗读诗句</button>
      <button class="primary-button answer-button" type="button">${isLast ? "完成跟读" : "下一句"}</button>
    `;
    container.querySelector(".play-button").addEventListener("click", () => speak(exercise.line));
    container.querySelector(".answer-button").addEventListener("click", () => onAnswer(true));
    window.setTimeout(() => speak(exercise.line), AUTO_PLAY_DELAY_MS);
  }

  renderOption(container, exercise, onAnswer) {
    const choices = shuffleOptions(exercise);
    container.innerHTML = `
      <p class="question-instruction">请选择正确答案</p>
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      ${optionsMarkup(choices.options)}
    `;
    this.bindOptions(container, choices, onAnswer);
  }

  renderOrder(container, exercise, onAnswer) {
    const lines = shuffleItems(exercise.lines.map((line, index) => ({ line, index })));
    let submitted = false;
    container.innerHTML = `
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      <ul class="order-source" aria-label="待排序诗句">
        ${lines.map(({ line, index }) => this.orderItemMarkup(line, index)).join("")}
      </ul>
      <p class="question-instruction">按顺序点击上方诗句，点击已选诗句可撤回</p>
      <ul class="order-answer" aria-label="已选诗句顺序">
        ${Array.from({ length: exercise.lines.length }, (_, index) =>
          `<li class="poem-order-slot" data-slot="${index}"></li>`
        ).join("")}
      </ul>
      <button class="primary-button order-submit" type="button">提交排序</button>
    `;

    const source = container.querySelector(".order-source");
    const target = container.querySelector(".order-answer");
    const slots = [...target.querySelectorAll(".poem-order-slot")];
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
    target.addEventListener("click", event => {
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
      [source, target].forEach(list => list.querySelectorAll(".order-item").forEach(item => {
        item.disabled = true;
      }));
      event.currentTarget.disabled = true;
      this.showAnswerFeedback(container, correct, `正确顺序：${exercise.lines.join("，")}`, onAnswer);
    });
    updateLists();
  }

  async renderSpell(container, exercise, onAnswer) {
    const answerCharacters = Array.from(normalize(exercise.answer));
    container.innerHTML = `
      ${exercise.showPinyin ? `<p class="pinyin">${escapeHtml(exercise.pinyin)}</p>` : ""}
      <p class="question-instruction">${escapeHtml(exercise.prompt)}</p>
      <p class="question-prompt">${escapeHtml(exercise.content)}</p>
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
    const correctIndexes = Array.isArray(exercise.answer) ? exercise.answer : [exercise.answer];
    if (correctIndexes.length === 0 || correctIndexes.some(index =>
      !Number.isInteger(index) || index < 0 || index >= exercise.options.length)) {
      throw new RangeError(`Invalid answer indexes for ${exercise.id}`);
    }
    const buttons = [...container.querySelectorAll(".option-button")];
    const expectedText = correctIndexes.map(index => exercise.options[index]).join("、");
    if (correctIndexes.length === 1) {
      buttons.forEach((button, index) => {
        button.addEventListener("click", () => {
          const correct = index === correctIndexes[0];
          buttons.forEach((option, optionIndex) => {
            option.disabled = true;
            if (optionIndex === correctIndexes[0]) option.classList.add("is-correct");
            else if (optionIndex === index) option.classList.add("is-wrong");
          });
          this.showAnswerFeedback(container, correct, `正确答案：${expectedText}`, onAnswer);
        });
      });
      return;
    }

    const selected = new Set();
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        if (selected.has(index)) {
          selected.delete(index);
          button.classList.remove("is-selected");
        } else {
          selected.add(index);
          button.classList.add("is-selected");
        }
      });
    });
    const submit = document.createElement("button");
    submit.className = "primary-button answer-button";
    submit.type = "button";
    submit.textContent = "提交答案";
    submit.addEventListener("click", () => {
      const correct = selected.size === correctIndexes.length &&
        correctIndexes.every(index => selected.has(index));
      buttons.forEach((button, index) => {
        button.disabled = true;
        if (correctIndexes.includes(index)) button.classList.add("is-correct");
        else if (selected.has(index)) button.classList.add("is-wrong");
      });
      submit.disabled = true;
      this.showAnswerFeedback(container, correct, `正确答案：${expectedText}`, onAnswer);
    });
    container.append(submit);
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
  const originalAnswers = Array.isArray(exercise.answer) ? exercise.answer : [exercise.answer];
  const shuffledAnswers = originalAnswers.map(answer =>
    indexedOptions.findIndex(({ index }) => index === answer));
  return {
    ...exercise,
    options: indexedOptions.map(({ option }) => option),
    answer: Array.isArray(exercise.answer) ? shuffledAnswers : shuffledAnswers[0]
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
