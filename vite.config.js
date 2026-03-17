import {defineConfig} from 'vite';
import {pageRoutesPlugin} from './src/vitePageRoutes.js';

export default defineConfig({
    appType: 'mpa',
    plugins: [pageRoutesPlugin()],
});
