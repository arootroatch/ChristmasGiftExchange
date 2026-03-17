import {resolve, join} from 'path';
import {existsSync, readdirSync, cpSync, rmSync} from 'fs';

function discoverPages(root) {
    const pagesDir = resolve(root, 'pages');
    if (!existsSync(pagesDir)) return [];
    return findIndexFiles(pagesDir, 'pages');
}

function discoverDevPages(root) {
    const devDir = resolve(root, 'dev');
    if (!existsSync(devDir)) return [];
    return findIndexFiles(devDir, 'dev');
}

function findIndexFiles(dir, prefix) {
    const results = [];
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
        const rel = prefix + '/' + entry.name;
        if (entry.isDirectory()) results.push(...findIndexFiles(join(dir, entry.name), rel));
        else if (entry.name === 'index.html') results.push(rel);
    }
    return results;
}

function toCamelCase(pagePath) {
    const segments = pagePath.replace(/^pages\//, '').replace(/\/index\.html$/, '').split('/');
    return segments.map((s, i) => i === 0 ? s : s[0].toUpperCase() + s.slice(1)).join('');
}

export function pageRoutesPlugin() {
    let pages = [];
    let root = process.cwd();
    let isServing = false;

    return {
        name: 'vite-page-routes',

        config(config) {
            root = config.root || process.cwd();
            pages = discoverPages(root);

            const input = {main: resolve(root, 'index.html')};
            for (const page of pages) {
                input[toCamelCase(page)] = resolve(root, page);
            }

            return {
                build: {
                    rollupOptions: {input},
                },
            };
        },

        configureServer(server) {
            isServing = true;
            const devPages = discoverDevPages(root);
            const allPages = [...pages, ...devPages];
            const routes = {};
            for (const page of allPages) {
                const urlPath = '/' + page.replace(/^pages\//, '').replace(/\/index\.html$/, '');
                routes[urlPath] = '/' + page;
            }

            server.middlewares.use((req, _res, next) => {
                const [pathname, query] = req.url.split('?');
                if (pathname.includes('.')) return next();

                const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
                const target = routes[cleanPath];
                if (target) {
                    req.url = target + (query ? '?' + query : '');
                }
                next();
            });
        },

        transformIndexHtml(html) {
            if (!isServing) return html;
            return html
                .replace(/<div[^>]*>Powered by Verifalia[\s\S]*?<\/div>/, '')
                .replace(/<script[^>]*verifalia-widget[\s\S]*?<\/script>/, '');
        },

        closeBundle() {
            const pagesDir = resolve(root, 'dist', 'pages');
            if (!existsSync(pagesDir)) return;

            const entries = readdirSync(pagesDir, {withFileTypes: true});
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    cpSync(resolve(pagesDir, entry.name), resolve(root, 'dist', entry.name), {recursive: true});
                }
            }
            rmSync(pagesDir, {recursive: true});
        },
    };
}
