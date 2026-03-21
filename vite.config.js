import {defineConfig} from 'vite';
import {pageRoutesPlugin} from './src/vitePageRoutes.js';
import {prerenderPlugin} from './src/vitePrerenderPlugin.js';

export default defineConfig({
    appType: 'mpa',
    plugins: [prerenderPlugin(), pageRoutesPlugin()],
});
