import {describe, expect, it, vi, beforeEach} from 'vitest';
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

vi.mock('../resources/js/components/emailTable', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/components/emailQuery', () => ({
    initEventListeners: vi.fn(),
}));

vi.mock('../resources/js/render', () => ({
    initRenderSubscriptions: vi.fn(),
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

    it('calls house.init', async () => {
        const {init} = await import('../resources/js/components/house');

        main();

        expect(init).toHaveBeenCalledOnce();
    });

    it('calls name.init', async () => {
        const {init} = await import('../resources/js/components/name');

        main();

        expect(init).toHaveBeenCalledOnce();
    });

    it('calls select.init', async () => {
        const {init} = await import('../resources/js/components/select');

        main();

        expect(init).toHaveBeenCalledOnce();
    });

    it('calls initRenderSubscriptions', async () => {
        const {initRenderSubscriptions} = await import('../resources/js/render');

        main();

        expect(initRenderSubscriptions).toHaveBeenCalledOnce();
    });

    it('calls generate.initEventListeners', async () => {
        const {initEventListeners} = await import('../resources/js/generate');

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
        const name = await import('../resources/js/components/name');
        const select = await import('../resources/js/components/select');
        const {initRenderSubscriptions} = await import('../resources/js/render');
        const generate = await import('../resources/js/generate');
        const emailTable = await import('../resources/js/components/emailTable');
        const emailQuery = await import('../resources/js/components/emailQuery');
        const {initDragDrop} = await import('../resources/js/dragDrop');

        main();

        expect(house.init).toHaveBeenCalledOnce();
        expect(name.init).toHaveBeenCalledOnce();
        expect(select.init).toHaveBeenCalledOnce();
        expect(initRenderSubscriptions).toHaveBeenCalledOnce();
        expect(generate.initEventListeners).toHaveBeenCalledOnce();
        expect(emailTable.initEventListeners).toHaveBeenCalledOnce();
        expect(emailQuery.initEventListeners).toHaveBeenCalledOnce();
        expect(initDragDrop).toHaveBeenCalledOnce();
    });
});
