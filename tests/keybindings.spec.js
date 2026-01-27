import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import state from '../resources/js/state';
import {removeAllHouses, removeAllNames, resetState} from "./specHelper";
import {cleanupKeybindings, initKeybindings, isMobileDevice} from "../resources/js/keybindings";

describe('keybindings', () => {
  let input0, b0Button, addHouseButton, generateButton;

  beforeAll(() => {
    b0Button = document.getElementById("b0");
    input0 = document.getElementById("input0");
    addHouseButton = document.getElementById("addHouse");
    generateButton = document.getElementById("generate");
  });

  beforeEach(() => {
    resetState();
    removeAllHouses();
    removeAllNames();

    vi.spyOn(b0Button, "click");
    vi.spyOn(addHouseButton, 'click');
    vi.spyOn(generateButton, 'click');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanupKeybindings();
  });

  describe('isMobileDevice', () => {
    it('detects mobile devices', () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      expect(isMobileDevice(mobileUA)).toBe(true);
    });

    it('detects Android devices', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 10)';
      expect(isMobileDevice(androidUA)).toBe(true);
    });

    it('detects iPad devices', () => {
      const iPadUA = 'Mozilla/5.0 (iPad; CPU OS 13_0 like Mac OS X)';
      expect(isMobileDevice(iPadUA)).toBe(true);
    });

    it('detects desktop as non-mobile', () => {
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      expect(isMobileDevice(desktopUA)).toBe(false);
    });

    it('detects Mac as non-mobile', () => {
      const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';
      expect(isMobileDevice(macUA)).toBe(false);
    });
  });

  describe('desktop keybindings', () => {
    beforeEach(() => {
      // Initialize with desktop userAgent
      const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      initKeybindings(desktopUA);
    });

    describe('Enter key on input0', () => {
      it('triggers b0 button click when Enter is pressed', () => {
        const event = new KeyboardEvent('keyup', {
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });

        input0.dispatchEvent(event);

        expect(b0Button.click).toHaveBeenCalledTimes(1);
      });

      it('does not trigger b0 button for other keys', () => {
        const event = new KeyboardEvent('keyup', {
          keyCode: 65, // 'A' key
          bubbles: true,
          cancelable: true,
        });

        input0.dispatchEvent(event);

        expect(b0Button.click).not.toHaveBeenCalled();
      });
    });

    describe('Shift+Enter for addHouse', () => {
      it('triggers addHouse button when Shift+Enter is pressed', () => {
        const event = new KeyboardEvent('keyup', {
          shiftKey: true,
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(addHouseButton.click).toHaveBeenCalledTimes(1);
      });

      it('does not trigger addHouse without Shift key', () => {
        const event = new KeyboardEvent('keyup', {
          shiftKey: false,
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(addHouseButton.click).not.toHaveBeenCalled();
      });

      it('does not trigger addHouse for other keys with Shift', () => {
        const event = new KeyboardEvent('keyup', {
          shiftKey: true,
          keyCode: 65, // 'A' key
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(addHouseButton.click).not.toHaveBeenCalled();
      });
    });

    describe('Ctrl+Enter for generate', () => {
      it('triggers generate button when Ctrl+Enter is pressed', () => {
        state.isSecretSanta = false;

        const event = new KeyboardEvent('keyup', {
          ctrlKey: true,
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(generateButton.click).toHaveBeenCalledTimes(1);
      });

      it('does not trigger generate without Ctrl key', () => {
        const event = new KeyboardEvent('keyup', {
          ctrlKey: false,
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(generateButton.click).not.toHaveBeenCalled();
      });

      it('does not trigger generate for other keys with Ctrl', () => {
        const event = new KeyboardEvent('keyup', {
          ctrlKey: true,
          keyCode: 65, // 'A' key
          bubbles: true,
          cancelable: true,
        });

        window.dispatchEvent(event);

        expect(generateButton.click).not.toHaveBeenCalled();
      });
    });
  });

  describe('mobile keybindings', () => {
    beforeEach(() => {
      // Reset button click spies
      vi.clearAllMocks();

      // Initialize with mobile userAgent
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
      initKeybindings(mobileUA);
    });

    it('does not add window event listeners on mobile devices', () => {
      // Try window events - they should not trigger on mobile
      const shiftEnterEvent = new KeyboardEvent('keyup', {
        shiftKey: true,
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      });

      const ctrlEnterEvent = new KeyboardEvent('keyup', {
        ctrlKey: true,
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(shiftEnterEvent);
      window.dispatchEvent(ctrlEnterEvent);

      // Window listeners should not trigger on mobile
      expect(addHouseButton.click).not.toHaveBeenCalled();
      expect(generateButton.click).not.toHaveBeenCalled();
    });

    it('still adds input0 listener on mobile', () => {
      const enterEvent = new KeyboardEvent('keyup', {
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      });

      input0.dispatchEvent(enterEvent);

      // Input listener should work on mobile
      expect(b0Button.click).toHaveBeenCalledTimes(1);
    });
  });
});
