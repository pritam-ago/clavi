// neuroEXT: AI Minimalization and Theme Overlay
// Receives messages from popup to minimalize page and change theme

const OVERLAY_ID = 'neuroext-ai-minimal-overlay';
const THEME_CLASS_PREFIX = 'neuroext-theme-';
let currentTheme = 'calming';

function removeOverlay() {
  const old = document.getElementById(OVERLAY_ID);
  if (old) old.remove();
  document.documentElement.classList.remove(
    ...Array.from(document.documentElement.classList).filter(c => c.startsWith(THEME_CLASS_PREFIX))
  );
  // Restore scrolling
  document.documentElement.style.overflow = '';
}

function extractMainContent() {
  // Try to extract <main>, <article>, or fallback to <body>
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
    You are an assistant that extracts and summarizes the most important content from a web page for focus mode.\n
    Given the following HTML, do the following:
    - Identify and keep the main content, headings, essential navigation, and ALL important interactive elements (such as primary action buttons like “Buy”, “Add to Cart”, “Checkout”, and any other buttons or links necessary for the main functionality of the page).
    - Analyze all images on the page. Sort them by their importance or relevance to the main content.
    - Include only the most important images (with their alt text or captions if available) in the minimal HTML output.
    - Remove ads, sidebars, popups, and non-essential elements that are not related to the main content or main actions.
    - Respond ONLY with the minimal, readable HTML that includes the sorted important images, their context, and all preserved interactive elements.
    
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
  // Remove leading/trailing <html>, <body>, whitespace, and code block markers
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
  overlay.innerHTML = `
    <div class="neuroext-overlay-bar">
      <span>AI Summarized</span>
      <button id="neuroext-exit-btn">×</button>
    </div>
    <div class="neuroext-overlay-content">${cleanGeminiHTML(minimalHTML)}</div>
  `;
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 999999,
    overflow: 'auto',
    background: '#fff', // changed from rgba(255,255,255,0.98)
    transition: 'background 0.3s',
  });
  document.body.appendChild(overlay);
  document.documentElement.classList.add(THEME_CLASS_PREFIX + currentTheme);
  // Prevent background scroll
  document.documentElement.style.overflow = 'hidden';
  // Exit button
  overlay.querySelector('#neuroext-exit-btn').onclick = removeOverlay;

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

  // Intercept link clicks for in-overlay navigation
  overlay.addEventListener('click', async function(e) {
    const a = e.target.closest('a');
    if (a && a.href) {
      try {
        let linkUrl = new URL(a.href, location.href);
        // If current page is https, link is http, and same hostname, upgrade to https
        if (location.protocol === 'https:' && linkUrl.protocol === 'http:' && linkUrl.hostname === location.hostname) {
          linkUrl = new URL(linkUrl.href.replace(/^http:/, 'https:'));
        }
        if (linkUrl.hostname === location.hostname) {
          e.preventDefault();
          showLoadingOverlay();
          // Fetch the new page's HTML
          const resp = await fetch(linkUrl.href, { credentials: 'include' });
          const text = await resp.text();
          // Create a DOM to extract main content
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          let main = doc.querySelector('main') || doc.querySelector('article') || doc.body;
          // Clone to avoid issues
          main = main.cloneNode(true);
          callGeminiAPI(main, (minimalHTML) => {
            showOverlay(minimalHTML);
          });
        }
      } catch (err) {
        // fallback: let the link behave normally
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
    <div class="neuroext-overlay-bar">
      <span>AI Minimalized View</span>
      <button id="neuroext-exit-btn">×</button>
    </div>
    <div class="neuroext-overlay-content" style="text-align:center;padding:60px 0;">
      <div style="font-size:1.2em;">Generating minimal view with Gemini AI...</div>
      <div class="neuroext-spinner" style="margin:32px auto;width:48px;height:48px;border:6px solid #e0e7ff;border-top:6px solid #6c63ff;border-radius:50%;animation:spin 1s linear infinite;"></div>
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
    background: '#fff', // changed from rgba(255,255,255,0.98)
    transition: 'background 0.3s',
  });
  document.body.appendChild(overlay);
  document.documentElement.classList.add(THEME_CLASS_PREFIX + currentTheme);
  // Prevent background scroll
  document.documentElement.style.overflow = 'hidden';
  overlay.querySelector('#neuroext-exit-btn').onclick = removeOverlay;
}

function setTheme(theme) {
  currentTheme = theme;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.className = THEME_CLASS_PREFIX + theme;
  }
  document.documentElement.classList.remove(
    ...Array.from(document.documentElement.classList).filter(c => c.startsWith(THEME_CLASS_PREFIX))
  );
  document.documentElement.classList.add(THEME_CLASS_PREFIX + theme);
}

// Add overlay styles for themes
function injectOverlayStyles() {
  if (document.getElementById('neuroext-overlay-style')) return;
  const style = document.createElement('style');
  style.id = 'neuroext-overlay-style';
  style.textContent = `
    #${OVERLAY_ID} { font-family: 'Segoe UI', Arial, sans-serif; }
    #${OVERLAY_ID} .neuroext-overlay-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 18px; font-size: 1.1em; font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
      background: #f6f7fb;
      color: #333;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    #${OVERLAY_ID} .neuroext-overlay-bar button {
      background: none; border: none; font-size: 1.5em; cursor: pointer; color: #888;
      transition: color 0.2s;
    }
    #${OVERLAY_ID} .neuroext-overlay-bar button:hover { color: #ff1744; }
    #${OVERLAY_ID} .neuroext-overlay-content { padding: 24px 18px; max-width: 900px; margin: 0 auto; }
    /* Image and Figure Styling */
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
    /* Enhanced Button Styling */
    #${OVERLAY_ID} button, #${OVERLAY_ID} input[type="button"], #${OVERLAY_ID} input[type="submit"] {
      background: linear-gradient(90deg, #6c63ff 0%, #7c3aed 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 28px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px #6c63ff22;
      margin: 12px 8px 12px 0;
      transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
      outline: none;
      display: inline-block;
    }
    #${OVERLAY_ID} button:hover, #${OVERLAY_ID} input[type="button"]:hover, #${OVERLAY_ID} input[type="submit"]:hover {
      background: linear-gradient(90deg, #7c3aed 0%, #6c63ff 100%);
      box-shadow: 0 4px 16px #6c63ff33;
      transform: translateY(-2px) scale(1.04);
    }
    #${OVERLAY_ID} button:active, #${OVERLAY_ID} input[type="button"]:active, #${OVERLAY_ID} input[type="submit"]:active {
      background: #6c63ff;
      box-shadow: 0 1px 4px #6c63ff22;
      transform: scale(0.98);
    }
    /* Enhanced Link Styling */
    #${OVERLAY_ID} a {
      color: #6c63ff;
      text-decoration: underline;
      font-weight: 500;
      transition: color 0.2s, background 0.2s;
      border-radius: 4px;
      padding: 2px 4px;
    }
    #${OVERLAY_ID} a:hover, #${OVERLAY_ID} a:focus {
      color: #fff;
      background: #6c63ff;
      text-decoration: none;
      outline: none;
    }
    /* Calming Theme */
    .${THEME_CLASS_PREFIX}calming #${OVERLAY_ID} { background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%); color: #333; }
    .${THEME_CLASS_PREFIX}calming #${OVERLAY_ID} .neuroext-overlay-bar { background: #e0e7ff; color: #6c63ff; }
    /* Gentle Theme */
    .${THEME_CLASS_PREFIX}gentle #${OVERLAY_ID} { background: linear-gradient(120deg, #fdf6e3 0%, #e0f7fa 100%); color: #444; font-family: 'Comic Neue', 'Comic Sans MS', cursive, sans-serif; }
    .${THEME_CLASS_PREFIX}gentle #${OVERLAY_ID} .neuroext-overlay-bar { background: #ffe082; color: #7c3aed; }
    /* High Contrast Theme */
    .${THEME_CLASS_PREFIX}high-contrast #${OVERLAY_ID} { background: #fff; color: #000; font-family: 'Arial Black', Arial, sans-serif; }
    .${THEME_CLASS_PREFIX}high-contrast #${OVERLAY_ID} .neuroext-overlay-bar { background: #000; color: #fff; }
    .${THEME_CLASS_PREFIX}high-contrast #${OVERLAY_ID} .neuroext-overlay-bar button { color: #fff; }
    .${THEME_CLASS_PREFIX}high-contrast #${OVERLAY_ID} .neuroext-overlay-bar button:hover { color: #ff1744; }
  `;
  document.head.appendChild(style);
}

// Listen for messages from popup
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
    setTheme(msg.theme);
  }
}); 