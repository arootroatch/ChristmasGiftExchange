import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {allowDrop, drag, dragLeave, drop, initDragDrop} from '../resources/js/dragDrop';
import state from '../resources/js/state';
import {addHouseToDOM, enterName, removeAllHouses, removeAllNames, resetState, initReactiveSystem} from './specHelper';
import * as house from '../resources/js/components/house';
import * as name from '../resources/js/components/name';

describe('dragDrop', () => {
  describe('allowDrop', () => {
    it('prevents default and changes background color when target is name-container', () => {
      const mockEvent = {
        target: {
          className: 'name-container',
          style: {}
        },
        preventDefault: vi.fn()
      };

      allowDrop(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.target.style.backgroundColor).toBe('#ffffff9e');
    });

    it('does nothing when target is not name-container', () => {
      const mockEvent = {
        target: {
          className: 'other-class',
          style: {}
        },
        preventDefault: vi.fn()
      };

      allowDrop(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.target.style.backgroundColor).toBeUndefined();
    });
  });

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
      house.initEventListeners();
      name.initEventListeners();
    });

    beforeEach(() => {
      resetState();
      removeAllNames();
      removeAllHouses();
    });

    it('appends element to target and resets background when target is name-container', () => {
      enterName('Alice');
      const participants = document.querySelector('#participants');
      const nameWrapper = document.querySelector('#wrapper-Alice');

      const mockEvent = {
        target: participants,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alice')
        },
        preventDefault: vi.fn()
      };

      participants.style.backgroundColor = '#ffffff9e';
      drop(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.getData).toHaveBeenCalledWith('text');
      expect(participants.contains(nameWrapper)).toBe(true);
      expect(participants.style.backgroundColor).toBe('transparent');
    });

    it('updates state when dropping name into house', () => {
      enterName('Alice');
      addHouseToDOM();

      const nameWrapper = document.querySelector('#wrapper-Alice');
      const houseContainer = document.querySelector('#house-0 .name-container');

      const mockEvent = {
        target: houseContainer,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alice')
        },
        preventDefault: vi.fn()
      };

      drop(mockEvent);

      expect(state.houses["house-0"]).toContain('Alice');
      expect(houseContainer.contains(nameWrapper)).toBe(true);
    });

    it('updates state when moving name between houses', () => {
      enterName('Alice');
      addHouseToDOM();
      addHouseToDOM();

      const nameWrapper = document.querySelector('#wrapper-Alice');
      const house0Container = document.querySelector('#house-0 .name-container');
      const house1Container = document.querySelector('#house-1 .name-container');

      house0Container.appendChild(nameWrapper);
      state.houses["house-0"].push("Alice");

      const mockEvent = {
        target: house1Container,
        dataTransfer: {
          getData: vi.fn(() => 'wrapper-Alice')
        },
        preventDefault: vi.fn()
      };

      drop(mockEvent);

      expect(state.houses["house-0"]).not.toContain('Alice');
      expect(state.houses["house-1"]).toContain('Alice');
      expect(house1Container.contains(nameWrapper)).toBe(true);
    });

    it('does nothing when target is not name-container', () => {
      enterName('Alice');
      const nameWrapper = document.querySelector('#wrapper-Alice');
      const otherElement = document.querySelector('#addHouse');

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

  describe('dragLeave', () => {
    it('resets background color to transparent', () => {
      const mockEvent = {
        target: {
          style: {
            backgroundColor: '#ffffff9e'
          }
        }
      };

      dragLeave(mockEvent);

      expect(mockEvent.target.style.backgroundColor).toBe('transparent');
    });

    it('sets background color to transparent even if it was already transparent', () => {
      const mockEvent = {
        target: {
          style: {
            backgroundColor: 'transparent'
          }
        }
      };

      dragLeave(mockEvent);

      expect(mockEvent.target.style.backgroundColor).toBe('transparent');
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
});