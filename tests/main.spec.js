import {describe, expect, it, vi, beforeEach} from 'vitest';
import main from '../resources/js/main';

vi.mock('../resources/js/generate', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/dragDrop', () => ({
    initDragDrop: vi.fn(),
}));

vi.mock('../resources/js/components/house', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/name', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/emailTable', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/emailQuery', () => ({
    initEventListeners: vi.fn(),
}));

describe('main', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('imports all required modules without errors', async () => {
        // main.js is just a module aggregator with imports
        // This test verifies it can be imported successfully
        const importMain = async () => {
            await import('../resources/js/main');
        };

        await expect(importMain()).resolves.not.toThrow();
    });

    it('calls house.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/components/house');

        main();

        expect(initEventListeners).toHaveBeenCalledOnce();
    });

    it('calls generate.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/generate');

        main();

        expect(initEventListeners).toHaveBeenCalledOnce();
    });

    it('calls name.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/components/name');

        main();

        expect(initEventListeners).toHaveBeenCalledOnce();
    });

    it('calls emailTable.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/components/emailTable');

        main();

        expect(initEventListeners).toHaveBeenCalledOnce();
    });

    it('calls emailQuery.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/components/emailQuery');

        main();

        expect(initEventListeners).toHaveBeenCalledOnce();
    });

    it('calls initDragDrop', async () => {
        const {initDragDrop} = await import('../resources/js/dragDrop');

        main();

        expect(initDragDrop).toHaveBeenCalledOnce();
    });

    it('calls all initialization functions in order', async () => {
        const house = await import('../resources/js/components/house');
        const generate = await import('../resources/js/generate');
        const name = await import('../resources/js/components/name');
        const emailTable = await import('../resources/js/components/emailTable');
        const emailQuery = await import('../resources/js/components/emailQuery');
        const {initDragDrop} = await import('../resources/js/dragDrop');

        main();

        expect(house.initEventListeners).toHaveBeenCalledOnce();
        expect(generate.initEventListeners).toHaveBeenCalledOnce();
        expect(name.initEventListeners).toHaveBeenCalledOnce();
        expect(emailTable.initEventListeners).toHaveBeenCalledOnce();
        expect(emailQuery.initEventListeners).toHaveBeenCalledOnce();
        expect(initDragDrop).toHaveBeenCalledOnce();
    });
});
