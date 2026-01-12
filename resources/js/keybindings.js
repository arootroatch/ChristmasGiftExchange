import state from "./state";

// Check if device is mobile
export function isMobileDevice(userAgent = navigator.userAgent) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

// Event handler functions
function enterClick(evt) {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    document.getElementById("b0").click();
  }
}

function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault();
    document.getElementById("addHouse").click();
  }
}

function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    if (!state.secretSanta) {
      document.getElementById("generate").click();
    } else {
      document.getElementById("secretGenerate").click();
    }
  }
}

// Store references to event handlers for cleanup
let isInitialized = false;
let hasWindowListeners = false;

// Initialize keyboard bindings
export function initKeybindings(userAgent = navigator.userAgent) {
  // Clean up existing listeners first
  cleanupKeybindings();

  const input0 = document.getElementById("input0");
  if (input0) {
    input0.addEventListener("keyup", enterClick);
  }

  // Only add window shortcuts on desktop
  if (!isMobileDevice(userAgent)) {
    window.addEventListener("keyup", enterAddHouse);
    window.addEventListener("keyup", enterGenerate);
    hasWindowListeners = true;
  }

  isInitialized = true;
}

// Remove all keyboard bindings
export function cleanupKeybindings() {
  const input0 = document.getElementById("input0");
  if (input0) {
    input0.removeEventListener("keyup", enterClick);
  }

  // Only remove window listeners if they were added
  if (hasWindowListeners) {
    window.removeEventListener("keyup", enterAddHouse);
    window.removeEventListener("keyup", enterGenerate);
    hasWindowListeners = false;
  }

  isInitialized = false;
}

// Auto-initialize in browser environment (not during tests)
if (typeof document !== 'undefined' && typeof process === 'undefined') {
  initKeybindings();
}
