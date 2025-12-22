import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import state from '../resources/js/state';

describe('layout', () => {
    let nextStepBtn, letsGoBtn, secretSantaBtn, addHouseBtn, generateBtn, secretGenerateBtn;
    let nameList, resultsTable, intro, leftContainer, emailTable, emailTableBody;
    let stepOne, introNext, secretSantaMode, conditionalRender;

    beforeAll(async () => {
        // Remove existing elements from index.html
        document.getElementById('name-list')?.remove();
        document.getElementById('results-table')?.remove();
        document.getElementById('intro')?.remove();
        document.getElementById('left-container')?.remove();
        document.getElementById('nextStep')?.remove();
        document.getElementById('letsGo')?.remove();
        document.getElementById('secretSantaBtn')?.remove();
        document.getElementById('addHouse')?.remove();
        document.getElementById('generate')?.remove();
        document.getElementById('secretGenerate')?.remove();
        document.getElementById('emailTable')?.remove();
        document.getElementById('hideEmails')?.remove();

        // Create required DOM elements
        nameList = document.createElement('div');
        nameList.id = 'name-list';
        nameList.style.display = 'none';

        resultsTable = document.createElement('table');
        resultsTable.id = 'results-table';
        resultsTable.style.display = 'none';

        intro = document.createElement('div');
        intro.id = 'intro';

        leftContainer = document.createElement('div');
        leftContainer.id = 'left-container';

        nextStepBtn = document.createElement('button');
        nextStepBtn.id = 'nextStep';
        nextStepBtn.style.display = 'none';

        letsGoBtn = document.createElement('button');
        letsGoBtn.id = 'letsGo';

        secretSantaBtn = document.createElement('button');
        secretSantaBtn.id = 'secretSantaBtn';

        addHouseBtn = document.createElement('button');
        addHouseBtn.id = 'addHouse';
        addHouseBtn.style.display = 'none';

        generateBtn = document.createElement('button');
        generateBtn.id = 'generate';
        generateBtn.style.display = 'none';

        secretGenerateBtn = document.createElement('button');
        secretGenerateBtn.id = 'secretGenerate';
        secretGenerateBtn.style.display = 'none';

        emailTable = document.createElement('div');
        emailTable.id = 'emailTable';
        emailTable.className = 'hidden';

        emailTableBody = document.createElement('form');
        emailTableBody.id = 'emailTableBody';
        emailTable.appendChild(emailTableBody);

        const hideEmailsBtn = document.createElement('button');
        hideEmailsBtn.id = 'hideEmails';

        document.body.appendChild(nameList);
        document.body.appendChild(resultsTable);
        document.body.appendChild(intro);
        document.body.appendChild(leftContainer);
        document.body.appendChild(nextStepBtn);
        document.body.appendChild(letsGoBtn);
        document.body.appendChild(secretSantaBtn);
        document.body.appendChild(addHouseBtn);
        document.body.appendChild(generateBtn);
        document.body.appendChild(secretGenerateBtn);
        document.body.appendChild(emailTable);
        document.body.appendChild(hideEmailsBtn);

        // Import layout module and get exported functions
        // Don't use vi.resetModules() to avoid state module instance isolation
        const layoutModule = await import('../resources/js/layout');
        stepOne = layoutModule.stepOne;
        introNext = layoutModule.introNext;
        secretSantaMode = layoutModule.secretSantaMode;
        conditionalRender = layoutModule.conditionalRender;
    });

    beforeEach(() => {
        // Reset state before each test
        state.introIndex = 0;
        state.givers = [];
        state.generated = false;
        state.secretSanta = false;

        // Reset element styles
        nameList.style.display = 'none';
        resultsTable.style.display = 'none';
        nextStepBtn.style.display = 'none';
        addHouseBtn.style.display = 'none';
        generateBtn.style.display = 'none';
        secretGenerateBtn.style.display = 'none';
        emailTable.className = 'hidden';
        leftContainer.className = '';
        intro.innerHTML = '';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('stepOne', () => {
        it('displays name-list', () => {
            stepOne();

            expect(nameList.style.display).toBe('block');
        });

        it('displays results-table in normal mode', () => {
            state.secretSanta = false;

            stepOne();

            expect(resultsTable.style.display).toBe('table');
        });

        it('does not display results-table in secret santa mode', () => {
            state.secretSanta = true;

            stepOne();

            expect(resultsTable.style.display).toBe('none');
        });

        it('displays nextStep button', () => {
            stepOne();

            expect(nextStepBtn.style.display).toBe('block');
        });

        it('calls introNext which increments introIndex', () => {
            state.introIndex = 0;

            stepOne();

            expect(state.introIndex).toBe(1);
        });
    });

    describe('introNext', () => {
        it('does not advance from step 1 without givers', () => {
            state.introIndex = 1;
            state.givers = [];

            introNext();

            expect(state.introIndex).toBe(1);
        });

        it('advances from step 1 with givers', () => {
            state.introIndex = 1;
            state.givers = [{name: 'Alice', recipient: ''}];

            introNext();

            expect(state.introIndex).toBe(2);
            expect(intro.innerHTML).toContain('Step 2 / 4');
        });

        it('does not advance from step 3 without generation', () => {
            state.introIndex = 3;
            state.givers = [{name: 'Alice', recipient: ''}];
            state.generated = false;

            introNext();

            expect(state.introIndex).toBe(3);
        });

        it('advances from step 3 with generated list', () => {
            state.introIndex = 3;
            state.givers = [{name: 'Alice', recipient: ''}];
            state.generated = true;

            introNext();

            expect(state.introIndex).toBe(4);
            expect(nextStepBtn.style.display).toBe('none');
        });

        it('updates intro div innerHTML with step content', () => {
            state.introIndex = 0;
            state.givers = [{name: 'Alice', recipient: ''}];

            introNext();

            expect(intro.innerHTML).toContain('Step 1 / 4');
            expect(state.introIndex).toBe(1);
        });

        it('calls conditionalRender to update button visibility', () => {
            state.introIndex = 0;
            state.givers = [{name: 'Alice', recipient: ''}];

            introNext(); // Move to step 1

            expect(state.introIndex).toBe(1);
            expect(addHouseBtn.style.display).toBe('none');
        });
    });

    describe('conditionalRender', () => {
        it('does nothing at step 0', () => {
            state.introIndex = 0;
            addHouseBtn.style.display = 'block';
            generateBtn.style.display = 'block';

            conditionalRender();

            // No changes should be made
            expect(addHouseBtn.style.display).toBe('block');
            expect(generateBtn.style.display).toBe('block');
        });

        it('hides addHouse button at step 1', () => {
            state.introIndex = 1;
            addHouseBtn.style.display = 'block';

            conditionalRender();

            expect(addHouseBtn.style.display).toBe('none');
        });

        it('shows addHouse button at step 2', () => {
            state.introIndex = 2;

            conditionalRender();

            expect(addHouseBtn.style.display).toBe('block');
            expect(secretGenerateBtn.style.display).toBe('none');
            expect(generateBtn.style.display).toBe('none');
        });

        it('shows generate button in normal mode at step 3', () => {
            state.introIndex = 3;
            state.secretSanta = false;

            conditionalRender();

            expect(generateBtn.style.display).toBe('block');
            expect(addHouseBtn.style.display).toBe('none');
        });

        it('shows secretGenerate button in secret santa mode at step 3', () => {
            state.introIndex = 3;
            state.secretSanta = true;

            conditionalRender();

            expect(secretGenerateBtn.style.display).toBe('block');
            expect(generateBtn.style.display).toBe('none');
            expect(nextStepBtn.style.display).toBe('none');
        });

        it('hides generate buttons at step 4', () => {
            state.introIndex = 4;
            generateBtn.style.display = 'block';
            secretGenerateBtn.style.display = 'block';

            conditionalRender();

            expect(generateBtn.style.display).toBe('none');
            expect(secretGenerateBtn.style.display).toBe('none');
        });
    });

    describe('secretSantaMode', () => {
        it('sets secretSanta state to true', () => {
            expect(state.secretSanta).toBe(false);

            secretSantaMode();

            expect(state.secretSanta).toBe(true);
        });

        it('adds secret class to left-container', () => {
            expect(leftContainer.classList.contains('secret')).toBe(false);

            secretSantaMode();

            expect(leftContainer.classList.contains('secret')).toBe(true);
        });

        it('calls stepOne to initialize the flow', () => {
            expect(nameList.style.display).toBe('none');

            secretSantaMode();

            expect(nameList.style.display).toBe('block');
            expect(nextStepBtn.style.display).toBe('block');
        });

        it('does not show results-table in secret santa mode', () => {
            secretSantaMode();

            expect(resultsTable.style.display).toBe('none');
        });
    });

    describe('event listeners', () => {
        it('letsGo button has click listener attached', () => {
            expect(nameList.style.display).toBe('none');

            letsGoBtn.click();

            expect(nameList.style.display).toBe('block');
        });

        it('secretSantaBtn button has click listener attached', () => {
            expect(state.secretSanta).toBe(false);

            secretSantaBtn.click();

            expect(state.secretSanta).toBe(true);
        });

        it('nextStep button has click listener attached', () => {
            state.introIndex = 0;
            state.givers = [{name: 'Alice', recipient: ''}];

            nextStepBtn.click();

            expect(state.introIndex).toBeGreaterThan(0);
        });
    });
});
