import { expect, test } from 'vitest'
import state from '/resources/js/state.js'

test('initial state', () => {
    expect(state.houses).toEqual([]);
    expect(state.isGenerated).toEqual(false);
    expect(state.introIndex).toEqual(0);
    expect(state.isSecretSanta).toEqual(false);
    expect(state.givers).toEqual([]);
    expect(state.houseID).toEqual(0);
    expect(state.nameNumber).toEqual(1);
})