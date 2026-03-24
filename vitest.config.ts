import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['spec/netlify-functions/mongoSetup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**', 'netlify/**'],
    },
    projects: [
      {
        test: {
          name: 'frontend',
          environment: 'jsdom',
          isolate: false,
          setupFiles: ['spec/setupTests.js'],
          include: [
            'spec/exchange/**/*.spec.js',
            'spec/authGate.spec.js',
            'spec/CookieBanner.spec.js',
            'spec/session.spec.js',
            'spec/Snackbar.spec.js',
            'spec/utils.spec.js',
            'spec/UserBadge.spec.js',
            'spec/vitePageRoutes.spec.js',
            'spec/vitePrerenderPlugin.spec.js',
          ],
        },
      },
      {
        test: {
          name: 'frontend-pages',
          environment: 'jsdom',
          include: [
            'spec/wishlistEdit/**/*.spec.js',
            'spec/dashboard/**/*.spec.js',
            'spec/wishlistView.spec.js',
            'spec/reuse.spec.js',
          ],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: [
            'spec/netlify-functions/**/*.spec.js',
            'spec/integration/**/*.spec.js',
            'spec/dev/**/*.spec.js',
          ],
        },
      },
    ],
  },
});
