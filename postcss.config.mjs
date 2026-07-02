/**
 * postcss.config.mjs
 * ------------------
 * Purpose: PostCSS pipeline — Tailwind CSS + autoprefixer.
 * Depends on: tailwind.config.ts.
 * Security notes: none (build-time only).
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
