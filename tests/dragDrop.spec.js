import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {allowDrop, drag, dragLeave, drop, initDragDrop} from '../resources/js/dragDrop';

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
    let container;
    let draggableElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.className = 'name-container';
      container.style.backgroundColor = '#ffffff9e';
      document.body.appendChild(container);

      draggableElement = document.createElement('div');
      draggableElement.id = 'name-123';
      draggableElement.textContent = 'Test Name';
      document.body.appendChild(draggableElement);
    });

    afterEach(() => {
      container.remove();
      draggableElement.remove();
    });

    it('appends element to target and resets background when target is name-container', () => {
      const mockEvent = {
        target: container,
        dataTransfer: {
          getData: vi.fn(() => 'name-123')
        },
        preventDefault: vi.fn()
      };

      drop(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.dataTransfer.getData).toHaveBeenCalledWith('text');
      expect(container.contains(draggableElement)).toBe(true);
      expect(container.style.backgroundColor).toBe('transparent');
    });

    it('does nothing when target is not name-container', () => {
      const otherElement = document.createElement('div');
      otherElement.className = 'other-class';
      document.body.appendChild(otherElement);

      const mockEvent = {
        target: otherElement,
        dataTransfer: {
          getData: vi.fn()
        },
        preventDefault: vi.fn()
      };

      const initialParent = draggableElement.parentElement;

      drop(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.dataTransfer.getData).not.toHaveBeenCalled();
      expect(draggableElement.parentElement).toBe(initialParent);

      otherElement.remove();
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
      const container = document.createElement('div');
      container.id = 'left-container';
      document.body.appendChild(container);

      expect(() => initDragDrop()).not.toThrow();

      container.remove();
    });

    it('handles missing container gracefully', () => {
      const container = document.getElementById('left-container');
      if (container) container.remove();

      expect(() => initDragDrop()).not.toThrow();
    });
  });
});