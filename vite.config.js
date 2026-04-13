import {defineConfig} from 'vite';
import {pageRoutesPlugin} from './src/vitePageRoutes.js';
import {prerenderPlugin, cssModuleClassMap} from './src/vitePrerenderPlugin.js';

export default defineConfig({
    appType: 'mpa',
    css: {
        modules: {
            getJSON(cssFileName, json) {
                cssModuleClassMap.set(cssFileName, json);
            },
        },
    },
    plugins: [prerenderPlugin(), pageRoutesPlugin()],
});
