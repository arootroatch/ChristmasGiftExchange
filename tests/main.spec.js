import {beforeEach, describe, expect, it, vi} from 'vitest';
import main from '../src/js/main';

vi.mock('../src/js/dragDrop', () => ({
  initDragDrop: vi.fn(),
}));

vi.mock('../src/js/components/House', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../src/js/components/Name', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../src/js/components/Select', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/ResultsTable', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/ControlStrip/ControlStrip', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/ControlStrip/NextStepButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/ControlStrip/AddHouseButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/ControlStrip/GenerateButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/EmailTable/EmailTable', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/EmailQuery', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/Snackbar', () => ({
  init: vi.fn(),
}));

vi.mock('../src/js/components/EmailTable/SendEmails', () => ({
  init: vi.fn(),
}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls house.init', async () => {
    const {init} = await import('../src/js/components/House');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls name.init', async () => {
    const {init} = await import('../src/js/components/Name');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls select.init', async () => {
    const {init} = await import('../src/js/components/Select');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls resultsTable.init', async () => {
    const {init} = await import('../src/js/components/ResultsTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

it('calls controlStrip.init', async () => {
  const {init} = await import('../src/js/components/ControlStrip/ControlStrip');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls nextStepButton.init', async () => {
  const {init} = await import('../src/js/components/ControlStrip/NextStepButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls addHouseButton.init', async () => {
  const {init} = await import('../src/js/components/ControlStrip/AddHouseButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls generateButton.init', async () => {
  const {init} = await import('../src/js/components/ControlStrip/GenerateButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

  it('calls emailTable.init', async () => {
    const {init} = await import('../src/js/components/EmailTable/EmailTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls emailQuery.init', async () => {
    const {init} = await import('../src/js/components/EmailQuery');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls snackbar.init', async () => {
    const {init} = await import('../src/js/components/Snackbar');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls initDragDrop', async () => {
    const {initDragDrop} = await import('../src/js/dragDrop');
    main();
    expect(initDragDrop).toHaveBeenCalledTimes(1);
  });

  it('calls all initialization functions in order', async () => {
    const snackbar = await import('../src/js/components/Snackbar');
    const house = await import('../src/js/components/House');
    const name = await import('../src/js/components/Name');
    const select = await import('../src/js/components/Select');
    const resultsTable = await import('../src/js/components/ResultsTable');
    const controlStrip = await import('../src/js/components/ControlStrip/ControlStrip');
    const nextStepButton = await import('../src/js/components/ControlStrip/NextStepButton');
    const addHouseButton = await import('../src/js/components/ControlStrip/AddHouseButton');
    const generateButton = await import('../src/js/components/ControlStrip/GenerateButton');
    const emailTable = await import('../src/js/components/EmailTable/EmailTable');
    const emailQuery = await import('../src/js/components/EmailQuery');
    const sendEmails = await import('../src/js/components/EmailTable/SendEmails');
    const {initDragDrop} = await import('../src/js/dragDrop');

    main();

    expect(snackbar.init).toHaveBeenCalledTimes(1);
    expect(house.init).toHaveBeenCalledTimes(1);
    expect(name.init).toHaveBeenCalledTimes(1);
    expect(select.init).toHaveBeenCalledTimes(1);
    expect(resultsTable.init).toHaveBeenCalledTimes(1);
    expect(controlStrip.init).toHaveBeenCalledTimes(1);
    expect(nextStepButton.init).toHaveBeenCalledTimes(1);
    expect(addHouseButton.init).toHaveBeenCalledTimes(1);
    expect(generateButton.init).toHaveBeenCalledTimes(1);
    expect(emailTable.init).toHaveBeenCalledTimes(1);
    expect(emailQuery.init).toHaveBeenCalledTimes(1);
    expect(sendEmails.init).toHaveBeenCalledTimes(1);
    expect(initDragDrop).toHaveBeenCalledTimes(1);

    const snackbarOrder = snackbar.init.mock.invocationCallOrder[0];
    const houseOrder = house.init.mock.invocationCallOrder[0];
    const nameOrder = name.init.mock.invocationCallOrder[0];
    const selectOrder = select.init.mock.invocationCallOrder[0];
    const resultsTableOrder = resultsTable.init.mock.invocationCallOrder[0];
    const controlStripOrder = controlStrip.init.mock.invocationCallOrder[0];
    const nextStepOrder = nextStepButton.init.mock.invocationCallOrder[0];
    const addHouseOrder = addHouseButton.init.mock.invocationCallOrder[0];
    const generateOrder = generateButton.init.mock.invocationCallOrder[0];
    const emailTableOrder = emailTable.init.mock.invocationCallOrder[0];
    const emailQueryOrder = emailQuery.init.mock.invocationCallOrder[0];
    const sendEmailsOrder = sendEmails.init.mock.invocationCallOrder[0];
    const dragDropOrder = initDragDrop.mock.invocationCallOrder[0];

    expect(snackbarOrder).toBeLessThan(houseOrder);
    expect(houseOrder).toBeLessThan(nameOrder);
    expect(nameOrder).toBeLessThan(selectOrder);
    expect(selectOrder).toBeLessThan(resultsTableOrder);
    expect(resultsTableOrder).toBeLessThan(controlStripOrder);
    expect(controlStripOrder).toBeLessThan(nextStepOrder);
    expect(nextStepOrder).toBeLessThan(addHouseOrder);
    expect(addHouseOrder).toBeLessThan(generateOrder);
    expect(generateOrder).toBeLessThan(emailTableOrder);
    expect(emailTableOrder).toBeLessThan(emailQueryOrder);
    expect(emailQueryOrder).toBeLessThan(sendEmailsOrder);
    expect(sendEmailsOrder).toBeLessThan(dragDropOrder);
  });
});
