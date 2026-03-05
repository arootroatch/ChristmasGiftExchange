import {defineConfig} from 'vite';
import {resolve} from 'path';
import {multiPagePlugin} from './src/viteMultiPagePlugin.js';

export default defineConfig({
    plugins: [multiPagePlugin()],
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
