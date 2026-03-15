import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {allowDrop, drag, dragLeave, drop, initDragDrop} from '../../src/exchange/dragDrop';
import {getState, addNameToHouse} from '../../src/exchange/state';
import {
  addHouseToDOM,
  enterName,
  expectColor,
  initReactiveSystem,
  removeAllHouses,
  removeAllNames,
  resetDOM,
  resetState,
  shouldSelect
} from '../specHelper';


describe('dragDrop', () => {
  describe('drag', () => {
    it('sets data transfer with element id', () => {
      const mockEvent = {
        target: {
          id: 'draggable-element-123'
        },
        dataTransfer: {
          setData: vi.fn()
        }
      };

      drag(mockEvent);

      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text', 'draggable-element-123');
    });
  });

  describe('drop', () => {
    beforeAll(() => {
      initReactiveSystem();
    });

    beforeEach(() => {
      resetState();
      removeAllNames();
      removeAllHouses();
    });

    it('appends element to target and resets background when target is name-container', () => {
      enterName('Alex');
      const participants = document.querySelector('#participants');
      const nameWrapper = document.querySelector('#wrapper-Alex');

      const mockEvent = {
        target: participants,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alex')
        },
        preventDefault: vi.fn()
      };

      participants.style.backgroundColor = '#ffffff9e';
      drop(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.getData).toHaveBeenCalledWith('text');
      expect(participants.contains(nameWrapper)).toBe(true);
      expectColor(participants.style.backgroundColor, "transparent", "rgba(0, 0, 0, 0)", "#00000000");
    });

    it('updates state when dropping name into house', () => {
      enterName('Alex');
      addHouseToDOM();

      const houseContainer = document.querySelector('#house-0 .name-container');

      const mockEvent = {
        target: houseContainer,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alex')
        },
        preventDefault: vi.fn()
      };

      drop(mockEvent);

      expect(getState().houses.find(h => h.id === "house-0").members).toContain('Alex');
      // Check that a name wrapper for Alex exists in the house container (re-rendered)
      shouldSelect('#house-0 .name-container #wrapper-Alex');
    });

    it('updates state when moving name between houses', () => {
      enterName('Alex');
      addHouseToDOM();
      addHouseToDOM();

      const nameWrapper = document.querySelector('#wrapper-Alex');
      const house0Container = document.querySelector('#house-0 .name-container');
      const house1Container = document.querySelector('#house-1 .name-container');

      house0Container.appendChild(nameWrapper);
      addNameToHouse("house-0", "Alex");

      const mockEvent = {
        target: house1Container,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alex')
        },
        preventDefault: vi.fn()
      };

      drop(mockEvent);

      expect(getState().houses.find(h => h.id === "house-0").members).not.toContain('Alex');
      expect(getState().houses.find(h => h.id === "house-1").members).toContain('Alex');
      // Check that a name wrapper for Alex exists in house-1 (re-rendered)
      shouldSelect('#house-1 .name-container #wrapper-Alex');
    });

    it('does nothing when target is not name-container', () => {
      enterName('Alex');
      const nameWrapper = document.querySelector('#wrapper-Alex');
      const otherElement = document.querySelector('#container');

      const mockEvent = {
        target: otherElement,
        dataTransfer: {
          getData: vi.fn()
        },
        preventDefault: vi.fn()
      };

      const initialParent = nameWrapper.parentElement;

      drop(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.dataTransfer.getData).not.toHaveBeenCalled();
      expect(nameWrapper.parentElement).toBe(initialParent);
    });
  });

  describe('initDragDrop', () => {
    it('initializes without error when left-container exists', () => {
      const container = document.querySelector('#left-container');
      expect(container).not.toBeNull();
      expect(() => initDragDrop()).not.toThrow();
    });

    it('handles missing container gracefully', () => {
      const container = document.querySelector('#left-container');
      if (container) container.remove();

      expect(() => initDragDrop()).not.toThrow();
    });
  });

  describe("drag cursors", () => {
    beforeAll(() => {
      initReactiveSystem();
    });

    beforeEach(() => {
      resetDOM();
      resetState();
      initDragDrop();
      enterName("Alex");
    });

    function createDragStartEvent() {
      const event = new Event("dragstart", {bubbles: true});
      event.dataTransfer = {setData: vi.fn()};
      return event;
    }

    it("adds dragging class to body on dragstart", () => {
      const wrapper = document.querySelector("#wrapper-Alex");
      wrapper.dispatchEvent(createDragStartEvent());
      expect(document.body.classList.contains("dragging")).toBe(true);
    });

    it("removes dragging class from body on dragend", () => {
      const wrapper = document.querySelector("#wrapper-Alex");
      wrapper.dispatchEvent(createDragStartEvent());
      expect(document.body.classList.contains("dragging")).toBe(true);
      const container = document.querySelector("#left-container");
      container.dispatchEvent(new Event("dragend", {bubbles: true}));
      expect(document.body.classList.contains("dragging")).toBe(false);
    });

    it("hides the source element during drag", async () => {
      const wrapper = document.querySelector("#wrapper-Alex");
      wrapper.dispatchEvent(createDragStartEvent());
      await new Promise(resolve => requestAnimationFrame(resolve));
      expect(wrapper.classList.contains("dragging-source")).toBe(true);
    });

    it("restores the source element on dragend", () => {
      const wrapper = document.querySelector("#wrapper-Alex");
      wrapper.classList.add("dragging-source");
      const container = document.querySelector("#left-container");
      container.dispatchEvent(new Event("dragend", {bubbles: true}));
      expect(wrapper.classList.contains("dragging-source")).toBe(false);
    });
  });

  describe('auto-scroll during drag', () => {
    let scrollBySpy;
    let rafCallbacks;

    beforeAll(() => {
      initReactiveSystem();
    });

    beforeEach(() => {
      resetDOM();
      resetState();
      scrollBySpy = vi.fn();
      window.scrollBy = scrollBySpy;

      rafCallbacks = [];
      vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      }));
      vi.stubGlobal('cancelAnimationFrame', vi.fn(() => {
        rafCallbacks = [];
      }));

      initDragDrop();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    function fireDragOver(clientY) {
      const event = new Event('dragover', {bubbles: true});
      event.clientY = clientY;
      document.querySelector('#left-container').dispatchEvent(event);
    }

    it('scrolls down when dragging near the bottom of the viewport', () => {
      fireDragOver(750);

      expect(rafCallbacks.length).toBeGreaterThan(0);
      rafCallbacks[0]();

      expect(scrollBySpy).toHaveBeenCalledWith(0, expect.any(Number));
      expect(scrollBySpy.mock.calls[0][1]).toBeGreaterThan(0);
    });

    it('scrolls up when dragging near the top of the viewport', () => {
      fireDragOver(30);

      expect(rafCallbacks.length).toBeGreaterThan(0);
      rafCallbacks[0]();

      expect(scrollBySpy).toHaveBeenCalledWith(0, expect.any(Number));
      expect(scrollBySpy.mock.calls[0][1]).toBeLessThan(0);
    });

    it('does not scroll when dragging in the middle of the viewport', () => {
      fireDragOver(400);

      expect(rafCallbacks.length).toBe(0);
      expect(scrollBySpy).not.toHaveBeenCalled();
    });

    it('stops scrolling on drop', () => {
      fireDragOver(750);
      expect(rafCallbacks.length).toBeGreaterThan(0);

      cancelAnimationFrame.mockClear();

      const container = document.querySelector('#left-container');
      container.dispatchEvent(new Event('drop', {bubbles: true}));

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('stops scrolling on dragend', () => {
      fireDragOver(750);
      expect(rafCallbacks.length).toBeGreaterThan(0);

      cancelAnimationFrame.mockClear();

      const container = document.querySelector('#left-container');
      container.dispatchEvent(new Event('dragend', {bubbles: true}));

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('scrolls faster when closer to the edge', () => {
      fireDragOver(790);
      rafCallbacks[0]();
      const nearEdgeSpeed = scrollBySpy.mock.calls[0][1];

      scrollBySpy.mockClear();
      rafCallbacks = [];

      fireDragOver(750);
      rafCallbacks[0]();
      const furtherFromEdgeSpeed = scrollBySpy.mock.calls[0][1];

      expect(nearEdgeSpeed).toBeGreaterThan(furtherFromEdgeSpeed);
    });

    it('scrolls at least 10px per frame near the viewport edge', () => {
      fireDragOver(760);
      rafCallbacks[0]();

      expect(scrollBySpy.mock.calls[0][1]).toBeGreaterThanOrEqual(10);
    });

    it('accounts for control strip when calculating bottom scroll zone', () => {
      // clientY=700 is above the ~60px control strip but should still scroll fast
      fireDragOver(700);
      rafCallbacks[0]();

      expect(scrollBySpy.mock.calls[0][1]).toBeGreaterThanOrEqual(10);
    });
  });

  describe("drop zone preview", () => {
    beforeAll(() => {
      initReactiveSystem();
    });

    beforeEach(() => {
      resetDOM();
      resetState();
      removeAllNames();
      removeAllHouses();
      initDragDrop();
      enterName("Alex");
      addHouseToDOM();
    });

    it("inserts drop preview on dragover of name-container", () => {
      const houseContainer = document.querySelector("#house-0 .name-container");
      const event = new Event("dragover", {bubbles: true, cancelable: true});
      Object.defineProperty(event, "target", {value: houseContainer});
      event.clientY = 400;
      houseContainer.dispatchEvent(event);
      expect(houseContainer.querySelector(".drop-preview")).not.toBeNull();
    });

    it("removes drop preview on dragleave when leaving container", () => {
      const houseContainer = document.querySelector("#house-0 .name-container");
      const overEvent = new Event("dragover", {bubbles: true, cancelable: true});
      Object.defineProperty(overEvent, "target", {value: houseContainer});
      overEvent.clientY = 400;
      houseContainer.dispatchEvent(overEvent);
      expect(houseContainer.querySelector(".drop-preview")).not.toBeNull();

      const leaveEvent = new Event("dragleave", {bubbles: true});
      Object.defineProperty(leaveEvent, "target", {value: houseContainer});
      Object.defineProperty(leaveEvent, "relatedTarget", {value: document.body});
      houseContainer.dispatchEvent(leaveEvent);
      expect(houseContainer.querySelector(".drop-preview")).toBeNull();
    });

    it("does not remove preview on dragleave when moving to child element", () => {
      const houseContainer = document.querySelector("#house-0 .name-container");
      const overEvent = new Event("dragover", {bubbles: true, cancelable: true});
      Object.defineProperty(overEvent, "target", {value: houseContainer});
      overEvent.clientY = 400;
      houseContainer.dispatchEvent(overEvent);
      const preview = houseContainer.querySelector(".drop-preview");

      const leaveEvent = new Event("dragleave", {bubbles: true});
      Object.defineProperty(leaveEvent, "target", {value: houseContainer});
      Object.defineProperty(leaveEvent, "relatedTarget", {value: preview});
      houseContainer.dispatchEvent(leaveEvent);
      expect(houseContainer.querySelector(".drop-preview")).not.toBeNull();
    });

    it("removes preview on drop", () => {
      const participants = document.querySelector("#participants");
      const overEvent = new Event("dragover", {bubbles: true, cancelable: true});
      Object.defineProperty(overEvent, "target", {value: participants});
      overEvent.clientY = 400;
      participants.dispatchEvent(overEvent);
      expect(participants.querySelector(".drop-preview")).not.toBeNull();

      const dropEvent = new Event("drop", {bubbles: true, cancelable: true});
      Object.defineProperty(dropEvent, "target", {value: participants});
      Object.defineProperty(dropEvent, "dataTransfer", {value: {getData: () => "wrapper-Alex"}});
      participants.dispatchEvent(dropEvent);
      expect(participants.querySelector(".drop-preview")).toBeNull();
    });
  });
});
