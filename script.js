const state = {
  gameId: null,
  timeLeft: 200,
  timerId: null,
  playing: false,
  history: [],
  yes: 0,
  no: 0,
  hintShown: false
};

const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:5173" : "";

const elements = {
  timerValue: document.querySelector("#timerValue"),
  hintText: document.querySelector("#hintText"),
  statusPill: document.querySelector("#statusPill"),
  askForm: document.querySelector("#askForm"),
  guessForm: document.querySelector("#guessForm"),
  questionInput: document.querySelector("#questionInput"),
  guessInput: document.querySelector("#guessInput"),
  resultBox: document.querySelector("#resultBox"),
  newGameButton: document.querySelector("#newGameButton"),
  revealButton: document.querySelector("#revealButton"),
  askedCount: document.querySelector("#askedCount"),
  yesCount: document.querySelector("#yesCount"),
  noCount: document.querySelector("#noCount"),
  historyList: document.querySelector("#historyList")
};

async function startNewGame() {
  setBusy(true, "正在随机出题...");

  try {
    const response = await fetch(`${API_BASE}/api/start`, { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "出题失败");
    }

    state.gameId = data.gameId;
    state.timeLeft = data.timeLimit;
    state.playing = true;
    state.history = [];
    state.yes = 0;
    state.no = 0;
    state.hintShown = false;

    elements.hintText.textContent = "倒计时到50s出线索";
    document.querySelector("#hintCard")?.classList.remove("revealed");
    elements.statusPill.textContent = "进行中";
    elements.statusPill.className = "status-pill";
    elements.resultBox.textContent = "题目已随机生成。请从第一个“是否”问题开始。";
    elements.resultBox.className = "result-box";
    elements.questionInput.value = "";
    elements.guessInput.value = "";
    setInputsDisabled(false);
    updateStats();
    renderHistory();
    updateTimer();
    stopTimer();
    state.timerId = window.setInterval(tick, 1000);
    elements.questionInput.focus();
  } catch (error) {
    elements.resultBox.textContent = error.message;
    elements.resultBox.className = "result-box warn";
  } finally {
    setBusy(false);
  }
}

function tick() {
  state.timeLeft -= 1;
  updateTimer();

  if (state.timeLeft <= 0) {
    revealAnswer("时间到");
    return;
  }

  if (state.timeLeft === 50 && !state.hintShown) {
    requestHint();
  }
}

function updateTimer() {
  elements.timerValue.textContent = String(Math.max(state.timeLeft, 0));
  elements.timerValue.parentElement.classList.toggle("danger", state.timeLeft <= 30);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

async function askQuestion(questionText) {
  const question = questionText.trim();
  if (!state.playing || !question) {
    return;
  }

  setBusy(true, "AI 正在判断...");

  try {
    const data = await postJson("/api/ask", {
      gameId: state.gameId,
      question
    });

    recordAnswer(question, data.answer);
    elements.resultBox.textContent = data.answer;
    elements.resultBox.className = `result-box ${data.answer === "是" ? "yes" : "no"}`;
    elements.questionInput.value = "";
  } catch (error) {
    elements.resultBox.textContent = error.message;
    elements.resultBox.className = "result-box warn";
  } finally {
    setBusy(false);
  }
}

async function submitGuess(guessText) {
  const guess = guessText.trim();
  if (!state.playing || !guess) {
    return;
  }

  setBusy(true, "正在核对答案...");

  try {
    const data = await postJson("/api/guess", {
      gameId: state.gameId,
      guess
    });

    if (data.correct) {
      endGame(true, `回答正确，答案是：${data.answer}`);
    } else {
      recordAnswer(`猜答案：${guess}`, "否");
      elements.resultBox.textContent = "否";
      elements.resultBox.className = "result-box no";
      elements.guessInput.value = "";
    }
  } catch (error) {
    elements.resultBox.textContent = error.message;
    elements.resultBox.className = "result-box warn";
  } finally {
    setBusy(false);
  }
}

async function revealAnswer(reason = "已揭晓") {
  if (!state.gameId) {
    return;
  }

  try {
    const data = await postJson("/api/reveal", { gameId: state.gameId });
    endGame(false, `${reason}，答案是：${data.answer}`);
  } catch (error) {
    elements.resultBox.textContent = error.message;
    elements.resultBox.className = "result-box warn";
  }
}

async function requestHint() {
  if (!state.playing || !state.gameId || state.hintShown) {
    return;
  }

  state.hintShown = true;

  try {
    const data = await postJson("/api/hint", { gameId: state.gameId });
    elements.hintText.textContent = data.hint;
    const hintCard = document.querySelector("#hintCard");
    hintCard?.classList.add("revealed");
    hintCard?.classList.remove("hint-pop");
    window.requestAnimationFrame(() => hintCard?.classList.add("hint-pop"));
    state.history.unshift({ question: "系统提示", answer: data.hint });
    renderHistory();
  } catch (error) {
    elements.hintText.textContent = "提示暂时获取失败，继续靠提问也可以。";
  }
}

function recordAnswer(question, answer) {
  state.history.unshift({ question, answer });
  state.yes += answer === "是" ? 1 : 0;
  state.no += answer === "否" ? 1 : 0;
  updateStats();
  renderHistory();
}

function endGame(didWin, message) {
  state.playing = false;
  stopTimer();
  elements.statusPill.textContent = didWin ? "已猜中" : "已结束";
  elements.statusPill.className = `status-pill ${didWin ? "win" : "lose"}`;
  elements.resultBox.textContent = message;
  elements.resultBox.className = didWin ? "result-box yes" : "result-box warn";
  setInputsDisabled(true);
}

async function postJson(url, payload) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }

  return data;
}

function setBusy(isBusy, message = "") {
  elements.askForm.querySelector("button").disabled = isBusy || !state.playing;
  elements.guessForm.querySelector("button").disabled = isBusy || !state.playing;
  elements.newGameButton.disabled = isBusy;
  elements.revealButton.disabled = isBusy || !state.playing;

  if (isBusy && message) {
    elements.resultBox.textContent = message;
    elements.resultBox.className = "result-box";
  }
}

function setInputsDisabled(disabled) {
  elements.questionInput.disabled = disabled;
  elements.guessInput.disabled = disabled;
  elements.askForm.querySelector("button").disabled = disabled;
  elements.guessForm.querySelector("button").disabled = disabled;
  elements.revealButton.disabled = disabled;
}

function updateStats() {
  elements.askedCount.textContent = String(state.history.length);
  elements.yesCount.textContent = String(state.yes);
  elements.noCount.textContent = String(state.no);
}

function renderHistory() {
  elements.historyList.innerHTML = state.history
    .map((record) => `<div class="history-item"><strong>${record.answer}</strong>${escapeHtml(record.question)}</div>`)
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

elements.askForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askQuestion(elements.questionInput.value);
});

elements.guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitGuess(elements.guessInput.value);
});

elements.newGameButton.addEventListener("click", startNewGame);
elements.revealButton.addEventListener("click", () => revealAnswer("已揭晓"));

startNewGame();
