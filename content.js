// Word Memory Assistant - Content Script

let isHotkeyPressed = false;
let hotkeyPressTimer = null;
let activeHotkey = null; // To track which hotkey is pressed ('2', '3', '4', '5')
let savedWords = {}; // Changed from Set to Object to store words and their styles
let lastMouseEvent = null;
let mutationObserver = null;

// Default style
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

// Load saved words from storage
chrome.storage.local.get(['savedWordsMap'], function(result) {
  if (result.savedWordsMap && typeof result.savedWordsMap === 'object') {
    savedWords = result.savedWordsMap;
  } else {
    // Migration from old Set format if necessary
    chrome.storage.local.get(['savedWords'], function(oldResult) {
      if (oldResult.savedWords && Array.isArray(oldResult.savedWords)) {
        savedWords = {};
        oldResult.savedWords.forEach(word => {
          savedWords[word] = { style: STYLE_DEFAULT };
        });
        saveWordsToStorage(); // Save in new format
      } else {
        savedWords = {};
      }
    });
  }

  function onDomReady() {
    if (Object.keys(savedWords).length > 0) {
      highlightSavedWords(); // Initial highlight for static content
    }
    initMutationObserver(); // Start observing for dynamic content
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }
});

// Listen for storage changes to sync savedWords and update highlights
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.savedWordsMap) {
    console.log("Word Memory Assistant: savedWordsMap changed externally. Updating content script's savedWords.");
    const newWordsMap = changes.savedWordsMap.newValue || {};
    // const oldWordsMap = changes.savedWordsMap.oldValue || {}; // Not strictly needed for current "remove all, re-highlight all" strategy

    // Update the in-memory savedWords
    savedWords = newWordsMap;

    // Remove all existing highlights first
    // This list should ideally be dynamically generated or kept exhaustive
    // Based on previous steps, this list is already exhaustive.
    const allHighlightSelectors = [
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

    // Re-apply highlights for the new state
    if (Object.keys(savedWords).length > 0) { // Only highlight if there are words to highlight
        highlightSavedWords();
    }
  }
});

// Track mouse position
document.addEventListener('mousemove', function(e) {
  lastMouseEvent = e;
});

// --- Helper Functions ---
// Function to escape special characters for use in a regular expression
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

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

// --- Hotkey Event Listeners ---
const HOTKEYS = ['2', '3', '4', '5', '6', '7', '8', '9'];
document.addEventListener('keydown', function(e) {
  if (HOTKEYS.includes(e.key) && !isHotkeyPressed) {
    isHotkeyPressed = true;
    activeHotkey = e.key;
    clearTimeout(hotkeyPressTimer);

    hotkeyPressTimer = setTimeout(() => {
      if (isHotkeyPressed && activeHotkey && lastMouseEvent) {
        const word = getSelectedWord();
        if (word && word.length > 2) { // Basic validation
          handleHotkeyAction(activeHotkey, word);
        }
      }
      // Reset after action or if conditions not met
      isHotkeyPressed = false;
      activeHotkey = null;
    }, 500); // 0.5-second delay
  }
});

document.addEventListener('keyup', function(e) {
  if (HOTKEYS.includes(e.key)) {
    if (isHotkeyPressed && activeHotkey === e.key) {
      // Key was released before 0.5s timer fired
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
          // Change to default style
          applyStyle(word, STYLE_DEFAULT);
          showMessage(`"${word}" style changed to default.`, 'info');
        } else {
          // If default or any other, remove it (toggle off)
          removeWordFromList(word);
          // message is shown by removeWordFromList
        }
      } else {
        // Add with default style
        addWordToList(word, STYLE_DEFAULT);
        // message is shown by addWordToList
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
        // message is shown by removeWordFromList
      } else {
        showMessage(`"${word}" is not in your list.`, 'info');
      }
      break;
    case '6': // STYLE_BLUE
      if (wordIsSaved) {
        if (currentStyle !== STYLE_BLUE) {
          applyStyle(word, STYLE_BLUE);
          showMessage(`"${word}" style changed to blue.`, 'info');
        } else {
          showMessage(`"${word}" is already blue.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_BLUE); // Message is handled by addWordToList
      }
      break;
    case '7': // STYLE_YELLOW_BG
      if (wordIsSaved) {
        if (currentStyle !== STYLE_YELLOW_BG) {
          applyStyle(word, STYLE_YELLOW_BG);
          showMessage(`"${word}" style changed to yellow background.`, 'info');
        } else {
          showMessage(`"${word}" is already yellow background.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_YELLOW_BG); // Message is handled by addWordToList
      }
      break;
    case '8': // STYLE_BOLD
      if (wordIsSaved) {
        if (currentStyle !== STYLE_BOLD) {
          applyStyle(word, STYLE_BOLD);
          showMessage(`"${word}" style changed to bold.`, 'info');
        } else {
          showMessage(`"${word}" is already bold.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_BOLD); // Message is handled by addWordToList
      }
      break;
    case '9': // STYLE_ITALIC_UNDERLINE
      if (wordIsSaved) {
        if (currentStyle !== STYLE_ITALIC_UNDERLINE) {
          applyStyle(word, STYLE_ITALIC_UNDERLINE);
          showMessage(`"${word}" style changed to italic underline.`, 'info');
        } else {
          showMessage(`"${word}" is already italic underline.`, 'info');
        }
      } else {
        addWordToList(word, STYLE_ITALIC_UNDERLINE); // Message is handled by addWordToList
      }
      break;
  }
}

// Extract word under cursor
function getWordUnderCursor(e) {
  const element = e.target;
  let word = null;

  // Priority 1: Check if the cursor is directly over a highlight span
  const highlightClasses = [
    'word-memory-highlight', // Default style
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
  
  // Priority 2: Skip script, style, or our own message elements if not a highlight
  if (element.tagName === 'SCRIPT' || 
      element.tagName === 'STYLE' ||
      element.closest('.word-memory-message')) {
    return null;
  }
  
  // Priority 3: Try multiple methods (simplified for brevity, original logic was more complex)
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
     // Basic word extraction if caretRangeFromPoint fails or not on text node
     // This is a simplified fallback. A more robust solution might involve
     // more sophisticated text segmentation if needed.
     const wordsInElement = text.split(/\s+/); // Split by space
     // A more targeted approach would be needed if the element contains multiple words
     // and we need the specific one under the cursor.
     // For now, if caretRangeFromPoint fails, this might pick up the first word
     // or a word if the element itself is small and mostly contains one word.
     if (wordsInElement.length > 0) {
        const potentialWord = wordsInElement[0].toLowerCase().replace(/[^a-z]/gi, '');
        if (potentialWord.length > 2) word = potentialWord;
     }
  }

  const resultWord = (word && word.length > 2 && /^[a-zA-Z]+$/.test(word)) ? word : null;
  return resultWord;
}


// Add word to saved list with a specific style
function addWordToList(word, style) {
  if (!word || !style) return;
  // When adding a new word, always set the 'added' timestamp
  savedWords[word] = { style: style, added: Date.now() };
  saveWordsToStorage();
  removeHighlight(word); // Remove any existing highlight before applying new one
  applyStyleToWordOccurrences(word, style);
  showMessage(`"${word}" added with ${style} style.`, 'success');
}

// Remove word from saved list
function removeWordFromList(word) {
  if (!isWordSaved(word)) return;
  delete savedWords[word];
  saveWordsToStorage();
  removeHighlight(word); // This needs to remove all styles
  showMessage(`"${word}" removed from your word list.`, 'info');
}

// Apply a specific style to a word (updates if exists, adds if new)
function applyStyle(word, newStyle) {
  if (!word || !newStyle) return;

  // It's assumed that 'word' already exists in savedWords because
  // handleHotkeyAction calls addWordToList for new words before potentially calling applyStyle.
  if (savedWords.hasOwnProperty(word)) {
    savedWords[word].style = newStyle; // Only update the style property.
                                      // The 'added' timestamp remains untouched.
    saveWordsToStorage();
    removeHighlight(word); // Remove previous styling first
    applyStyleToWordOccurrences(word, newStyle); // Apply the new style
    // Message is typically handled by the calling hotkey function
  } else {
    // This case should ideally not be reached given the logic in handleHotkeyAction.
    // If it is, it indicates a potential logic flaw where a word is being styled
    // without being formally added first.
    console.warn(`applyStyle called for word "${word}" which was not found in savedWords. This may indicate a logic error.`);
    // Do not add the word here, as that's the responsibility of addWordToList.
  }
}

// Save words (now an object) to Chrome storage
function saveWordsToStorage() {
  chrome.storage.local.set({
    savedWordsMap: savedWords // Use a new key for the object format
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
  return 'word-memory-highlight'; // Default for STYLE_DEFAULT or unknown
}

// Highlight a specific word with a given style
function applyStyleToWordOccurrences(word, style, rootNode = document.body) {
  const className = getHighlightClass(style);
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'); // Use escaped word/phrase
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
    
    // Check if parent itself became a highlight (e.g. by sibling node processing)
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
      span.className = className; // Apply style-specific class
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

// Highlight all saved words across the entire document based on their stored style
function highlightSavedWords() {
  const wordsToHighlight = Object.keys(savedWords);
  // Sort by length descending to prioritize longer phrases
  wordsToHighlight.sort((a, b) => b.length - a.length);

  wordsToHighlight.forEach(word => {
    if (savedWords.hasOwnProperty(word)) { // Should always be true
      applyStyleToWordOccurrences(word, savedWords[word].style, document.body);
    }
  });
}

// Remove all highlights for a specific word, regardless of style
function removeHighlight(word) {
  const highlightSelectors = [
    '.word-memory-highlight', // Default style
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
          parent.normalize(); // Merges adjacent text nodes
        }
      }
    });
  });
}

// Show success/info messages (no changes needed to this function itself)
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
  if (Object.keys(savedWords).length === 0) { // Adjusted for object
    return;
  }

  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(addedNode => {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          const classList = addedNode.classList;
          if (classList && (classList.contains('word-memory-highlight') || // Default
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
          // Apply highlights, longest first
          const wordsToApply = Object.keys(savedWords).sort((a, b) => b.length - a.length);
          wordsToApply.forEach(word => {
            if (savedWords.hasOwnProperty(word)) {
                 applyStyleToWordOccurrences(word, savedWords[word].style, addedNode);
            }
          });

        } else if (addedNode.nodeType === Node.TEXT_NODE && addedNode.parentElement) {
          const parentElement = addedNode.parentElement;
          const parentClassList = parentElement.classList;
          if (parentClassList && (parentClassList.contains('word-memory-highlight') || // Default
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
          // Apply highlights, longest first
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getWords') {
    // Send words with their styles and timestamps
    const wordsWithDetails = [];
    for (const word in savedWords) {
      if (savedWords.hasOwnProperty(word)) {
        wordsWithDetails.push({
          word: word,
          style: savedWords[word].style,
          added: savedWords[word].added // Include the timestamp
        });
      }
    }
    sendResponse({words: wordsWithDetails}); // Changed key to reflect more data
  } else if (request.action === 'removeWord') {
    removeWordFromList(request.word); // Use new function
    sendResponse({success: true});
  } else if (request.action === 'clearAllWords') {
    const wordsToRemove = Object.keys(savedWords);
    savedWords = {}; // Clear local object
    saveWordsToStorage(); // Save empty object to storage
    
    // Remove all highlights from the page
    wordsToRemove.forEach(word => removeHighlight(word)); 
    
    sendResponse({success: true});
  } else if (request.action === 'applyStyleToWord') {
    if (request.word && request.style) {
      applyStyle(request.word, request.style); // This function already handles storage and re-highlighting
      // The message for style change is handled by applyStyle if called from handleHotkeyAction.
      // However, if applyStyle is called directly from popup, it doesn't show a message.
      // Let's ensure a message is shown here for consistency when action originates from popup.
      // Note: applyStyle itself does not show messages to avoid duplication when called from hotkeys.
      showMessage(`"${request.word}" style changed to ${request.style}.`, 'info');
      sendResponse({success: true});
    } else {
      sendResponse({success: false, error: "Missing word or style for applyStyleToWord"});
    }
  }
});