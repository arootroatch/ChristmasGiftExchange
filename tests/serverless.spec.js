// @vitest-environment jsdom

import {expect, test, vi} from 'vitest'
import {submitEmails, postToServer} from '/resources/js/serverless.js'
import {JSDOM} from "jsdom";

global.fetch = vi.fn(() => Promise.resolve({json: () => Promise.resolve({})}));

const clickEvent = new CustomEvent('myCustomEvent', {
    detail: {
        message: 'Hello from custom event',
        targetElement: document.getElementById('emailTableBody') // Set your desired target element here
    },
    bubbles: true, // Allows the event to bubble up the DOM tree
    cancelable: true // Allows the event to be canceled
});

test('submitEmails', () => {
    vi.mock(import("/resources/js/serverless.js"), async (importOriginal) => {
        const actual = await importOriginal()
        return {
            ...actual,
            postToServer: vi.fn(() => 'Mocked result'),
        }
    })

    const result = submitEmails(clickEvent);
})