# Word Memory Assistant Chrome Extension

Ever find yourself stumbling upon new English words while browsing the web, wishing for an easy way to remember them? The Word Memory Assistant is here to help!

This friendly Chrome extension makes it simple to:

*   **Highlight English words you want to learn directly on any webpage.**
*   **Save those words to your own personal vocabulary list.**
*   **See your saved words automatically highlighted whenever you encounter them again online, reinforcing your memory.**

With the Word Memory Assistant, you can build your vocabulary effortlessly as you browse, making learning new words a natural part of your online experience. Start creating your personalized word list today!

## Installation Guide

You can install the Word Memory Assistant extension in one of the following ways:

**1. Install from the Chrome Web Store (Recommended)**

*   (If the extension is published on the Chrome Web Store)
*   Open your Chrome browser and go to the [Word Memory Assistant page on the Chrome Web Store (link to be inserted here)]().
*   Click the "Add to Chrome" button.
*   A confirmation dialog will appear. Click "Add extension".
*   Once installed, the Word Memory Assistant icon will appear in your browser's toolbar.

**2. Manual Installation (for developers or if you have the extension files)**

If you have the extension's source files (for example, downloaded from GitHub), you can install it manually by following these steps:

*   **Step 1: Open the Extensions Page**
    *   In your Chrome browser, type `chrome://extensions` into the address bar and press Enter.
    *   Alternatively, click the three-dots menu (⋮) in the top-right corner of Chrome, select "More tools," and then choose "Extensions."

*   **Step 2: Enable Developer Mode**
    *   On the Extensions page, look for the "Developer mode" toggle switch in the top-right corner and turn it on.

*   **Step 3: Load the Unpacked Extension**
    *   With Developer mode enabled, new buttons will appear. Click the "Load unpacked" button.
    *   A file selection dialog will open. Navigate to the folder where you have the Word Memory Assistant extension files (e.g., a folder named `Word-Memory-Assistant-main` or similar).
    *   Select the entire folder and click the "Select Folder" button.

*   **Step 4: Installation Complete**
    *   If successful, the Word Memory Assistant extension will now appear in your list of extensions, and its icon will be added to your browser's toolbar.

After installation, it's a good idea to refresh any open web pages or restart your Chrome browser to ensure the extension is working correctly.

## How to Use - Hotkey Operations

Using the Word Memory Assistant is straightforward, primarily relying on keyboard hotkeys to manage your vocabulary directly on any webpage.

**1. Activating an Operation:**

First, simply move your mouse cursor to hover over any English word on a webpage that you want to interact with.

**2. General Hotkey Mechanism:**

With your mouse cursor positioned over the desired word, **press and hold** the relevant numeric hotkey for approximately **0.5 seconds**, then release. This duration is key to triggering the function. If you press and release too quickly, the action might not register.

**3. Detailed Hotkey Functions:**

*   **Numeric Key `2` (Default Style / Toggle / Remove):**
    *   **If the word is not saved:** Adds the word to your vocabulary list with the default red highlight style.
    *   **If the word is saved and currently has the green or underline style:** Changes its style to the default red highlight.
    *   **If the word is saved and currently has the default style:** Removes the word from your vocabulary list (effectively toggling the highlight off).

*   **Numeric Key `3` (Green Style):**
    *   **If the word is not saved:** Adds the word to your vocabulary list with the green highlight style.
    *   **If the word is saved but not currently styled as green:** Changes its style to green.
    *   **If the word is already styled as green:** No style change occurs, and a message will indicate it's already green.

*   **Numeric Key `4` (Underline Style):**
    *   **If the word is not saved:** Adds the word to your vocabulary list with the underline style.
    *   **If the word is saved but not currently styled with an underline:** Changes its style to underline.
    *   **If the word is already styled with an underline:** No style change occurs, and a message will indicate it's already underlined.

*   **Numeric Key `5` (Remove Word):**
    *   **If the word is saved:** Removes it from your vocabulary list, regardless of its current style.
    *   **If the word is not saved:** No action is taken, and a message will indicate the word is not in your list.

After each successful hotkey operation, a small notification message will typically appear on the page, confirming the action taken (e.g., "Word added," "Style changed," "Word removed"). This system allows for quick and efficient management of your personal word list as you browse.

## Popup Window Features

You can access the Word Memory Assistant's main control panel by clicking its icon in your browser's toolbar. This opens a popup window where you can manage your vocabulary list and settings.

Here's what you can do in the popup window:

*   **View Word List:**
    *   See all the English words you've saved.
    *   Next to each word, its current highlight style (e.g., Default, Green, or Underline) is displayed.
    *   The list is typically sorted alphabetically for easy reference.

*   **Word Count:**
    *   A clear display shows the total number of words currently in your vocabulary list.

*   **Remove Individual Words:**
    *   Each word in the list has a "Remove" button next to it, allowing you to delete specific words from your collection.

*   **Clear All Words:**
    *   A "Clear All" button lets you remove all words from your list at once. You'll usually be asked to confirm this action to prevent accidental deletion.

*   **Export Words:**
    *   The "Export Words" button allows you to download your entire vocabulary list (including words and their associated styles) as a `wordlist.json` file. This is useful for backing up your data or transferring it to another device.

*   **Import Words:**
    *   With the "Import Words" button, you can upload a previously exported `wordlist.json` file. This will add the words (and their styles) from the file to your current list, or replace it, depending on the extension's import logic. It's a good idea to back up your current list before importing if you want to preserve it.

*   **Refresh List:**
    *   A "Refresh List" button lets you manually reload the word list displayed in the popup, ensuring you're seeing the most up-to-date information.

*   **Hotkey Instructions:**
    *   The popup also includes a quick reminder or guide on how to use the keyboard hotkeys (e.g., '2', '3', '4', '5') to add, style, or remove words directly on web pages.

These features give you full control over managing and maintaining your personalized English vocabulary list.
