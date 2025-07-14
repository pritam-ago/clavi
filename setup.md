# Setup: clavi – AI Clarity Viewer

Follow these steps to run and use the clavi Chrome extension locally.

## Features

- **AI Minimalize (Gemini Summarizer)**: Summarizes and cleans up web pages using Gemini AI. Includes a “Content Only” mode for extracting just the main text and headings. Works on any page via the popup.
- **Theme & Mode Switching**: Three themes (Calming, Gentle, High Contrast) and Light/Dark mode toggle for accessibility and comfort.

## Prerequisites

- Google Chrome browser (or Chromium-based browser)

## 1. Clone or Download the Repository

- Clone with Git:
  ```sh
  git clone <repo-url>
  cd neuroEXT
  ```
- Or download and unzip the source code.

## 2. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `neuroEXT` folder (the root of this project)
5. The extension should now appear in your extensions list

## 3. Usage

- Click the extension icon to open the popup.
- Use the "Summarize Page" button to minimalize the current tab using Gemini AI.
- Use the Content Only mode for ultra-minimal reading.
- Switch between Calming, Gentle, and High Contrast themes, and toggle Light/Dark mode.

## 4. Troubleshooting

- If the extension doesn't work, try reloading it in `chrome://extensions/`.
- Check the browser console for errors (right-click popup > Inspect).
- If you update the code, click the "Reload" button in the extensions page.

---

For more help, see the README or open an issue!
