import {beforeEach, describe, expect, it, vi} from 'vitest';
import main from '../resources/js/main';

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

vi.mock('../resources/js/components/controlStrip/controlStrip', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/controlStrip/nextStepButton', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/controlStrip/addHouseButton', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/controlStrip/generateButton', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/emailTable/emailTable', () => ({
  init: vi.fn(),
}));

vi.mock('../resources/js/components/emailQuery', () => ({
  initEventListeners: vi.fn(),
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

it('calls controlStrip.init', async () => {
  const {init} = await import('../resources/js/components/controlStrip/controlStrip');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls nextStepButton.init', async () => {
  const {init} = await import('../resources/js/components/controlStrip/nextStepButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls addHouseButton.init', async () => {
  const {init} = await import('../resources/js/components/controlStrip/addHouseButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls generateButton.init', async () => {
  const {init} = await import('../resources/js/components/controlStrip/generateButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

  it('calls emailTable.init', async () => {
    const {init} = await import('../resources/js/components/emailTable/emailTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
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
    const controlStrip = await import('../resources/js/components/controlStrip/controlStrip');
    const nextStepButton = await import('../resources/js/components/controlStrip/nextStepButton');
    const addHouseButton = await import('../resources/js/components/controlStrip/addHouseButton');
    const generateButton = await import('../resources/js/components/controlStrip/generateButton');
    const emailTable = await import('../resources/js/components/emailTable/emailTable');
    const emailQuery = await import('../resources/js/components/emailQuery');
    const {initDragDrop} = await import('../resources/js/dragDrop');

    main();

    expect(house.init).toHaveBeenCalledTimes(1);
    expect(name.init).toHaveBeenCalledTimes(1);
    expect(select.init).toHaveBeenCalledTimes(1);
    expect(resultsTable.init).toHaveBeenCalledTimes(1);
    expect(controlStrip.init).toHaveBeenCalledTimes(1);
    expect(nextStepButton.init).toHaveBeenCalledTimes(1);
    expect(addHouseButton.init).toHaveBeenCalledTimes(1);
    expect(generateButton.init).toHaveBeenCalledTimes(1);
    expect(emailTable.init).toHaveBeenCalledTimes(1);
    expect(emailQuery.initEventListeners).toHaveBeenCalledTimes(1);
    expect(initDragDrop).toHaveBeenCalledTimes(1);

    const houseOrder = house.init.mock.invocationCallOrder[0];
    const nameOrder = name.init.mock.invocationCallOrder[0];
    const selectOrder = select.init.mock.invocationCallOrder[0];
    const resultsTableOrder = resultsTable.init.mock.invocationCallOrder[0];
    const controlStripOrder = controlStrip.init.mock.invocationCallOrder[0];
    const nextStepOrder = nextStepButton.init.mock.invocationCallOrder[0];
    const addHouseOrder = addHouseButton.init.mock.invocationCallOrder[0];
    const generateOrder = generateButton.init.mock.invocationCallOrder[0];
    const emailTableOrder = emailTable.init.mock.invocationCallOrder[0];
    const emailQueryOrder = emailQuery.initEventListeners.mock.invocationCallOrder[0];
    const dragDropOrder = initDragDrop.mock.invocationCallOrder[0];

    expect(houseOrder).toBeLessThan(nameOrder);
    expect(nameOrder).toBeLessThan(selectOrder);
    expect(selectOrder).toBeLessThan(resultsTableOrder);
    expect(resultsTableOrder).toBeLessThan(controlStripOrder);
    expect(controlStripOrder).toBeLessThan(nextStepOrder);
    expect(nextStepOrder).toBeLessThan(addHouseOrder);
    expect(addHouseOrder).toBeLessThan(generateOrder);
    expect(generateOrder).toBeLessThan(emailTableOrder);
    expect(emailTableOrder).toBeLessThan(emailQueryOrder);
    expect(emailQueryOrder).toBeLessThan(dragDropOrder);
  });
});
