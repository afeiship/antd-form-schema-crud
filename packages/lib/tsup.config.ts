import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';
import lightningCssPlugin from '@jswork/tsup-plugin-lightningcss';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  cjsInterop: true, // keeps `export =` in index.d.ts for CJS consumers
  // antd and the schema renderer stay external: bundling them would duplicate
  // React context providers and break ConfigProvider / theme inheritance.
  external: ['react', 'react-dom', 'antd', '@jswork/antd-form-schema', 'classnames'],

  // react
  sourcemap: true,
  target: 'es6',
  bundle: true,
  define: { __VERSION__: JSON.stringify(pkg.version) },
  footer: ({ format }) =>
    format === 'cjs' ? { js: 'module.exports = module.exports.default;' } : {},
  esbuildPlugins: [
    // CSS compiled with Lightning CSS in the same build (minify + targets + nesting)
    lightningCssPlugin({
      entry: 'src/style.css',
      outFile: 'style.css',
    }),
  ],
  loader: {
    '.svg': 'dataurl',
  },
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
