import {beforeEach, describe, expect, it, vi} from 'vitest';
import main from '../src/main';

vi.mock('../src/dragDrop', () => ({
  initDragDrop: vi.fn(),
}));

vi.mock('../src/components/House', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../src/components/Name', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../src/components/Select', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/ResultsTable', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/ControlStrip/ControlStrip', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/ControlStrip/NextStepButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/ControlStrip/AddHouseButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/ControlStrip/GenerateButton', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/EmailTable/EmailTable', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/EmailQuery', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/Snackbar', () => ({
  init: vi.fn(),
}));

vi.mock('../src/components/EmailTable/SendEmails', () => ({
  init: vi.fn(),
}));

describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls house.init', async () => {
    const {init} = await import('../src/components/House');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls name.init', async () => {
    const {init} = await import('../src/components/Name');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls select.init', async () => {
    const {init} = await import('../src/components/Select');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls resultsTable.init', async () => {
    const {init} = await import('../src/components/ResultsTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

it('calls controlStrip.init', async () => {
  const {init} = await import('../src/components/ControlStrip/ControlStrip');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls nextStepButton.init', async () => {
  const {init} = await import('../src/components/ControlStrip/NextStepButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls addHouseButton.init', async () => {
  const {init} = await import('../src/components/ControlStrip/AddHouseButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls generateButton.init', async () => {
  const {init} = await import('../src/components/ControlStrip/GenerateButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

  it('calls emailTable.init', async () => {
    const {init} = await import('../src/components/EmailTable/EmailTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls emailQuery.init', async () => {
    const {init} = await import('../src/components/EmailQuery');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls snackbar.init', async () => {
    const {init} = await import('../src/components/Snackbar');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls initDragDrop', async () => {
    const {initDragDrop} = await import('../src/dragDrop');
    main();
    expect(initDragDrop).toHaveBeenCalledTimes(1);
  });

  it('calls all initialization functions in order', async () => {
    const snackbar = await import('../src/components/Snackbar');
    const house = await import('../src/components/House');
    const name = await import('../src/components/Name');
    const select = await import('../src/components/Select');
    const resultsTable = await import('../src/components/ResultsTable');
    const controlStrip = await import('../src/components/ControlStrip/ControlStrip');
    const nextStepButton = await import('../src/components/ControlStrip/NextStepButton');
    const addHouseButton = await import('../src/components/ControlStrip/AddHouseButton');
    const generateButton = await import('../src/components/ControlStrip/GenerateButton');
    const emailTable = await import('../src/components/EmailTable/EmailTable');
    const emailQuery = await import('../src/components/EmailQuery');
    const sendEmails = await import('../src/components/EmailTable/SendEmails');
    const {initDragDrop} = await import('../src/dragDrop');

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
