import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * Vite plugin that guarantees the Google Analytics gtag snippet appears
 * in the raw HTML <head>.  This runs during both `vite dev` and
 * `vite build`, so even if the index.html template is auto-generated
 * by the build system, the tag will still be injected.
 */
function googleAnalyticsPlugin(): Plugin {
  const GA_ID = 'G-2YQ6PWVDT7'
  return {
    name: 'inject-google-analytics',
    transformIndexHtml(html) {
      // If the tag is already present (e.g. from our index.html), skip.
      if (html.includes(GA_ID)) return html

      const snippet = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    </script>`

      // Inject right after <head> (or after the first <meta> tag)
      return html.replace('</head>', `${snippet}\n  </head>`)
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    googleAnalyticsPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Alias /utils so absolute imports resolve correctly
      '/utils': path.resolve(__dirname, './utils'),
      // Resolve Figma assets to local src/assets folder
      'figma:asset': path.resolve(__dirname, './src/assets'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})