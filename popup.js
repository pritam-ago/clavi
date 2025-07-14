// --- AI Minimalize Button ---
const aiBtn = document.getElementById('ai-minimalize-btn');
aiBtn.onclick = () => {
  if (chrome.tabs) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'AI_MINIMALIZE' });
      }
    });
  }
};

// --- Theme and Mode Switcher ---
const modeToggle = document.getElementById('mode-toggle-checkbox');
const modeLabel = document.getElementById('mode-label');

function applyThemeAndMode(theme, mode) {
  document.body.classList.remove('calming', 'gentle', 'high-contrast', 'light', 'dark');
  document.body.classList.add(theme, mode);
  modeLabel.textContent = mode === 'dark' ? 'Dark Mode' : 'Light Mode';
  // Send to content script
  if (chrome.tabs) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'THEME_CHANGE', theme: theme, mode: mode });
      }
    });
  }
}

function saveThemeAndMode(theme, mode) {
  chrome.storage.local.set({ theme: theme, mode: mode });
}

// On theme change
const themeSelect = document.getElementById('theme-select');
themeSelect.addEventListener('change', () => {
  const theme = themeSelect.value;
  const mode = modeToggle.checked ? 'dark' : 'light';
  applyThemeAndMode(theme, mode);
  saveThemeAndMode(theme, mode);
});

// On mode toggle
modeToggle.addEventListener('change', () => {
  const theme = themeSelect.value;
  const mode = modeToggle.checked ? 'dark' : 'light';
  applyThemeAndMode(theme, mode);
  saveThemeAndMode(theme, mode);
});

// Restore last used theme and mode
chrome.storage.local.get(['theme', 'mode'], ({ theme, mode }) => {
  theme = theme || 'calming';
  mode = mode || 'light';
  themeSelect.value = theme;
  modeToggle.checked = (mode === 'dark');
  applyThemeAndMode(theme, mode);
});

// --- Pomodoro Timer ---
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-timer');
const pauseBtn = document.getElementById('pause-timer');
const resetBtn = document.getElementById('reset-timer');
let timerInterval = null;
let timerState = { running: false, timeLeft: 1500, mode: 'work' };

function updateTimerDisplay() {
  const min = String(Math.floor(timerState.timeLeft / 60)).padStart(2, '0');
  const sec = String(timerState.timeLeft % 60).padStart(2, '0');
  timerDisplay.textContent = `${min}:${sec}`;
}
function saveTimerState() {
  chrome.storage.local.set({ pomodoro: timerState });
}
function loadTimerState() {
  chrome.storage.local.get('pomodoro', ({ pomodoro }) => {
    if (pomodoro) timerState = pomodoro;
    updateTimerDisplay();
  });
}
function startTimer() {
  if (timerInterval) return;
  timerState.running = true;
  timerInterval = setInterval(() => {
    if (timerState.timeLeft > 0) {
      timerState.timeLeft--;
      updateTimerDisplay();
      saveTimerState();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      timerState.running = false;
      chrome.runtime.sendMessage({ type: 'POMODORO_COMPLETE', mode: timerState.mode });
      if (timerState.mode === 'work') {
        timerState.mode = 'break';
        timerState.timeLeft = 300;
      } else {
        timerState.mode = 'work';
        timerState.timeLeft = 1500;
      }
      updateTimerDisplay();
      saveTimerState();
    }
  }, 1000);
}
function pauseTimer() {
  timerState.running = false;
  clearInterval(timerInterval);
  timerInterval = null;
  saveTimerState();
}
function resetTimer() {
  timerState.running = false;
  clearInterval(timerInterval);
  timerInterval = null;
  timerState.mode = 'work';
  timerState.timeLeft = 1500;
  updateTimerDisplay();
  saveTimerState();
}
startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;
loadTimerState();
if (timerState.running) startTimer();

// --- Blocklist ---
const blockInput = document.getElementById('block-input');
const addBlockBtn = document.getElementById('add-block');
const blocklistEl = document.getElementById('blocklist');
function renderBlocklist(list) {
  blocklistEl.innerHTML = '';
  list.forEach((site, idx) => {
    const li = document.createElement('li');
    li.textContent = site;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = () => {
      list.splice(idx, 1);
      chrome.storage.local.set({ blocklist: list });
      renderBlocklist(list);
      chrome.runtime.sendMessage({ type: 'BLOCKLIST_UPDATE', blocklist: list });
    };
    li.appendChild(del);
    blocklistEl.appendChild(li);
  });
}
addBlockBtn.onclick = () => {
  const val = blockInput.value.trim();
  if (!val) return;
  chrome.storage.local.get('blocklist', ({ blocklist = [] }) => {
    if (!blocklist.includes(val)) {
      blocklist.push(val);
      chrome.storage.local.set({ blocklist });
      renderBlocklist(blocklist);
      chrome.runtime.sendMessage({ type: 'BLOCKLIST_UPDATE', blocklist });
    }
  });
  blockInput.value = '';
};
chrome.storage.local.get('blocklist', ({ blocklist = [] }) => renderBlocklist(blocklist));

// --- Task List ---
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task');
const tasklistEl = document.getElementById('tasklist');
function renderTasklist(list) {
  tasklistEl.innerHTML = '';
  list.forEach((task, idx) => {
    const li = document.createElement('li');
    li.textContent = task;
    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = () => {
      list.splice(idx, 1);
      chrome.storage.local.set({ tasklist: list });
      renderTasklist(list);
    };
    li.appendChild(del);
    tasklistEl.appendChild(li);
  });
}
addTaskBtn.onclick = () => {
  const val = taskInput.value.trim();
  if (!val) return;
  chrome.storage.local.get('tasklist', ({ tasklist = [] }) => {
    tasklist.push(val);
    chrome.storage.local.set({ tasklist });
    renderTasklist(tasklist);
  });
  taskInput.value = '';
};
chrome.storage.local.get('tasklist', ({ tasklist = [] }) => renderTasklist(tasklist));

// --- Mood Check-in ---
const emojis = document.querySelectorAll('.emoji');
emojis.forEach(emoji => {
  emoji.onclick = () => {
    emojis.forEach(e => e.classList.remove('selected'));
    emoji.classList.add('selected');
    chrome.storage.local.set({ mood: emoji.dataset.mood });
  };
});
chrome.storage.local.get('mood', ({ mood }) => {
  if (mood) {
    const selected = document.querySelector(`.emoji[data-mood="${mood}"]`);
    if (selected) selected.classList.add('selected');
  }
});

// --- AI Nudge Placeholder ---
const aiNudge = document.getElementById('ai-nudge-placeholder');
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AI_NUDGE') {
    aiNudge.textContent = msg.nudge;
  }
});
aiNudge.textContent = '[Gemini AI motivational nudge here]'; 