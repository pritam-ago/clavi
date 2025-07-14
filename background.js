// --- State ---
let focusMode = 'deep';
let blocklist = [];
let pomodoro = { running: false, timeLeft: 1500, mode: 'work' };

chrome.storage.local.get(['focusMode', 'blocklist', 'pomodoro'], (data) => {
  focusMode = data.focusMode || 'deep';
  blocklist = data.blocklist || [];
  pomodoro = data.pomodoro || pomodoro;
});

// --- Mode Switching ---
// --- Blocking Logic (declarativeNetRequest) ---
function updateBlockingRules() {
  if (focusMode !== 'deep' || !blocklist.length) {
    // Remove all dynamic rules
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: blocklist.map((_, i) => i + 1),
      addRules: []
    });
    return;
  }
  // Create rules for each blocked site
  const rules = blocklist.map((site, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: site, resourceTypes: ["main_frame"] }
  }));
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: blocklist.map((_, i) => i + 1),
    addRules: rules
  });
}

// Listen for mode/blocklist changes and update rules
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'MODE_CHANGE') {
    focusMode = msg.mode;
    chrome.storage.local.set({ focusMode });
    updateBlockingRules();
  }
  if (msg.type === 'BLOCKLIST_UPDATE') {
    blocklist = msg.blocklist;
    chrome.storage.local.set({ blocklist });
    updateBlockingRules();
  }
  if (msg.type === 'POMODORO_COMPLETE') {
    // Placeholder for AI nudge
    chrome.notifications.create({
      type: 'basic',
      title: 'Pomodoro',
      message: msg.mode === 'work' ? 'Time for a break!' : 'Back to focus!'
    });
    chrome.runtime.sendMessage({ type: 'AI_NUDGE', nudge: '[Gemini AI: Great job! Take a break.]' });
  }
});

// On startup, update rules
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['focusMode', 'blocklist'], (data) => {
    focusMode = data.focusMode || 'deep';
    blocklist = data.blocklist || [];
    updateBlockingRules();
  });
});

// --- Pomodoro Timer (alarms) ---
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro') {
    chrome.storage.local.get('pomodoro', ({ pomodoro }) => {
      if (!pomodoro) return;
      if (pomodoro.timeLeft > 0 && pomodoro.running) {
        pomodoro.timeLeft--;
        chrome.storage.local.set({ pomodoro });
        chrome.alarms.create('pomodoro', { delayInMinutes: 1/60 });
      } else if (pomodoro.running) {
        chrome.runtime.sendMessage({ type: 'POMODORO_COMPLETE', mode: pomodoro.mode });
        pomodoro.running = false;
        chrome.storage.local.set({ pomodoro });
      }
    });
  }
});
// Start timer if running
chrome.storage.local.get('pomodoro', ({ pomodoro }) => {
  if (pomodoro && pomodoro.running) {
    chrome.alarms.create('pomodoro', { delayInMinutes: 1/60 });
  }
}); 