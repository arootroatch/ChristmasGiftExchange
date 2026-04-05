import fs from 'fs';
import path from 'path';

const indexPath = path.resolve(__dirname, '../../index.html');
export const indexHtml = fs.readFileSync(indexPath, 'utf8');

if (typeof document !== 'undefined') {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(indexHtml, {
        url: 'http://localhost',
    });

    globalThis.document = dom.window.document;
    globalThis.window = dom.window;
    globalThis.navigator = dom.window.navigator;
    dom.window.Element.prototype.scrollIntoView = function () {};
    dom.window.scrollTo = function () {};
}
