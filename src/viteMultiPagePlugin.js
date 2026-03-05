const rewrites = [
    {match: /^\/reuse(\/|$)/, target: '/pages/reuse/index.html'},
    {match: /^\/wishlist\/edit(\/|$)/, target: '/pages/wishlist/edit/index.html'},
    {match: /^\/wishlist\/view(\/|$)/, target: '/pages/wishlist/view/index.html'},
];

export function multiPagePlugin() {
    return {
        name: 'multi-page-rewrite',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url.split('?')[0];
                if (!url.includes('.')) {
                    for (const {match, target} of rewrites) {
                        if (match.test(url)) {
                            req.url = target;
                            break;
                        }
                    }
                }
                next();
            });
        },
    };
}
