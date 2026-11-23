import { speak } from "../utils/speech.js";
import { AUTO_PLAY_DELAY_MS, POEM_BLOCK_MOVE_DURATION_MS } from "../config.js";
import { getCharacterSea } from "../data/characterLibrary.js";

const correctAnswerAudio = new Audio(new URL("../data/src/soundeffects/correct.wav", import.meta.url));
const incorrectAnswerAudio = new Audio(new URL("../data/src/soundeffects/incorrect.wav", import.meta.url));

export class QuestionRenderer {
  render(container, exercise, onAnswer, isLast = false, userState = null) {
    this.restorePoemPanel();
    this.highlightPoemLines(exercise.highlight);
    this.coverPoemLines(exercise.covered);
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

  coverPoemLines(covered = []) {
    if (!Array.isArray(covered)) {
      throw new TypeError("Exercise covered coordinates must be an array");
    }
    const poemLines = document.querySelectorAll(".poem-panel-line");
    covered.forEach(([couplet, lineInCouplet]) => {
      if (!Number.isInteger(couplet) || couplet < 1 ||
          !Number.isInteger(lineInCouplet) || lineInCouplet < 1 || lineInCouplet > 2) {
        throw new RangeError(`Invalid covered coordinate: ${couplet},${lineInCouplet}`);
      }
      const poemLineIndex = (couplet - 1) * 2 + lineInCouplet - 1;
      const poemLine = poemLines[poemLineIndex];
      if (!poemLine) throw new RangeError(`Covered poem line does not exist: ${couplet},${lineInCouplet}`);

      const blank = document.createElement("span");
      blank.className = "poem-covered-blank";
      blank.style.minWidth = `${Array.from(poemLine.textContent).length}em`;
      blank.dataset.lineIndex = String(poemLineIndex);
      blank.setAttribute("aria-label", "诗句已隐藏");
      poemLine.replaceChildren(blank);
    });
  }

  highlightPoemLines(highlight = []) {
    if (!Array.isArray(highlight)) {
      throw new TypeError("Exercise highlight coordinates must be an array");
    }
    const poemLines = document.querySelectorAll(".poem-panel-line");
    highlight.forEach(([couplet, lineInCouplet]) => {
      if (!Number.isInteger(couplet) || couplet < 1 ||
          !Number.isInteger(lineInCouplet) || lineInCouplet < 1 || lineInCouplet > 2) {
        throw new RangeError(`Invalid highlight coordinate: ${couplet},${lineInCouplet}`);
      }
      const poemLineIndex = (couplet - 1) * 2 + lineInCouplet - 1;
      const poemLine = poemLines[poemLineIndex];
      if (!poemLine) {
        throw new RangeError(`Highlighted poem line does not exist: ${couplet},${lineInCouplet}`);
      }
      poemLine.classList.add("is-highlighted");
    });
  }

  restorePoemPanel() {
    const poemLines = document.querySelector(".poem-lines");
    if (!poemLines?.dataset.originalMarkup) return;
    poemLines.classList.remove("poem-order-target");
    poemLines.querySelectorAll(".poem-panel-line.is-highlighted").forEach(line => {
      line.classList.remove("is-highlighted");
    });
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
      <button class="play-button" type="button">🔊 朗读</button>
      <button class="primary-button answer-button" type="button">${isLast ? "完成跟读" : "下一句"}</button>
    `;
    container.querySelector(".play-button").addEventListener("click", () => speak(exercise.line));
    container.querySelector(".answer-button").addEventListener("click", () => onAnswer(true));
    window.setTimeout(() => speak(exercise.line), AUTO_PLAY_DELAY_MS);
  }

  renderOption(container, exercise, onAnswer) {
    const choices = shuffleOptions(exercise);
    container.innerHTML = `
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      <h2>${escapeHtml(exercise.content)}</h2>
      ${optionsMarkup(choices.options)}
    `;
    this.bindOptions(container, choices, onAnswer);
  }

  renderOrder(container, exercise, onAnswer) {
    const poemLineCount = document.querySelectorAll(".poem-panel-line").length;
    if (exercise.lines.length === poemLineCount &&
        exercise.covered?.length === poemLineCount) {
      this.renderWholePoemOrder(container, exercise, onAnswer);
      return;
    }

    const lines = shuffleItems(exercise.lines.map((line, index) => ({ line, index })));
    let submitted = false;
    container.innerHTML = `
      <p class="question-prompt">${escapeHtml(exercise.prompt)}</p>
      <ul class="order-source" aria-label="待排序诗句">
        ${lines.map(({ line, index }) => this.orderItemMarkup(line, index)).join("")}
      </ul>
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

  renderWholePoemOrder(container, exercise, onAnswer) {
    const layout = container.closest(".learning-layout");
    if (!layout) throw new Error("Missing .learning-layout");
    layout.classList.add("is-poem-open");

    const poemLines = document.querySelectorAll(".poem-panel-line");
    const targets = exercise.covered.map(([couplet, lineInCouplet]) => {
      const lineIndex = (couplet - 1) * 2 + lineInCouplet - 1;
      if (!Number.isInteger(lineIndex) || !poemLines[lineIndex]) {
        throw new RangeError(`Covered poem line does not exist: ${couplet},${lineInCouplet}`);
      }
      const target = document.querySelector(`.poem-covered-blank[data-line-index="${lineIndex}"]`);
      if (!target) throw new Error(`Missing covered poem target for ${exercise.id}`);
      target.classList.add("is-poem-order-target");
      target.setAttribute("aria-label", "诗句排序位置");
      return target;
    });
    const blocks = shuffleItems(exercise.lines.map((line, index) => ({ line, index })));
    let submitted = false;
    container.innerHTML = `
      <div class="poem-order-block-bank" aria-label="可选诗句">
        ${blocks.map(({ line, index }) => `
          <button class="poem-order-block" type="button" data-block-index="${index}">
            ${escapeHtml(line)}
          </button>
        `).join("")}
      </div>
      <button class="primary-button answer-button" type="button" disabled>提交排序</button>
    `;

    const bank = container.querySelector(".poem-order-block-bank");
    const submitButton = container.querySelector(".answer-button");
    const updateSubmit = () => {
      submitButton.disabled = targets.some(target => !target.querySelector(".poem-order-block"));
    };

    // 阅读顺序：第一个还空着的目标格
    const firstEmptyTarget = () => targets.find(target => !target.querySelector(".poem-order-block"));

    // 把块移入目标格（保留块元素本身；虚线框仍在，块作为子元素放入）
    const placeBlock = (target, block) => {
      if (submitted || !target || target.querySelector(".poem-order-block")) return;
      const startRect = block.getBoundingClientRect();
      target.replaceChildren(block);
      block.classList.remove("is-selected");
      target.classList.add("is-filled");
      animateMove(block, startRect);
      updateSubmit();
    };

    // 点击字库块 -> 自动填入第一个空格
    bank.addEventListener("click", event => {
      const block = event.target.closest(".poem-order-block");
      if (!block || submitted) return;
      const target = firstEmptyTarget();
      if (target) placeBlock(target, block);
    });

    // 点击左侧面板：点已放入的块 -> 撤回字库
    targets.forEach(target => {
      target.addEventListener("click", event => {
        if (submitted) return;
        const placedBlock = event.target.closest(".poem-order-block");
        if (!placedBlock) return;
        const startRect = placedBlock.getBoundingClientRect();
        bank.append(placedBlock);
        target.classList.remove("is-filled");
        animateMove(placedBlock, startRect);
        updateSubmit();
      });
    });

    submitButton.addEventListener("click", () => {
      if (submitted) return;
      submitted = true;
      targets.forEach(target => {
        const block = target.querySelector(".poem-order-block");
        if (block) block.disabled = true;
      });
      bank.querySelectorAll(".poem-order-block").forEach(block => {
        block.disabled = true;
      });
      const correct = targets.every((target, index) =>
          Number(target.querySelector(".poem-order-block")?.dataset.blockIndex) === index);
      this.showAnswerFeedback(container, correct, `正确顺序：${exercise.lines.join("，")}`, onAnswer);
    });
  }

  async renderSpell(container, exercise, onAnswer) {
    if(exercise.prompt === undefined || exercise.content === undefined || exercise.answer === undefined) {
        throw new Error("Exercise is missing required properties");
    }
    const answerCharacters = Array.from(normalize(exercise.answer));
    container.innerHTML = `
      ${exercise.showPinyin ? `<p class="pinyin">${escapeHtml(exercise.pinyin)}</p>` : ""}
      <p class="question-instruction">${escapeHtml(exercise.prompt)}</p>
      <p class="question-prompt">${escapeHtml(exercise.content)}</p>
      <div class="recite-answer-row">
        <p class="recite-answer" aria-live="polite"></p>
        <button class="secondary-button recite-clear" type="button">清空</button>
      </div>
      <div class="character-sea" aria-label="可选汉字"></div>
      <button class="primary-button answer-button" type="button" disabled>提交</button>
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
    submit.textContent = "提交";
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

    incorrectAnswerAudio.currentTime = 0;
    incorrectAnswerAudio.play().catch(error => {
      console.warn("无法播放答错音效。", error);
    });
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
    feedback.textContent = correct ? "✓ 正确" : `✗ ${wrongMessage}`;
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