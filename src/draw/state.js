const state = {
  exchangeId: null,
  names: [],
  screen: 'loading',
  selectedName: null,
  recipient: null,
  errorMessage: null,
};

export function getState() {
  return state;
}

export function setExchangeId(id) {
  state.exchangeId = id;
}

export function setNames(names) {
  state.names = names;
  state.errorMessage = null;
  state.screen = 'picker';
}

export function setNotFound() {
  state.screen = 'notFound';
}

export function selectName(name) {
  state.selectedName = name;
  state.screen = 'confirm';
}

export function cancelConfirm() {
  state.selectedName = null;
  state.screen = 'picker';
}

export function setRevealed(recipient) {
  state.recipient = recipient;
  state.screen = 'reveal';
}

export function setDrawError(message, names) {
  state.errorMessage = message;
  state.names = names;
  state.selectedName = null;
  state.screen = 'picker';
}
