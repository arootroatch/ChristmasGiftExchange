import {beforeEach, describe, expect, it, vi} from 'vitest';
import main from '../resources/js/main';

vi.mock('../resources/js/generate', () => ({
  initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/dragDrop', () => ({
  initDragDrop: vi.fn(),
}));

vi.mock('../resources/js/components/house', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/name', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/select', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/resultsTable', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/emailTable', () => ({
  initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/emailQuery', () => ({
  initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/render', () => ({
  initRenderSubscriptions: vi.fn(),
  registerComponent: vi.fn(),
}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls house.init', async () => {
    const {init} = await import('../resources/js/components/house');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls name.init', async () => {
    const {init} = await import('../resources/js/components/name');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls select.init', async () => {
    const {init} = await import('../resources/js/components/select');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls resultsTable.init', async () => {
    const {init} = await import('../resources/js/components/resultsTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls initRenderSubscriptions', async () => {
    const {initRenderSubscriptions} = await import('../resources/js/render');

    main();

    expect(initRenderSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('calls generate.initEventListeners', async () => {
    const {initEventListeners} = await import('../resources/js/generate');

    main();

    expect(initEventListeners).toHaveBeenCalledTimes(1);
  });

  it('calls emailTable.initEventListeners', async () => {
    const {initEventListeners} = await import('../resources/js/components/emailTable');

    main();

    expect(initEventListeners).toHaveBeenCalledTimes(1);
  });

  it('calls emailQuery.initEventListeners', async () => {
    const {initEventListeners} = await import('../resources/js/components/emailQuery');

    main();

    expect(initEventListeners).toHaveBeenCalledTimes(1);
  });

  it('calls initDragDrop', async () => {
    const {initDragDrop} = await import('../resources/js/dragDrop');
    main();
    expect(initDragDrop).toHaveBeenCalledTimes(1);
  });

  it('calls all initialization functions in order', async () => {
    const house = await import('../resources/js/components/house');
    const name = await import('../resources/js/components/name');
    const select = await import('../resources/js/components/select');
    const resultsTable = await import('../resources/js/components/resultsTable');
    const {initRenderSubscriptions} = await import('../resources/js/render');
    const generate = await import('../resources/js/generate');
    const emailTable = await import('../resources/js/components/emailTable');
    const emailQuery = await import('../resources/js/components/emailQuery');
    const {initDragDrop} = await import('../resources/js/dragDrop');

    main();

    // Verify all functions were called
    expect(house.init).toHaveBeenCalledTimes(1);
    expect(name.init).toHaveBeenCalledTimes(1);
    expect(select.init).toHaveBeenCalledTimes(1);
    expect(resultsTable.init).toHaveBeenCalledTimes(1);
    expect(initRenderSubscriptions).toHaveBeenCalledTimes(1);
    expect(generate.initEventListeners).toHaveBeenCalledTimes(1);
    expect(emailTable.initEventListeners).toHaveBeenCalledTimes(1);
    expect(emailQuery.initEventListeners).toHaveBeenCalledTimes(1);
    expect(initDragDrop).toHaveBeenCalledTimes(1);

    // Verify the order using invocationCallOrder
    const houseOrder = house.init.mock.invocationCallOrder[0];
    const nameOrder = name.init.mock.invocationCallOrder[0];
    const selectOrder = select.init.mock.invocationCallOrder[0];
    const resultsTableOrder = resultsTable.init.mock.invocationCallOrder[0];
    const renderOrder = initRenderSubscriptions.mock.invocationCallOrder[0];
    const generateOrder = generate.initEventListeners.mock.invocationCallOrder[0];
    const emailTableOrder = emailTable.initEventListeners.mock.invocationCallOrder[0];
    const emailQueryOrder = emailQuery.initEventListeners.mock.invocationCallOrder[0];
    const dragDropOrder = initDragDrop.mock.invocationCallOrder[0];

    expect(houseOrder).toBeLessThan(nameOrder);
    expect(nameOrder).toBeLessThan(selectOrder);
    expect(selectOrder).toBeLessThan(resultsTableOrder);
    expect(resultsTableOrder).toBeLessThan(renderOrder);
    expect(renderOrder).toBeLessThan(generateOrder);
    expect(generateOrder).toBeLessThan(emailTableOrder);
    expect(emailTableOrder).toBeLessThan(emailQueryOrder);
    expect(emailQueryOrder).toBeLessThan(dragDropOrder);
  });
});
