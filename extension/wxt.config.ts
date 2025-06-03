import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: (env) => ({
    plugins: [
      tailwindcss(),
      TanStackRouterVite({
        generatedRouteTree: './entrypoints/sidepanel/routeTree.gen.ts',
        routesDirectory: './entrypoints/sidepanel/routes',
      }),
    ],
  }),
  manifestVersion: 3,
  manifest: {
    permissions: [
      'storage',
      'unlimitedStorage',
      'tabs',
      'sidePanel',
      'webNavigation',
      'scripting',
      'offscreen',
      'activeTab',
      'scripting'
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; style-src 'self' 'unsafe-inline' https: http:; font-src 'self' https: data:; connect-src 'self' data: ws: wss: http: https:; img-src 'self' data: https: http:;",
    },
    action: {
      default_title: 'Open Side Panel',
      default_icon: {
        '16': 'icon/16.png',
        '24': 'icon/48.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    web_accessible_resources: [
      {
        resources: ['pageBridge.js'],
        matches: ['*://*/*'],
      },
    ],
  },
  runner: {
    openConsole: true,
    openDevtools: true,
    startUrls: ['https://my-react-app.alexmnahas.workers.dev'],
  },
});
