import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import main from '../../src/exchange/index';

vi.mock('../../src/exchange/dragDrop', () => ({
  initDragDrop: vi.fn(),
}));

vi.mock('../../src/exchange/state', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadExchange: vi.fn(),
  };
});

vi.mock('../../src/exchange/components/House', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../../src/exchange/components/Name', () => ({
  init: vi.fn(),
  initEventListeners: vi.fn(),
}));

vi.mock('../../src/exchange/components/Select', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/ResultsTable', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/ControlStrip/ControlStrip', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/GhostHouse', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/ControlStrip/GenerateButton', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/EmailTable/EmailTable', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/RecipientSearch', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/Instructions', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/ReuseLink', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/Snackbar', () => ({
  init: vi.fn(),
  showError: vi.fn(),
}));


describe('main', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls house.init', async () => {
    const {init} = await import('../../src/exchange/components/House');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls name.init', async () => {
    const {init} = await import('../../src/exchange/components/Name');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls select.init', async () => {
    const {init} = await import('../../src/exchange/components/Select');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls resultsTable.init', async () => {
    const {init} = await import('../../src/exchange/components/ResultsTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

it('calls controlStrip.init', async () => {
  const {init} = await import('../../src/exchange/components/ControlStrip/ControlStrip');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls ghostHouse.init', async () => {
  const {init} = await import('../../src/exchange/components/GhostHouse');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls generateButton.init', async () => {
  const {init} = await import('../../src/exchange/components/ControlStrip/GenerateButton');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

  it('calls emailTable.init', async () => {
    const {init} = await import('../../src/exchange/components/EmailTable/EmailTable');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls recipientSearch.init', async () => {
    const {init} = await import('../../src/exchange/components/RecipientSearch');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls instructions.init', async () => {
    const {init} = await import('../../src/exchange/components/Instructions');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls reuseLink.init', async () => {
    const {init} = await import('../../src/exchange/components/ReuseLink');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls snackbar.init', async () => {
    const {init} = await import('../../src/Snackbar');

    main();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('calls initDragDrop', async () => {
    const {initDragDrop} = await import('../../src/exchange/dragDrop');
    main();
    expect(initDragDrop).toHaveBeenCalledTimes(1);
  });

  it('calls all initialization functions in order', async () => {
    const snackbar = await import('../../src/Snackbar');
    const house = await import('../../src/exchange/components/House');
    const name = await import('../../src/exchange/components/Name');
    const select = await import('../../src/exchange/components/Select');
    const resultsTable = await import('../../src/exchange/components/ResultsTable');
    const controlStrip = await import('../../src/exchange/components/ControlStrip/ControlStrip');
    const generateButton = await import('../../src/exchange/components/ControlStrip/GenerateButton');
    const ghostHouse = await import('../../src/exchange/components/GhostHouse');
    const emailTable = await import('../../src/exchange/components/EmailTable/EmailTable');
    const recipientSearch = await import('../../src/exchange/components/RecipientSearch');
    const instructions = await import('../../src/exchange/components/Instructions');
    const reuseLink = await import('../../src/exchange/components/ReuseLink');
    const {initDragDrop} = await import('../../src/exchange/dragDrop');

    main();

    expect(snackbar.init).toHaveBeenCalledTimes(1);
    expect(house.init).toHaveBeenCalledTimes(1);
    expect(name.init).toHaveBeenCalledTimes(1);
    expect(select.init).toHaveBeenCalledTimes(1);
    expect(resultsTable.init).toHaveBeenCalledTimes(1);
    expect(controlStrip.init).toHaveBeenCalledTimes(1);
    expect(generateButton.init).toHaveBeenCalledTimes(1);
    expect(ghostHouse.init).toHaveBeenCalledTimes(1);
    expect(emailTable.init).toHaveBeenCalledTimes(1);
    expect(recipientSearch.init).toHaveBeenCalledTimes(1);
    expect(instructions.init).toHaveBeenCalledTimes(1);
    expect(reuseLink.init).toHaveBeenCalledTimes(1);
    expect(initDragDrop).toHaveBeenCalledTimes(1);

    const snackbarOrder = snackbar.init.mock.invocationCallOrder[0];
    const houseOrder = house.init.mock.invocationCallOrder[0];
    const nameOrder = name.init.mock.invocationCallOrder[0];
    const selectOrder = select.init.mock.invocationCallOrder[0];
    const resultsTableOrder = resultsTable.init.mock.invocationCallOrder[0];
    const controlStripOrder = controlStrip.init.mock.invocationCallOrder[0];
    const generateOrder = generateButton.init.mock.invocationCallOrder[0];
    const ghostHouseOrder = ghostHouse.init.mock.invocationCallOrder[0];
    const instructionsOrder = instructions.init.mock.invocationCallOrder[0];
    const emailTableOrder = emailTable.init.mock.invocationCallOrder[0];
    const recipientSearchOrder = recipientSearch.init.mock.invocationCallOrder[0];
    const reuseLinkOrder = reuseLink.init.mock.invocationCallOrder[0];
    const dragDropOrder = initDragDrop.mock.invocationCallOrder[0];

    expect(snackbarOrder).toBeLessThan(houseOrder);
    expect(houseOrder).toBeLessThan(nameOrder);
    expect(nameOrder).toBeLessThan(selectOrder);
    expect(selectOrder).toBeLessThan(resultsTableOrder);
    expect(resultsTableOrder).toBeLessThan(controlStripOrder);
    expect(controlStripOrder).toBeLessThan(generateOrder);
    expect(generateOrder).toBeLessThan(ghostHouseOrder);
    expect(ghostHouseOrder).toBeLessThan(instructionsOrder);
    expect(instructionsOrder).toBeLessThan(emailTableOrder);
    expect(emailTableOrder).toBeLessThan(recipientSearchOrder);
    expect(recipientSearchOrder).toBeLessThan(reuseLinkOrder);
    expect(reuseLinkOrder).toBeLessThan(dragDropOrder);
  });

  describe('sessionStorage reuse', () => {
    afterEach(() => {
      sessionStorage.clear();
    });

    it('calls loadExchange when reuseExchange data exists in sessionStorage', async () => {
      const exchangeData = {
        isSecretSanta: true,
        houses: [{name: "Group 1", members: ["Alex"]}],
        participants: [{name: "Alex", email: "alex@test.com"}]
      };
      sessionStorage.setItem("reuseExchange", JSON.stringify(exchangeData));
      const {loadExchange} = await import('../../src/exchange/state');

      main();

      expect(loadExchange).toHaveBeenCalledWith(exchangeData);
    });

    it('removes reuseExchange from sessionStorage after loading', async () => {
      const exchangeData = {isSecretSanta: false, houses: [], participants: []};
      sessionStorage.setItem("reuseExchange", JSON.stringify(exchangeData));

      main();

      expect(sessionStorage.getItem("reuseExchange")).toBeNull();
    });

    it('does not call loadExchange when no reuseExchange in sessionStorage', async () => {
      const {loadExchange} = await import('../../src/exchange/state');

      main();

      expect(loadExchange).not.toHaveBeenCalled();
    });

});
});
