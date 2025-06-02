// Word Memory Assistant - Content Script

// --- Global Variables ---
let isHotkeyPressed = false;
let hotkeyPressTimer = null;
let activeHotkey = null;
let savedWords = {};
let lastMouseEvent = null;
let mutationObserver = null;
let triggerButton = null;
let stylePalette = null;
let currentSelectedText = null;
let currentSelectionRect = null;

// --- Style Constants ---
const STYLE_DEFAULT = 'default';
const STYLE_GREEN = 'green';
const STYLE_UNDERLINE = 'underline';
const STYLE_BLUE = 'blue';
const STYLE_YELLOW_BG = 'yellow_bg';
const STYLE_BOLD = 'bold';
const STYLE_ITALIC_UNDERLINE = 'italic_underline';
const STYLE_CUSTOM_A = 'custom_a';
const STYLE_CUSTOM_B = 'custom_b';
const STYLE_CUSTOM_C = 'custom_c';
const STYLE_CUSTOM_D = 'custom_d';

// --- UI Helper Functions ---

// Function to escape special characters for use in a regular expression
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper to escape attribute values
function escapeAttribute(text) {
    if (text === null || typeof text === 'undefined') return '';
    return text.toString().replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function ensureTriggerButtonExists() {
  if (!triggerButton) {
    triggerButton = document.createElement('button');
    triggerButton.id = 'word-memory-trigger-btn';
    triggerButton.textContent = 'W';
    // console.log("Trigger button created.");

    if (!triggerButton.hasEventListener) {
        triggerButton.addEventListener('click', function(event) {
            event.stopPropagation();
            if (currentSelectedText && currentSelectionRect) { // Ensure rect is also valid
                populateStylePalette(); // Uses global currentSelectedText for data-word attributes
                showAndPositionStylePalette(currentSelectedText, currentSelectionRect); // Pass both
            }
        });
        triggerButton.hasEventListener = true;
    }
  }
}

function ensureStylePaletteExists() {
  if (!stylePalette) {
    stylePalette = document.createElement('div');
    stylePalette.id = 'word-memory-inline-palette';
    // console.log("Style palette container created.");
  }
}

function hideTriggerButton() {
  if (triggerButton) {
    triggerButton.style.display = 'none';
  }
  currentSelectedText = null;
  currentSelectionRect = null;
}

function hideStylePalette() {
  if (stylePalette) {
    stylePalette.style.display = 'none';
  }
  hideTriggerButton(); // Also hides trigger and clears selection state
}

function showTriggerButton() {
  ensureTriggerButtonExists();
  if (!triggerButton || !currentSelectionRect) return;

  if (!document.body.contains(triggerButton)) {
    document.body.appendChild(triggerButton);
  }

  const buttonHeight = triggerButton.offsetHeight || 28;
  const buttonWidth = triggerButton.offsetWidth || 28;

  let top = currentSelectionRect.top + window.scrollY - buttonHeight - 5;
  let left = currentSelectionRect.left + window.scrollX + (currentSelectionRect.width / 2) - (buttonWidth / 2);

  if (top < window.scrollY) top = currentSelectionRect.bottom + window.scrollY + 5;
  if (left < window.scrollX) left = window.scrollX + 5;
  if (left + buttonWidth > window.scrollX + document.documentElement.clientWidth) {
      left = window.scrollX + document.documentElement.clientWidth - buttonWidth - 5;
  }
   if (top < window.scrollY) top = window.scrollY + 5;


  triggerButton.style.top = `${top}px`;
  triggerButton.style.left = `${left}px`;
  triggerButton.style.display = 'block';
}

function populateStylePalette() {
  ensureStylePaletteExists();
  if (!stylePalette || !currentSelectedText) {
    return;
  }

  const safeSelectedText = escapeAttribute(currentSelectedText);
  // Active style indication will be handled in showAndPositionStylePalette

  stylePalette.innerHTML = `
    <div class="action-row1">
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_DEFAULT}" title="Default Style (Red)">2</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_GREEN}" title="Green Style">3</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_UNDERLINE}" title="Underline Style">4</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-action="delete" title="Remove">5</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_CUSTOM_A}" title="Custom Style A">A</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_CUSTOM_B}" title="Custom Style B">B</button>
    </div>
    <div class="action-row2">
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_BLUE}" title="Blue Style">6</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_YELLOW_BG}" title="Yellow BG">7</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_BOLD}" title="Bold Style">8</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_ITALIC_UNDERLINE}" title="Italic Underline">9</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_CUSTOM_C}" title="Custom Style C">C</button>
      <button class="inline-style-btn" data-word="${safeSelectedText}" data-style="${STYLE_CUSTOM_D}" title="Custom Style D">D</button>
    </div>
  `;

  const paletteButtons = stylePalette.querySelectorAll('.inline-style-btn');
  paletteButtons.forEach(btn => {
    btn.addEventListener('click', handlePaletteButtonClick);
  });
}

function handlePaletteButtonClick(event) {
  event.stopPropagation(); // Prevent click from bubbling to document click listener that hides UI

  const button = event.currentTarget;
  const selectedText = button.dataset.word; // This was set during populateStylePalette
  const style = button.dataset.style;
  const action = button.dataset.action;

  console.log("Word Memory Assistant: Inline palette button clicked."); // For debugging
  if (selectedText) { // Check if selectedText is not undefined or null
    console.log("  Target Text:", selectedText);
  }
  if (style) {
    console.log("  Action: Apply style -", style);
    // Future logic:
    // const normalizedText = selectedText.toLowerCase().trim().replace(/\s+/g, ' ');
    // if (isWordSaved(normalizedText)) {
    //   applyStyle(normalizedText, style);
    // } else {
    //   addWordToList(normalizedText, style);
    // }
    // showMessage for style applied
    // hideStylePalette();
  } else if (action === 'delete') {
    console.log("  Action: Delete word");
    // Future logic:
    // const normalizedText = selectedText.toLowerCase().trim().replace(/\s+/g, ' ');
    // removeWordFromList(normalizedText);
    // showMessage for word removed
    // hideStylePalette();
  }
}

function showAndPositionStylePalette(textForPalette, rect) { // Parameters updated
  ensureStylePaletteExists();
  if (!stylePalette ||
      !textForPalette ||
      !rect ||
      typeof rect.top !== 'number' ||
      typeof rect.left !== 'number' ||
      typeof rect.width !== 'number' ||
      typeof rect.bottom !== 'number') {
    console.error("Word Memory Assistant: showAndPositionStylePalette called with invalid or incomplete rect/text. \nText:", textForPalette, "\nRect:", rect ? JSON.stringify(rect) : rect);
    return;
  }

  if (!document.body.contains(stylePalette)) {
    document.body.appendChild(stylePalette);
  }

  // Populate palette uses global currentSelectedText, which is fine because this function
  // is called immediately after populateStylePalette in the trigger button's listener,
  // and currentSelectedText has not been cleared yet.

  const paletteHeight = stylePalette.offsetHeight || 70; // Adjusted estimate
  const paletteWidth = stylePalette.offsetWidth || 180;  // Adjusted estimate

  let top = rect.top + window.scrollY - paletteHeight - 5;
  let left = rect.left + window.scrollX + (rect.width / 2) - (paletteWidth / 2);

  // Boundary checks using 'rect'
  if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + 5;
  }
  if (left < window.scrollX) left = window.scrollX + 5;
  if (left + paletteWidth > window.scrollX + document.documentElement.clientWidth) {
      left = window.scrollX + document.documentElement.clientWidth - paletteWidth - 5;
  }
  if (top < window.scrollY) top = window.scrollY + 5; // Final check if it flipped

  stylePalette.style.top = `${top}px`;
  stylePalette.style.left = `${left}px`;

  // Update active style indication using textForPalette
  const actualStyleOfSelectedText = getWordStyle(textForPalette) || STYLE_DEFAULT;
  const paletteButtons = stylePalette.querySelectorAll('.inline-style-btn[data-style]');
  paletteButtons.forEach(button => {
    button.classList.remove('active-style-btn');
    if (button.dataset.style === actualStyleOfSelectedText) {
      button.classList.add('active-style-btn');
    }
  });

  stylePalette.style.display = 'block';
  hideTriggerButton(); // Call this LAST, after all uses of globals that it clears.
}

// --- Core Logic for Selection Handling ---
function handleTextSelection(event) {
  hideStylePalette();

  const selection = window.getSelection();
  let selectedText = selection.toString();

  selectedText = selectedText.trim();
  selectedText = selectedText.replace(/\s+/g, ' ');

  if (!selectedText || selectedText.length < 2) {
    return;
  }

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    currentSelectionRect = range.getBoundingClientRect();
    currentSelectedText = selectedText;

    ensureTriggerButtonExists();

    setTimeout(function() {
      const stillSelectedText = window.getSelection().toString().trim().replace(/\s+/g, ' ');
      if (currentSelectedText && stillSelectedText === currentSelectedText) {
        showTriggerButton();
      } else {
        hideStylePalette();
      }
    }, 50);
  } else {
    hideStylePalette();
  }
}

// --- Event Listeners & Initial Setup ---
// Load saved words from storage
chrome.storage.local.get(['savedWordsMap'], function(result) {
  if (result.savedWordsMap && typeof result.savedWordsMap === 'object') {
    savedWords = result.savedWordsMap;
  } else {
    chrome.storage.local.get(['savedWords'], function(oldResult) {
      if (oldResult.savedWords && Array.isArray(oldResult.savedWords)) {
        savedWords = {};
        oldResult.savedWords.forEach(word => {
          savedWords[word] = { style: STYLE_DEFAULT };
        });
        saveWordsToStorage();
      } else {
        savedWords = {};
      }
    });
  }

  function onDomReady() {
    ensureTriggerButtonExists();
    ensureStylePaletteExists();
    if (Object.keys(savedWords).length > 0) {
      highlightSavedWords();
    }
    initMutationObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }
});

// Storage Change Listener
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.savedWordsMap) {
    console.log("Word Memory Assistant: savedWordsMap changed externally. Updating content script's savedWords.");
    const newWordsMap = changes.savedWordsMap.newValue || {};
    savedWords = newWordsMap;

    const allHighlightSelectors = [
      '.word-memory-highlight', `.word-memory-highlight-${STYLE_GREEN}`,
      `.word-memory-highlight-${STYLE_UNDERLINE}`, `.word-memory-highlight-${STYLE_BLUE}`,
      `.word-memory-highlight-${STYLE_YELLOW_BG}`, `.word-memory-highlight-${STYLE_BOLD}`,
      `.word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`, `.word-memory-highlight-${STYLE_CUSTOM_A}`,
      `.word-memory-highlight-${STYLE_CUSTOM_B}`, `.word-memory-highlight-${STYLE_CUSTOM_C}`,
      `.word-memory-highlight-${STYLE_CUSTOM_D}`
    ];
    try {
      document.querySelectorAll(allHighlightSelectors.join(', ')).forEach(span => {
          const parent = span.parentElement;
          if (parent) {
              parent.replaceChild(document.createTextNode(span.textContent), span);
              parent.normalize();
          }
      });
    } catch (e) {
      console.error("Word Memory Assistant: Error removing old highlights:", e);
    }

    if (Object.keys(savedWords).length > 0) {
        highlightSavedWords();
    }
  }
});

// Mouse/Document Event Listeners
document.addEventListener('mousemove', function(e) {
  lastMouseEvent = e;
});

document.addEventListener('click', function(event) {
  let clickedOnExtensionUI = false;
  if (triggerButton && triggerButton.style.display === 'block' && triggerButton.contains(event.target)) {
    clickedOnExtensionUI = true;
  }
  if (stylePalette && stylePalette.style.display === 'block' && stylePalette.contains(event.target)) {
    clickedOnExtensionUI = true;
  }

  if (!clickedOnExtensionUI) {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
        hideStylePalette();
    } else {
        if (stylePalette && stylePalette.style.display === 'block') {
            hideStylePalette();
        }
    }
  }
}, true);

document.addEventListener('mouseup', function(event) {
  if (triggerButton && triggerButton.contains(event.target)) return;
  if (stylePalette && stylePalette.style.display === 'block' && stylePalette.contains(event.target)) return;
  handleTextSelection(event);
});

document.addEventListener('dblclick', function(event) {
  if (triggerButton && triggerButton.contains(event.target)) return;
  if (stylePalette && stylePalette.style.display === 'block' && stylePalette.contains(event.target)) return;
  handleTextSelection(event);
});


// --- Hotkey & Word/Style Logic --- (Includes functions called by UI helpers or event listeners)

function getSelectedWord() {
  return lastMouseEvent ? getWordUnderCursor(lastMouseEvent) : null;
}

function isWordSaved(word) {
  return word && savedWords.hasOwnProperty(word);
}

function getWordStyle(word) {
  if (isWordSaved(word)) {
    return savedWords[word].style;
  }
  return null;
}

const HOTKEYS = ['2', '3', '4', '5', '6', '7', '8', '9'];
document.addEventListener('keydown', function(e) {
  if (HOTKEYS.includes(e.key) && !isHotkeyPressed) {
    isHotkeyPressed = true;
    activeHotkey = e.key;
    clearTimeout(hotkeyPressTimer);

    hotkeyPressTimer = setTimeout(() => {
      if (isHotkeyPressed && activeHotkey && lastMouseEvent) {
        const word = getSelectedWord();
        if (word && word.length > 2) {
          handleHotkeyAction(activeHotkey, word);
        }
      }
      isHotkeyPressed = false;
      activeHotkey = null;
    }, 500);
  }
});

document.addEventListener('keyup', function(e) {
  if (HOTKEYS.includes(e.key)) {
    if (isHotkeyPressed && activeHotkey === e.key) {
      clearTimeout(hotkeyPressTimer);
      isHotkeyPressed = false;
      activeHotkey = null;
    }
  }
});

function handleHotkeyAction(key, word) {
  const wordIsSaved = isWordSaved(word);
  const currentStyle = getWordStyle(word);

  switch (key) {
    case '2':
      if (wordIsSaved) {
        if (currentStyle === STYLE_GREEN || currentStyle === STYLE_UNDERLINE) {
          applyStyle(word, STYLE_DEFAULT);
          showMessage(`"${word}" style changed to default.`, 'info');
        } else {
          removeWordFromList(word);
        }
      } else {
        addWordToList(word, STYLE_DEFAULT);
      }
      break;
    case '3':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_GREEN) {
          applyStyle(word, STYLE_GREEN);
          showMessage(`"${word}" style changed to green.`, 'info');
        } else {
          showMessage(`"${word}" is already green.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_GREEN);
      }
      break;
    case '4':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_UNDERLINE) {
          applyStyle(word, STYLE_UNDERLINE);
          showMessage(`"${word}" style changed to underline.`, 'info');
        } else {
          showMessage(`"${word}" is already underline.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_UNDERLINE);
      }
      break;
    case '5':
      if (wordIsSaved) {
        removeWordFromList(word);
      } else {
        showMessage(`"${word}" is not in your list.`, 'info');
      }
      break;
    case '6':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_BLUE) {
          applyStyle(word, STYLE_BLUE);
          showMessage(`"${word}" style changed to blue.`, 'info');
        } else {
          showMessage(`"${word}" is already blue.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_BLUE);
      }
      break;
    case '7':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_YELLOW_BG) {
          applyStyle(word, STYLE_YELLOW_BG);
          showMessage(`"${word}" style changed to yellow background.`, 'info');
        } else {
          showMessage(`"${word}" is already yellow background.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_YELLOW_BG);
      }
      break;
    case '8':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_BOLD) {
          applyStyle(word, STYLE_BOLD);
          showMessage(`"${word}" style changed to bold.`, 'info');
        } else {
          showMessage(`"${word}" is already bold.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_BOLD);
      }
      break;
    case '9':
      if (wordIsSaved) {
        if (currentStyle !== STYLE_ITALIC_UNDERLINE) {
          applyStyle(word, STYLE_ITALIC_UNDERLINE);
          showMessage(`"${word}" style changed to italic underline.`, 'info');
        } else {
          showMessage(`"${word}" is already italic underline.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_ITALIC_UNDERLINE);
      }
      break;
  }
}

function getWordUnderCursor(e) {
  const element = e.target;
  let word = null;

  const highlightClasses = [
    'word-memory-highlight',
    `word-memory-highlight-${STYLE_GREEN}`,
    `word-memory-highlight-${STYLE_UNDERLINE}`,
    `word-memory-highlight-${STYLE_BLUE}`,
    `word-memory-highlight-${STYLE_YELLOW_BG}`,
    `word-memory-highlight-${STYLE_BOLD}`,
    `word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`,
    `word-memory-highlight-${STYLE_CUSTOM_A}`,
    `word-memory-highlight-${STYLE_CUSTOM_B}`,
    `word-memory-highlight-${STYLE_CUSTOM_C}`,
    `word-memory-highlight-${STYLE_CUSTOM_D}`
  ];
  for (const cls of highlightClasses) {
    if (element.classList.contains(cls)) {
      const textFromHighlight = element.textContent.toLowerCase().trim();
      if (textFromHighlight.length > 2 && /^[a-zA-Z]+$/.test(textFromHighlight)) {
        return textFromHighlight;
      } else {
        return null;
      }
    }
  }
  
  if (element.tagName === 'SCRIPT' || 
      element.tagName === 'STYLE' ||
      element.closest('.word-memory-message')) {
    return null;
  }
  
  const range = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    const textNode = range.startContainer;
    const offset = range.startOffset;
    const textContent = textNode.textContent;
    let start = offset, end = offset;
    while (start > 0 && /[a-zA-Z]/.test(textContent[start - 1])) start--;
    while (end < textContent.length && /[a-zA-Z]/.test(textContent[end])) end++;
    if (start < end) {
      word = textContent.substring(start, end).toLowerCase();
    }
  }
  
  if (!word && (element.textContent || element.innerText)) {
     const text = (element.textContent || element.innerText).trim();
     const wordsInElement = text.split(/\s+/);
     if (wordsInElement.length > 0) {
        const potentialWord = wordsInElement[0].toLowerCase().replace(/[^a-z]/gi, '');
        if (potentialWord.length > 2) word = potentialWord;
     }
  }

  const resultWord = (word && word.length > 2 && /^[a-zA-Z]+$/.test(word)) ? word : null;
  return resultWord;
}

function addWordToList(word, style) {
  if (!word || !style) return;
  savedWords[word] = { style: style, added: Date.now() };
  saveWordsToStorage();
  removeHighlight(word);
  applyStyleToWordOccurrences(word, style);
  showMessage(`"${word}" added with ${style} style.`, 'success');
}

function removeWordFromList(word) {
  if (!isWordSaved(word)) return;
  delete savedWords[word];
  saveWordsToStorage();
  removeHighlight(word);
  showMessage(`"${word}" removed from your word list.`, 'info');
}

function applyStyle(word, newStyle) {
  if (!word || !newStyle) return;
  if (savedWords.hasOwnProperty(word)) {
    savedWords[word].style = newStyle;
    saveWordsToStorage();
    removeHighlight(word);
    applyStyleToWordOccurrences(word, newStyle);
  } else {
    console.warn(`applyStyle called for word "${word}" which was not found in savedWords. This may indicate a logic error.`);
  }
}

function saveWordsToStorage() {
  chrome.storage.local.set({
    savedWordsMap: savedWords
  });
}

function getHighlightClass(style) {
  if (style === STYLE_GREEN) return `word-memory-highlight-${STYLE_GREEN}`;
  if (style === STYLE_UNDERLINE) return `word-memory-highlight-${STYLE_UNDERLINE}`;
  if (style === STYLE_BLUE) return `word-memory-highlight-${STYLE_BLUE}`;
  if (style === STYLE_YELLOW_BG) return `word-memory-highlight-${STYLE_YELLOW_BG}`;
  if (style === STYLE_BOLD) return `word-memory-highlight-${STYLE_BOLD}`;
  if (style === STYLE_ITALIC_UNDERLINE) return `word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`;
  if (style === STYLE_CUSTOM_A) return `word-memory-highlight-${STYLE_CUSTOM_A}`;
  if (style === STYLE_CUSTOM_B) return `word-memory-highlight-${STYLE_CUSTOM_B}`;
  if (style === STYLE_CUSTOM_C) return `word-memory-highlight-${STYLE_CUSTOM_C}`;
  if (style === STYLE_CUSTOM_D) return `word-memory-highlight-${STYLE_CUSTOM_D}`;
  return 'word-memory-highlight';
}

function applyStyleToWordOccurrences(word, style, rootNode = document.body) {
  const className = getHighlightClass(style);
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        if (node.parentElement) {
          const parentTag = node.parentElement.tagName;
          const parentClassList = node.parentElement.classList;
          if (parentTag === 'SCRIPT' || parentTag === 'STYLE' ||
              parentClassList.contains('word-memory-highlight') ||
              parentClassList.contains(`word-memory-highlight-${STYLE_GREEN}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_UNDERLINE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_BLUE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_YELLOW_BG}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_BOLD}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_A}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_B}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_C}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_D}`) ||
              node.parentElement.closest('.word-memory-highlight, .word-memory-highlight-green, .word-memory-highlight-underline, .word-memory-highlight-blue, .word-memory-highlight-yellow_bg, .word-memory-highlight-bold, .word-memory-highlight-italic_underline, .word-memory-highlight-custom_a, .word-memory-highlight-custom_b, .word-memory-highlight-custom_c, .word-memory-highlight-custom_d')) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  const textNodesToReplace = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    if (rootNode.contains(currentNode) && regex.test(currentNode.textContent)) {
      regex.lastIndex = 0;
      textNodesToReplace.push(currentNode);
    }
  }

  textNodesToReplace.forEach(textNode => {
    if (!textNode.parentElement || !rootNode.contains(textNode)) return;
    
    const parentClasses = textNode.parentElement.classList;
    if (parentClasses.contains('word-memory-highlight') ||
        parentClasses.contains(`word-memory-highlight-${STYLE_GREEN}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_UNDERLINE}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_BLUE}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_YELLOW_BG}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_BOLD}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_CUSTOM_A}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_CUSTOM_B}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_CUSTOM_C}`) ||
        parentClasses.contains(`word-memory-highlight-${STYLE_CUSTOM_D}`)) {
        return;
    }

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(textNode.textContent)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(textNode.textContent.substring(lastIndex, match.index)));
      }
      const span = document.createElement('span');
      span.className = className;
      span.textContent = match[0];
      fragment.appendChild(span);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < textNode.textContent.length) {
      fragment.appendChild(document.createTextNode(textNode.textContent.substring(lastIndex)));
    }
    if (fragment.childNodes.length > 0) {
      textNode.parentElement.replaceChild(fragment, textNode);
    }
  });
}

function highlightSavedWords() {
  const wordsToHighlight = Object.keys(savedWords);
  wordsToHighlight.sort((a, b) => b.length - a.length);

  wordsToHighlight.forEach(word => {
    if (savedWords.hasOwnProperty(word)) {
      applyStyleToWordOccurrences(word, savedWords[word].style, document.body);
    }
  });
}

function removeHighlight(word) {
  const highlightSelectors = [
    '.word-memory-highlight', 
    `.word-memory-highlight-${STYLE_GREEN}`,
    `.word-memory-highlight-${STYLE_UNDERLINE}`,
    `.word-memory-highlight-${STYLE_BLUE}`,
    `.word-memory-highlight-${STYLE_YELLOW_BG}`,
    `.word-memory-highlight-${STYLE_BOLD}`,
    `.word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`,
    `.word-memory-highlight-${STYLE_CUSTOM_A}`,
    `.word-memory-highlight-${STYLE_CUSTOM_B}`,
    `.word-memory-highlight-${STYLE_CUSTOM_C}`,
    `.word-memory-highlight-${STYLE_CUSTOM_D}`
  ];
  highlightSelectors.forEach(selector => {
    const highlights = document.querySelectorAll(selector);
    highlights.forEach(highlight => {
      if (highlight.textContent.toLowerCase() === word.toLowerCase()) {
        const parent = highlight.parentElement;
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
        }
      }
    });
  });
}

function showMessage(text, type) {
  const message = document.createElement('div');
  message.className = `word-memory-message ${type}`;
  message.textContent = text;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    message.classList.remove('show');
    setTimeout(() => {
      if (message.parentElement) {
        message.parentElement.removeChild(message);
      }
    }, 300);
  }, 2000);
}

// MutationObserver callback and initialization
function mutationCallback(mutationsList, observer) {
  if (Object.keys(savedWords).length === 0) {
    return;
  }

  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(addedNode => {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          const classList = addedNode.classList;
          if (classList && (classList.contains('word-memory-highlight') ||
              classList.contains(`word-memory-highlight-${STYLE_GREEN}`) ||
              classList.contains(`word-memory-highlight-${STYLE_UNDERLINE}`) ||
              classList.contains(`word-memory-highlight-${STYLE_BLUE}`) ||
              classList.contains(`word-memory-highlight-${STYLE_YELLOW_BG}`) ||
              classList.contains(`word-memory-highlight-${STYLE_BOLD}`) ||
              classList.contains(`word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`) ||
              classList.contains(`word-memory-highlight-${STYLE_CUSTOM_A}`) ||
              classList.contains(`word-memory-highlight-${STYLE_CUSTOM_B}`) ||
              classList.contains(`word-memory-highlight-${STYLE_CUSTOM_C}`) ||
              classList.contains(`word-memory-highlight-${STYLE_CUSTOM_D}`)) ||
              addedNode.closest('.word-memory-message') ||
              addedNode.tagName === 'SCRIPT' || 
              addedNode.tagName === 'STYLE') {
            return; 
          }
          const wordsToApply = Object.keys(savedWords).sort((a, b) => b.length - a.length);
          wordsToApply.forEach(word => {
            if (savedWords.hasOwnProperty(word)) {
                 applyStyleToWordOccurrences(word, savedWords[word].style, addedNode);
            }
          });

        } else if (addedNode.nodeType === Node.TEXT_NODE && addedNode.parentElement) {
          const parentElement = addedNode.parentElement;
          const parentClassList = parentElement.classList;
          if (parentClassList && (parentClassList.contains('word-memory-highlight') ||
              parentClassList.contains(`word-memory-highlight-${STYLE_GREEN}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_UNDERLINE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_BLUE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_YELLOW_BG}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_BOLD}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_ITALIC_UNDERLINE}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_A}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_B}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_C}`) ||
              parentClassList.contains(`word-memory-highlight-${STYLE_CUSTOM_D}`)) ||
              parentElement.closest('.word-memory-message') ||
              parentElement.tagName === 'SCRIPT' ||
              parentElement.tagName === 'STYLE') {
            return;
          }
          const wordsToApply = Object.keys(savedWords).sort((a, b) => b.length - a.length);
          wordsToApply.forEach(word => {
            if (savedWords.hasOwnProperty(word)) {
                applyStyleToWordOccurrences(word, savedWords[word].style, parentElement);
            }
          });
        }
      });
    }
  }
}

function initMutationObserver() {
  if (mutationObserver) {
    return; 
  }
  const observerOptions = {
    childList: true, 
    subtree: true    
  };
  mutationObserver = new MutationObserver(mutationCallback);
  mutationObserver.observe(document.body, observerOptions);
}

// Message Listener from Popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getWords') {
    const wordsWithDetails = [];
    for (const word in savedWords) {
      if (savedWords.hasOwnProperty(word)) {
        wordsWithDetails.push({
          word: word,
          style: savedWords[word].style,
          added: savedWords[word].added
        });
      }
    }
    sendResponse({words: wordsWithDetails});
  } else if (request.action === 'removeWord') {
    removeWordFromList(request.word);
    sendResponse({success: true});
  } else if (request.action === 'clearAllWords') {
    const wordsToRemove = Object.keys(savedWords);
    savedWords = {};
    saveWordsToStorage();
    
    wordsToRemove.forEach(word => removeHighlight(word)); 
    
    sendResponse({success: true});
  } else if (request.action === 'applyStyleToWord') {
    if (request.word && request.style) {
      applyStyle(request.word, request.style);
      showMessage(`"${request.word}" style changed to ${request.style}.`, 'info');
      sendResponse({success: true});
    } else {
      sendResponse({success: false, error: "Missing word or style for applyStyleToWord"});
    }
  }
});