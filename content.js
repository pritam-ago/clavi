
const OVERLAY_ID = 'clavi-ai-minimal-overlay';
const THEME_CLASS_PREFIX = 'clavi-theme-';
let currentTheme = 'calming';

function removeOverlay() {
  const old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();
  document.documentElement.classList.remove(
    ...Array.from(document.documentElement.classList).filter(c => c.startsWith(THEME_CLASS_PREFIX))
  );
  document.documentElement.style.overflow = '';
}

function extractMainContent() {
  let main = document.querySelector('main');
  if (!main) main = document.querySelector('article');
  if (!main) main = document.body;
  // Clone to avoid breaking site
  return main.cloneNode(true);
}

async function callGeminiAPI(htmlContent, callback) {
  const apiKey = 'AIzaSyD6ULgZtW0R0NSue3oZOnGSZSBJ5AKbFA8';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  const prompt = `
  You are an assistant that extracts and summarizes the most important content from a web page for focus mode.
  
  Given the following HTML, do the following:
  - Identify and keep the main content, headings, essential navigation, and ALL important interactive elements (such as primary action buttons like "Buy", "Add to Cart", "Checkout", and any other buttons or links necessary for the main functionality of the page).
  - Analyze all images on the page. Sort them by their importance or relevance to the main content.
  - Include only the most important images (with their alt text or captions if available) in the minimal HTML output.
  - Remove ads, sidebars, popups, and non-essential elements that are not related to the main content or main actions.
  - Respond ONLY with the minimal HTML structure (headings, paragraphs, important images, and interactive elements) needed for the main content.
  - Do NOT include any <html>, <head>, <body>, or <style> tags.
  - Do NOT include any CSS or inline styles.
  - The output will be styled by the extension, so only return the content elements.
  
  HTML:
  ${htmlContent.innerHTML}
  `;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    const minimalHTML = data.candidates?.[0]?.content?.parts?.[0]?.text || '<div>AI failed to summarize.</div>';
    callback(minimalHTML);
  } catch (e) {
    callback('<div>AI request failed.</div>');
  }
}

function cleanGeminiHTML(html) {
  return html
    .replace(/^\s*```[a-zA-Z]*\s*/i, '') // Remove ``` or ```html at the start
    .replace(/```\s*$/i, '')              // Remove trailing ```
    .replace(/<\/?html.*?>/gi, '')
    .replace(/<\/?body.*?>/gi, '')
    .trim();
}

function showOverlay(minimalHTML) {
  removeOverlay();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = THEME_CLASS_PREFIX + currentTheme;

  // Always wrap AI content in a semantic section
  const wrappedHTML = `<section class="clavi-main-content">${cleanGeminiHTML(minimalHTML)}</section>`;

  overlay.innerHTML = `
    <div class="clavi-overlay-bar">
      <span>AI Summarized</span>
      <button id="clavi-exit-btn">×</button>
    </div>
    <div class="clavi-overlay-content">${wrappedHTML}</div>
  `;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 999999,
    overflow: 'auto',
    transition: 'background 0.3s',
  });
  document.body.appendChild(overlay);
  document.documentElement.classList.add(THEME_CLASS_PREFIX + currentTheme);
  document.documentElement.style.overflow = 'hidden';
  overlay.querySelector('#clavi-exit-btn').onclick = removeOverlay;

  // Rewrite all links to use the current domain if not already
  const links = overlay.querySelectorAll('a[href]');
  links.forEach(link => {
    try {
      const url = new URL(link.href, location.href);
      if (url.hostname !== location.hostname) {
        // Rewrite to current domain, preserve path/query/hash
        link.href = location.protocol + '//' + location.hostname + url.pathname + url.search + url.hash;
      }
    } catch (e) { /* ignore invalid URLs */ }
  });

  overlay.addEventListener('click', async function(e) {
    const a = e.target.closest('a');
    if (a && a.href) {
      try {
        let linkUrl = new URL(a.href, location.href);
        if (location.protocol === 'https:' && linkUrl.protocol === 'http:' && linkUrl.hostname === location.hostname) {
          linkUrl = new URL(linkUrl.href.replace(/^http:/, 'https:'));
        }
        if (linkUrl.hostname === location.hostname) {
          e.preventDefault();
          showLoadingOverlay();
          const resp = await fetch(linkUrl.href, { credentials: 'include' });
          const text = await resp.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          let main = doc.querySelector('main') || doc.querySelector('article') || doc.body;

          main = main.cloneNode(true);
          callGeminiAPI(main, (minimalHTML) => {
            showOverlay(minimalHTML);
          });
        }
      } catch (err) {
        
      }
    }
  });
}

function showLoadingOverlay() {
  removeOverlay();
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = THEME_CLASS_PREFIX + currentTheme;
  overlay.innerHTML = `
    <div class="clavi-overlay-bar">
      <span>AI Minimalized View</span>
      <button id="clavi-exit-btn">×</button>
    </div>
    <div class="clavi-overlay-content" style="text-align:center;padding:60px 0;">
      <div style="font-size:1.2em;">Generating minimal view with Gemini AI...</div>
      <div class="clavi-spinner" style="margin:32px auto;width:48px;height:48px;border:6px solid #e0e7ff;border-top:6px solid #6c63ff;border-radius:50%;animation:spin 1s linear infinite;"></div>
    </div>
    <style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>
  `;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 999999,
    overflow: 'auto',
    transition: 'background 0.3s',
  });
  document.body.appendChild(overlay);
  document.documentElement.classList.add(THEME_CLASS_PREFIX + currentTheme);
  // Prevent background scroll
  document.documentElement.style.overflow = 'hidden';
  overlay.querySelector('#clavi-exit-btn').onclick = removeOverlay;
}

function setTheme(theme, mode) {
  currentTheme = theme;
  const overlay = document.getElementById(OVERLAY_ID);
  // Remove all theme/mode classes
  document.documentElement.classList.remove(
    ...Array.from(document.documentElement.classList).filter(c => c.startsWith(THEME_CLASS_PREFIX) || c === 'light' || c === 'dark')
  );
  // Add new theme and mode classes
  document.documentElement.classList.add(THEME_CLASS_PREFIX + theme, mode);
  if (overlay) {
    overlay.className = THEME_CLASS_PREFIX + theme + ' ' + mode;
  }
}

// Update injectOverlayStyles to add dark/light mode for each theme
function injectOverlayStyles() {
  if (document.getElementById('clavi-overlay-style')) return;
  const style = document.createElement('style');
  style.id = 'clavi-overlay-style';
  style.textContent = `
    :root {
      /* Calming Theme */
      --calming-bg-light: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
      --calming-bg-dark: linear-gradient(135deg, #102542 0%, #19335c 100%);
      --calming-accent: #7ed6df;
      --calming-accent-dark: #48b1bf;
      --calming-text-light: #14505c;
      --calming-text-dark: #e0f7fa;
      --calming-bar-bg-light: linear-gradient(90deg, #b2ebf2 0%, #e0f7fa 100%);
      --calming-bar-bg-dark: #19335c;
      --calming-border: #b2ebf2;
      --calming-border-dark: #19335c;
      /* Gentle Theme */
      --gentle-bg-light: linear-gradient(120deg, #fff7fa 0%, #e6f7ff 100%);
      --gentle-bg-dark: linear-gradient(120deg, #232946 0%, #393e6e 100%);
      --gentle-accent: #f7cac9;
      --gentle-accent-dark: #b5ead7;
      --gentle-text-light: #6d4c41;
      --gentle-text-dark: #fdf6e3;
      --gentle-bar-bg-light: linear-gradient(90deg, #f7cac9 0%, #b5ead7 100%);
      --gentle-bar-bg-dark: #393e6e;
      --gentle-border: #f7cac9;
      --gentle-border-dark: #393e6e;
      /* High Contrast Theme */
      --high-bg-light: #fff;
      --high-bg-dark: #000;
      --high-accent: #ffd600;
      --high-text-light: #000;
      --high-text-dark: #fff;
      --high-bar-bg-light: #ffd600;
      --high-bar-bg-dark: #222;
      --high-border: #ffd600;
      --high-border-dark: #ffd600;
      --high-focus: 3px solid #ffd600;
    }
    /* Calming Theme */
    .${THEME_CLASS_PREFIX}calming.light #${OVERLAY_ID} {
      background: var(--calming-bg-light);
      color: var(--calming-text-light);
      border-radius: 18px;
      box-shadow: 0 8px 36px 0 #7ed6df33, 0 1.5px 8px #7ed6df22;
      font-size: 1.05em;
      line-height: 1.7;
    }
    .${THEME_CLASS_PREFIX}calming.dark #${OVERLAY_ID} {
      background: var(--calming-bg-dark);
      color: var(--calming-text-dark);
      border-radius: 18px;
      box-shadow: 0 8px 36px 0 #48b1bf33, 0 1.5px 8px #48b1bf22;
      font-size: 1.05em;
      line-height: 1.7;
    }
    .${THEME_CLASS_PREFIX}calming.light #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--calming-bar-bg-light);
      color: var(--calming-text-light);
      border-bottom: 1.5px solid var(--calming-border);
    }
    .${THEME_CLASS_PREFIX}calming.dark #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--calming-bar-bg-dark);
      color: var(--calming-text-dark);
      border-bottom: 1.5px solid var(--calming-border-dark);
    }
    .${THEME_CLASS_PREFIX}calming.light #${OVERLAY_ID} button,
    .${THEME_CLASS_PREFIX}calming.dark #${OVERLAY_ID} button {
      background: linear-gradient(90deg, var(--calming-accent) 0%, var(--calming-accent-dark) 100%);
      color: #fff;
      border-radius: 14px;
      box-shadow: 0 2px 12px #7ed6df33;
      font-weight: 700;
      font-size: 1.08em;
    }
    .${THEME_CLASS_PREFIX}calming.light #${OVERLAY_ID} button:hover,
    .${THEME_CLASS_PREFIX}calming.dark #${OVERLAY_ID} button:hover {
      background: linear-gradient(90deg, var(--calming-accent-dark) 0%, var(--calming-accent) 100%);
    }
    /* Gentle Theme */
    .${THEME_CLASS_PREFIX}gentle.light #${OVERLAY_ID} {
      background: var(--gentle-bg-light);
      color: var(--gentle-text-light);
      border-radius: 22px;
      box-shadow: 0 8px 36px 0 #f7cac933, 0 1.5px 8px #b5ead722;
      font-size: 1.08em;
      line-height: 1.8;
      font-family: Arial, Helvetica, sans-serif;
    }
    .${THEME_CLASS_PREFIX}gentle.dark #${OVERLAY_ID} {
      background: var(--gentle-bg-dark);
      color: var(--gentle-text-dark);
      border-radius: 22px;
      box-shadow: 0 8px 36px 0 #b5ead733, 0 1.5px 8px #f7cac922;
      font-size: 1.08em;
      line-height: 1.8;
      font-family: Arial, Helvetica, sans-serif;
    }
    .${THEME_CLASS_PREFIX}gentle.light #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--gentle-bar-bg-light);
      color: var(--gentle-text-light);
      border-bottom: 1.5px solid var(--gentle-border);
    }
    .${THEME_CLASS_PREFIX}gentle.dark #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--gentle-bar-bg-dark);
      color: var(--gentle-text-dark);
      border-bottom: 1.5px solid var(--gentle-border-dark);
    }
    .${THEME_CLASS_PREFIX}gentle.light #${OVERLAY_ID} button,
    .${THEME_CLASS_PREFIX}gentle.dark #${OVERLAY_ID} button {
      background: linear-gradient(90deg, var(--gentle-accent) 0%, var(--gentle-accent-dark) 100%);
      color: #6d4c41;
      border-radius: 18px;
      box-shadow: 0 2px 12px #f7cac933;
      font-weight: 700;
      font-size: 1.08em;
    }
    .${THEME_CLASS_PREFIX}gentle.light #${OVERLAY_ID} button:hover,
    .${THEME_CLASS_PREFIX}gentle.dark #${OVERLAY_ID} button:hover {
      background: linear-gradient(90deg, var(--gentle-accent-dark) 0%, var(--gentle-accent) 100%);
    }
    /* High Contrast Theme */
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} {
      background: var(--high-bg-light);
      color: var(--high-text-light);
      border-radius: 0px;
      box-shadow: 0 8px 36px 0 #ffd60055, 0 1.5px 8px #ffd60033;
      font-size: 1.18em;
      line-height: 1.6;
      font-family: Arial, Helvetica, sans-serif;
    }
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} {
      background: var(--high-bg-dark);
      color: var(--high-text-dark);
      border-radius: 0px;
      box-shadow: 0 8px 36px 0 #ffd60055, 0 1.5px 8px #ffd60033;
      font-size: 1.18em;
      line-height: 1.6;
      font-family: Arial, Helvetica, sans-serif;
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--high-bar-bg-light);
      color: var(--high-text-light);
      border-bottom: 2.5px solid var(--high-border);
    }
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} .clavi-overlay-bar {
      background: var(--high-bar-bg-dark);
      color: var(--high-text-dark);
      border-bottom: 2.5px solid var(--high-border-dark);
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} button,
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} button {
      background: var(--high-accent);
      color: #000;
      border-radius: 0px;
      font-weight: 900;
      font-size: 1.22em;
      border: 2.5px solid var(--high-border);
      box-shadow: 0 2px 12px #ffd60055;
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} button:hover,
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} button:hover {
      background: #fff;
      color: #000;
      border: 2.5px solid var(--high-border);
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} a,
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} a {
      color: var(--high-accent);
      font-weight: 900;
      font-size: 1.13em;
      text-decoration: underline;
      outline: none;
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} a:focus,
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} a:focus {
      outline: var(--high-focus) !important;
      background: #222;
      color: var(--high-accent);
    }
    .${THEME_CLASS_PREFIX}high-contrast.light #${OVERLAY_ID} *,
    .${THEME_CLASS_PREFIX}high-contrast.dark #${OVERLAY_ID} * {
      outline-color: var(--high-accent);
    }
    /* Shared overlay content styles */
    #${OVERLAY_ID} .clavi-overlay-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 18px; font-size: 1.1em; font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    #${OVERLAY_ID} .clavi-overlay-bar button {
      background: none; border: none; font-size: 1.5em; cursor: pointer; color: #888;
      transition: color 0.2s;
    }
    #${OVERLAY_ID} .clavi-overlay-bar button:hover { color: #ff1744; }
    #${OVERLAY_ID} .clavi-overlay-content { padding: 24px 18px; max-width: 900px; margin: 0 auto; }
    #${OVERLAY_ID} img {
      display: block;
      margin: 24px auto 12px auto;
      max-width: 100%;
      max-height: 300px;
      border-radius: 12px;
      box-shadow: 0 2px 12px #0001;
      object-fit: contain;
    }
    #${OVERLAY_ID} figure {
      margin: 0 0 24px 0;
      text-align: center;
    }
    #${OVERLAY_ID} figcaption {
      font-size: 0.98em;
      color: #666;
      margin-top: 4px;
      font-style: italic;
    }
    #${OVERLAY_ID} button, #${OVERLAY_ID} input[type="button"], #${OVERLAY_ID} input[type="submit"] {
      padding: 12px 28px;
      transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
      outline: none;
      display: inline-block;
      margin: 12px 8px 12px 0;
    }
    #${OVERLAY_ID} a {
      text-decoration: underline;
      font-weight: 500;
      transition: color 0.2s, background 0.2s;
      border-radius: 4px;
      padding: 2px 4px;
    }
    #${OVERLAY_ID} a:hover, #${OVERLAY_ID} a:focus {
      text-decoration: none;
      outline: none;
    }
    #${OVERLAY_ID} .clavi-main-content {
      display: flex;
      flex-direction: column;
      gap: 1.5em;
      padding: 1em 0;
      max-width: 800px;
      margin: 0 auto;
    }
    #${OVERLAY_ID} .clavi-main-content h1,
    #${OVERLAY_ID} .clavi-main-content h2,
    #${OVERLAY_ID} .clavi-main-content h3 {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
      font-weight: bold;
    }
    #${OVERLAY_ID} .clavi-main-content p {
      margin: 0.5em 0;
      line-height: 1.7;
    }
    #${OVERLAY_ID} .clavi-main-content button,
    #${OVERLAY_ID} .clavi-main-content a {
      margin-top: 1em;
    }
  `;
  document.head.appendChild(style);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AI_MINIMALIZE') {
    injectOverlayStyles();
    const mainContent = extractMainContent();
    showLoadingOverlay();
    callGeminiAPI(mainContent, (minimalHTML) => {
      showOverlay(minimalHTML);
    });
  }
  if (msg.type === 'THEME_CHANGE') {
    setTheme(msg.theme, msg.mode);
  }
  if (msg.type === 'AI_CONTENT_ONLY') {
    injectOverlayStyles();
    const mainContent = extractMainContent();
    showLoadingOverlay();
    callGeminiAPI_contentOnly(mainContent, (minimalHTML) => {
      showOverlay(minimalHTML);
    });
  }
});

async function callGeminiAPI_contentOnly(htmlContent, callback) {
  const apiKey = 'AIzaSyD6ULgZtW0R0NSue3oZOnGSZSBJ5AKbFA8';
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  const prompt = `Summarize the main content of this page in plain, simple HTML. No extras, no navigation, no images, no buttons—just the core text and headings.\n\nHTML:\n${htmlContent.innerHTML}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    const minimalHTML = data.candidates?.[0]?.content?.parts?.[0]?.text || '<div>AI failed to summarize.</div>';
    callback(minimalHTML);
  } catch (e) {
    callback('<div>AI request failed.</div>');
  }
} 