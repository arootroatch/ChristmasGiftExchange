import {defineConfig} from 'vite';
import {resolve} from 'path';
import {netlifyRedirectsPlugin} from './src/viteNetlifyRedirects.js';

export default defineConfig({
    appType: 'mpa',
    plugins: [netlifyRedirectsPlugin()],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                wishlistEdit: resolve(__dirname, 'pages/wishlist/edit/index.html'),
                wishlistView: resolve(__dirname, 'pages/wishlist/view/index.html'),
                reuse: resolve(__dirname, 'pages/reuse/index.html'),
            },
        },
    },
});
