import { expect, test } from 'vitest'
import state from '/resources/js/state.js'

test('initial state', () => {
    expect(state.houses).toEqual([]);
    expect(state.generated).toEqual(false);
    expect(state.duplicate).toEqual(null);
    expect(state.availRecipients).toEqual([]);
    expect(state.introIndex).toEqual(0);
    expect(state.secretSanta).toEqual(false);
    expect(state.givers).toEqual([]);
    expect(state.houseID).toEqual(0);
    expect(state.nameNumber).toEqual(1);
})