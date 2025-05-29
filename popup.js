// Word Memory Assistant - Popup Script

document.addEventListener('DOMContentLoaded', function() {
  const wordCountEl = document.getElementById('wordCount');
  const wordContainer = document.getElementById('wordContainer');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const exportWordsBtn = document.getElementById('exportWordsBtn');
  const importWordsBtn = document.getElementById('importWordsBtn');
  const importFile = document.getElementById('importFile');
  const manualWordInput = document.getElementById('manualWordInput');
  const manualAddBtn = document.getElementById('manualAddBtn');
  const searchInput = document.getElementById('searchInput');
  const sortOrderSelect = document.getElementById('sortOrder');

  let currentSortOrder = 'alpha-asc'; // Default sort order

  // Load and display words when popup opens
  loadWords();

  // Event listeners
  refreshBtn.addEventListener('click', loadWords); 
  clearAllBtn.addEventListener('click', clearAllWords);
  exportWordsBtn.addEventListener('click', exportWords);
  importWordsBtn.addEventListener('click', function() {
    importFile.click(); // Trigger hidden file input
  });
  importFile.addEventListener('change', importWords);
  manualAddBtn.addEventListener('click', handleManualAddWord);
  searchInput.addEventListener('input', loadWords); 
  sortOrderSelect.addEventListener('change', function() {
    currentSortOrder = this.value;
    loadWords();
  });

  function handleManualAddWord() {
    let phrase = manualWordInput.value.trim().toLowerCase();
    phrase = phrase.replace(/\s+/g, ' '); // Normalize multiple spaces to single space

    if (!phrase) {
      alert('Please enter a word or phrase.');
      return;
    }

    // Validation: allow English letters and single spaces between words
    if (!/^[a-z]+(\s[a-z]+)*$/i.test(phrase)) {
      alert('Invalid format. Please use English letters and single spaces between words (e.g., \'hello world\').');
      // Do not clear input here, let user correct it.
      return;
    }
    
    chrome.storage.local.get(['savedWordsMap'], function(result) {
      const wordsMap = result.savedWordsMap || {};
      if (wordsMap.hasOwnProperty(phrase)) {
        alert('Word or phrase already in list.');
      } else {
        wordsMap[phrase] = { style: 'default', added: Date.now() }; 
        chrome.storage.local.set({savedWordsMap: wordsMap}, function() {
          if (chrome.runtime.lastError) {
            console.error("Error saving manually added word/phrase:", chrome.runtime.lastError.message);
            alert('Error saving word/phrase: ' + chrome.runtime.lastError.message);
          } else {
            manualWordInput.value = ''; // Clear input field after successful save
            console.log(`"${phrase}" added manually.`);
          }
        });
      }
    });
  }

  function loadWords() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0 || !tabs[0].id) {
        console.warn("No active tab found or tab has no ID. Falling back to storage.");
        loadWordsFromStorage();
        return;
      }
      // content.js sends words as an array of {word: "text", style: "styleName", added: timestamp}
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getWords'}, function(response) {
        if (chrome.runtime.lastError) {
          console.warn("Error sending message to content script:", chrome.runtime.lastError.message, "Falling back to storage.");
          loadWordsFromStorage(); 
        } else if (response && response.words && Array.isArray(response.words)) {
          let wordsArray = response.words;
          
          // 1. Sort the array
          sortWordsArray(wordsArray);

          // 2. Filter by search term
          const searchTerm = searchInput.value.trim().toLowerCase();
          if (searchTerm) {
            wordsArray = wordsArray.filter(item => item.word.toLowerCase().includes(searchTerm));
          }
          displayWords(wordsArray);
        } else {
          console.warn("Invalid response from content script or no words. Falling back to storage.");
          loadWordsFromStorage(); 
        }
      });
    });
  }

  function loadWordsFromStorage() {
    chrome.storage.local.get(['savedWordsMap'], function(result) {
      const wordsMap = result.savedWordsMap || {};
      let wordsArray = Object.keys(wordsMap).map(word => ({
        word: word,
        style: wordsMap[word].style,
        added: wordsMap[word].added 
      }));

      // 1. Sort the array
      sortWordsArray(wordsArray);

      // 2. Filter by search term
      const searchTerm = searchInput.value.trim().toLowerCase();
      if (searchTerm) {
        wordsArray = wordsArray.filter(item => item.word.toLowerCase().includes(searchTerm));
      }
      displayWords(wordsArray);
    });
  }

  function sortWordsArray(wordsArray) {
    switch (currentSortOrder) {
      case 'alpha-asc':
        wordsArray.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'alpha-desc':
        wordsArray.sort((a, b) => b.word.localeCompare(a.word));
        break;
      case 'time-desc': // Newest first
        wordsArray.sort((a, b) => (b.added || 0) - (a.added || 0));
        break;
      case 'time-asc': // Oldest first
        wordsArray.sort((a, b) => (a.added || 0) - (b.added || 0));
        break;
      default:
        wordsArray.sort((a, b) => a.word.localeCompare(b.word)); // Fallback to alpha-asc
    }
  }

  // wordsArray is an array of objects: [{word: "text", style: "styleName", added: timestamp}, ...]
  // It now receives a pre-sorted and pre-filtered array.
  function displayWords(wordsArray) {
    wordCountEl.textContent = wordsArray.length; 
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (wordsArray.length === 0 && searchTerm) {
      wordContainer.innerHTML = `
        <div class="empty-state">
          <div>No words match your search for "${searchTerm}".</div>
        </div>
      `;
      return;
    } else if (wordsArray.length === 0) {
      wordContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <div>No words saved yet</div>
          <div style="font-size: 11px; margin-top: 4px;">Start collecting words by using hotkeys on any webpage!</div>
        </div>
      `;
      return;
    }

    // Array is already sorted before being passed to displayWords.
    // The old sort line: wordsArray.sort((a, b) => a.word.localeCompare(b.word)); IS REMOVED.

    const wordsHTML = wordsArray.map(item => {
      const formattedTime = item.added ? new Date(item.added).toLocaleString() : 'N/A';
      const currentStyle = item.style || 'default'; // Ensure 'default' if item.style is undefined

      return `
        <div class="word-item">
          <div class="word-details">
            <span class="word-text">${item.word}</span>
            <span class="word-style">(${currentStyle})</span>
            <span class="word-timestamp">Added: ${formattedTime}</span>
          </div>
          <div class="word-item-actions">
            <div class="action-row1">
              <button class="style-btn ${currentStyle === 'default' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="default" title="Apply Default Style (Red)">2</button>
              <button class="style-btn ${currentStyle === 'green' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="green" title="Apply Green Style">3</button>
              <button class="style-btn ${currentStyle === 'underline' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="underline" title="Apply Underline Style">4</button>
              <button class="style-btn" data-word="${item.word}" data-action="delete" title="Remove Word">5</button>
              <button class="style-btn ${currentStyle === 'custom_a' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="custom_a" title="Apply Custom Style A">A</button>
              <button class="style-btn ${currentStyle === 'custom_b' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="custom_b" title="Apply Custom Style B">B</button>
            </div>
            <div class="action-row2">
              <button class="style-btn ${currentStyle === 'blue' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="blue" title="Apply Blue Style">6</button>
              <button class="style-btn ${currentStyle === 'yellow_bg' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="yellow_bg" title="Apply Yellow Background Style">7</button>
              <button class="style-btn ${currentStyle === 'bold' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="bold" title="Apply Bold Style">8</button>
              <button class="style-btn ${currentStyle === 'italic_underline' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="italic_underline" title="Apply Italic Underline Style">9</button>
              <button class="style-btn ${currentStyle === 'custom_c' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="custom_c" title="Apply Custom Style C">C</button>
              <button class="style-btn ${currentStyle === 'custom_d' ? 'active-style-btn' : ''}" data-word="${item.word}" data-style="custom_d" title="Apply Custom Style D">D</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    wordContainer.innerHTML = wordsHTML;

    // Event listeners for the new buttons
    const styleButtons = wordContainer.querySelectorAll('.style-btn');
    styleButtons.forEach(btn => {
      btn.addEventListener('click', handleWordItemAction);
    });

    // Add scrollbar class if needed
    if (wordContainer.scrollHeight > wordContainer.clientHeight) {
        wordContainer.classList.add('scrollbar');
    } else {
        wordContainer.classList.remove('scrollbar');
    }
  }

  function removeWord(word) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0 || !tabs[0].id) {
        console.warn("No active tab for removeWord. Falling back to storage.");
        removeWordFromStorage(word);
        return;
      }
      // content.js will update its own state and storage.
      // The storage change listener in content.js should handle re-highlighting.
      // popup.js will reload its word list via its own storage listener or direct call.
      chrome.tabs.sendMessage(tabs[0].id, {action: 'removeWord', word: word}, function(response) {
        if (chrome.runtime.lastError) {
          console.warn("Error sending removeWord to content script:", chrome.runtime.lastError.message, "Falling back to storage.");
          removeWordFromStorage(word); // Fallback
        } else {
          loadWords(); // Reload words in popup after content script confirms (or attempts)
        }
      });
    });
  }

  function removeWordFromStorage(word) {
    chrome.storage.local.get(['savedWordsMap'], function(result) {
      const wordsMap = result.savedWordsMap || {};
      if (wordsMap.hasOwnProperty(word)) {
        delete wordsMap[word];
        chrome.storage.local.set({savedWordsMap: wordsMap}, function() {
          if (chrome.runtime.lastError) {
            console.error("Error setting storage after removing word:", chrome.runtime.lastError.message);
          } else {
            loadWords(); // Reload words in popup
          }
        });
      } else {
        loadWords(); // Word wasn't there, just reload
      }
    });
  }

  function clearAllWords() {
    if (confirm('Are you sure you want to remove all words from your list? This action cannot be undone.')) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0 || !tabs[0].id) {
          console.warn("No active tab for clearAllWords. Falling back to storage.");
          clearWordsFromStorage();
          return;
        }
        // content.js will clear its state and storage.
        // Storage change listener in content.js handles re-highlighting.
        chrome.tabs.sendMessage(tabs[0].id, {action: 'clearAllWords'}, function(response) {
          if (chrome.runtime.lastError) {
            console.warn("Error sending clearAllWords to content script:", chrome.runtime.lastError.message, "Falling back to storage.");
            clearWordsFromStorage(); // Fallback
          } else {
            loadWords(); // Reload words in popup
          }
        });
      });
    }
  }

  function clearWordsFromStorage() {
    chrome.storage.local.set({savedWordsMap: {}}, function() { // Set to empty object
      if (chrome.runtime.lastError) {
        console.error("Error clearing words from storage:", chrome.runtime.lastError.message);
      } else {
        loadWords(); // Reload words in popup
      }
    });
  }

  function exportWords() {
    chrome.storage.local.get(['savedWordsMap'], function(result) {
      const wordsMap = result.savedWordsMap || {};
      if (Object.keys(wordsMap).length === 0) {
        alert('No words to export.');
        return;
      }
      // Exporting the map directly: {"word": {"style": "stylename"}, ...}
      const jsonString = JSON.stringify(wordsMap, null, 2);
      const blob = new Blob([jsonString], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: 'wordlist.json', // Stays the same
        saveAs: true
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError.message);
        }
        URL.revokeObjectURL(url); // Revoke after download starts or fails
      });
    });
  }

  function handleWordItemAction(event) {
    const button = event.target;
    const word = button.dataset.word;
    const style = button.dataset.style;
    const action = button.dataset.action;

    if (action === 'delete') {
      removeWord(word); // This already handles storage and messaging content.js
    } else if (style) {
      // Update style in storage directly from popup
      chrome.storage.local.get(['savedWordsMap'], function(result) {
        const wordsMap = result.savedWordsMap || {};
        if (wordsMap.hasOwnProperty(word)) {
          wordsMap[word].style = style;
          // The 'added' timestamp is intentionally not modified here
          chrome.storage.local.set({savedWordsMap: wordsMap}, function() {
            if (chrome.runtime.lastError) {
              console.error("Error updating style from popup:", chrome.runtime.lastError.message);
              alert('Error updating style: ' + chrome.runtime.lastError.message);
            } else {
              // Inform content script to apply the style on the page
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs.length > 0 && tabs[0].id) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'applyStyleToWord', // New action for content.js
                    word: word,
                    style: style
                  }, function(response) {
                    if (chrome.runtime.lastError) {
                      console.warn("Error sending applyStyleToWord to content script:", chrome.runtime.lastError.message);
                      // UI will still update due to storage change listener
                    }
                    // loadWords(); // UI updates via storage.onChanged listener
                  });
                } else {
                   // If no active tab, UI still updates via storage listener
                   console.warn("No active tab to send applyStyleToWord message.");
                }
              });
            }
          });
        }
      });
    }
  }

  function importWords(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const fileContent = e.target.result;
        const importedData = JSON.parse(fileContent);

        // Validate the imported structure: should be an object
        // where each value is an object with a 'style' property (string)
        if (typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)) {
          alert('Invalid file format. Expected an object mapping words to styles.');
          return;
        }

        let isValidStructure = true;
        for (const word in importedData) {
          if (importedData.hasOwnProperty(word)) {
            const styleObj = importedData[word];
            if (typeof styleObj !== 'object' || styleObj === null || typeof styleObj.style !== 'string') {
              isValidStructure = false;
              break;
            }
          }
        }

        if (!isValidStructure) {
          alert('Invalid data structure in JSON file. Each word must map to an object with a "style" property (e.g., {"word1": {"style": "default"}, ...}).');
          return;
        }

        chrome.storage.local.set({savedWordsMap: importedData}, function() {
          if (chrome.runtime.lastError) {
            alert('Error saving imported words: ' + chrome.runtime.lastError.message);
          } else {
            loadWords(); // Reload words in popup
            alert('Words imported successfully! Page highlights will update based on the new list.');
            // Inform content script to refresh highlights if necessary.
            // Content.js already listens to storage changes which triggers highlightSavedWords.
            // However, sending a specific message can be more robust if the content script wasn't active during storage change.
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'refreshAllHighlights'}, function(response) {
                        if (chrome.runtime.lastError) {
                            console.warn("Could not send refreshAllHighlights message to content script or it's not loaded:", chrome.runtime.lastError.message);
                        }
                    });
                }
            });
          }
        });
      } catch (error) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    reader.onerror = function() {
      alert('Error reading file.');
    };
    reader.readAsText(file);
    importFile.value = null; // Reset file input for next import
  }

  // Listen for storage changes to keep popup in sync
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.savedWordsMap) {
      // Data has changed, reload words in the popup
      loadWords();
    }
  });

  // Add event listener for the Escape key to close the popup
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      window.close();
    }
  });
});