import {defineConfig} from 'vite';
import {resolve} from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                wishlistEdit: resolve(__dirname, 'wishlist/edit/index.html'),
                wishlistView: resolve(__dirname, 'wishlist/view/index.html'),
                reuse: resolve(__dirname, 'reuse/index.html'),
            },
        },
    },
});
