// Vite plugin that reads [[redirects]] from netlify.toml and applies them as
// dev server middleware. This keeps netlify.toml as the single source of truth
// for URL rewrites in both development and production.
//
// Why this is needed:
// In production, Netlify's CDN applies [[redirects]] natively. In development,
// `netlify dev` proxies requests to Vite, but has a bug where conditional
// requests (If-None-Match) through redirects return empty 200 responses instead
// of proper 304s — causing blank pages on repeat visits. By applying the
// rewrites inside Vite's middleware pipeline, the 304 handling works correctly
// because Vite sees the final file path directly.

import {readFileSync} from 'fs';
import {resolve} from 'path';

function parseRedirects(tomlPath) {
    const content = readFileSync(tomlPath, 'utf-8');
    const rewrites = [];
    const redirectBlocks = content.split('[[redirects]]').slice(1);

    for (const block of redirectBlocks) {
        const fromMatch = block.match(/from\s*=\s*"([^"]+)"/);
        const toMatch = block.match(/to\s*=\s*"([^"]+)"/);
        const statusMatch = block.match(/status\s*=\s*(\d+)/);

        if (!fromMatch || !toMatch) continue;
        if (statusMatch && statusMatch[1] !== '200') continue;

        const from = fromMatch[1];
        const to = toMatch[1];

        if (from.endsWith('/*')) {
            const prefix = from.slice(0, -1);
            rewrites.push({match: (url) => url.startsWith(prefix), target: to});
        } else {
            rewrites.push({match: (url) => url === from || url === from + '/', target: to});
        }
    }
    return rewrites;
}

export function netlifyRedirectsPlugin() {
    return {
        name: 'vite-netlify-redirects',
        configureServer(server) {
            const tomlPath = resolve(server.config.root, 'netlify.toml');
            const rewrites = parseRedirects(tomlPath);

            server.middlewares.use((req, _res, next) => {
                const url = req.url.split('?')[0];
                if (url.includes('.')) return next();

                for (const {match, target} of rewrites) {
                    if (match(url)) {
                        req.url = target + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
                        break;
                    }
                }
                next();
            });
        },
    };
}
